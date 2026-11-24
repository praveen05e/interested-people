import type { UserProfile, RegistrationResult } from '../types'
import { detectCountry } from './country'

// ── Google Identity Services types ──────────────────────────
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: any) => void
        }
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
            error_callback?: (err: any) => void
          }) => {
            requestAccessToken: (overrideConfig?: any) => void
          }
        }
      }
    }
  }
}

function decodeJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.error('Failed to decode JWT:', e)
    return {}
  }
}

// ── Load Google Identity Services script ─────────────────────
let gisLoaded = false
export function loadGoogleIdentityServices(): Promise<void> {
  if (gisLoaded || (window.google?.accounts?.oauth2 && window.google?.accounts?.id)) {
    gisLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      gisLoaded = true
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => { gisLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}


/**
 * Pre-initialize Google One-Tap and OAuth token client on page load
 * so button clicks are 100% synchronous (never blocked by popup blockers).
 */
export function initGoogleAuth(
  clientId: string,
  onAutoSignedIn: (profile: UserProfile) => void
) {
  loadGoogleIdentityServices().then(() => {
    if (!window.google?.accounts) return

    // 1. Initialize Google One-Tap (instant 1-touch for visitors already signed into Google)
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) return
          const payload = decodeJwt(response.credential)
          const country = await detectCountry()
          const profile: UserProfile = {
            id: payload.sub,
            email: payload.email,
            full_name: payload.name || payload.email.split('@')[0],
            avatar_url: payload.picture,
            country,
          }
          onAutoSignedIn(profile)
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      // Prompt One-Tap non-intrusively in corner
      window.google.accounts.id.prompt()
    } catch (e) {
      console.warn('One-Tap init warning:', e)
    }

  }).catch((err) => {
    console.error('Failed to initialize Google auth:', err)
  })
}

/**
 * Triggered when visitor clicks "I'm Interested".
 * Automatically pops open the Google Account Chooser, extracts name & email,
 * detects country, and returns profile.
 */
export function signInWithGoogle(clientId: string): Promise<UserProfile | null> {
  return new Promise((resolve) => {
    (async () => {
      try {
        if (!gisLoaded || !window.google?.accounts) {
          await loadGoogleIdentityServices()
        }

        let resolved = false
        const safeResolve = (val: UserProfile | null) => {
          if (!resolved) {
            resolved = true
            window.removeEventListener('focus', onWindowFocus)
            clearTimeout(timeoutId)
            resolve(val)
          }
        }

        // If user dismisses or closes popup, reset gracefully
        const onWindowFocus = () => {
          setTimeout(() => {
            if (!resolved) {
              safeResolve(null)
            }
          }, 1500)
        }
        window.addEventListener('focus', onWindowFocus, { once: true })

        const timeoutId = setTimeout(() => {
          safeResolve(null)
        }, 60000)

        // Use pre-initialized client or create one on the fly
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (!tokenResponse?.access_token || tokenResponse.error) {
              safeResolve(null)
              return
            }

            try {
              // Fetch verified user profile directly with access token
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              })

              if (!res.ok) {
                safeResolve(null)
                return
              }

              const data = await res.json()
              const country = await detectCountry()

              const profile: UserProfile = {
                id: data.sub,
                email: data.email,
                full_name: data.name || data.email.split('@')[0],
                avatar_url: data.picture,
                country,
              }
              safeResolve(profile)
            } catch (err) {
              console.error('Failed to fetch user profile:', err)
              safeResolve(null)
            }
          },
          error_callback: () => {
            safeResolve(null)
          },
        })

        // Prompt account selection
        client.requestAccessToken({ prompt: 'select_account' })
      } catch (err) {
        console.error('signInWithGoogle unexpected error:', err)
        resolve(null)
      }
    })()
  })
}

// ── Submit registration to Google Apps Script ─────────────────
export async function submitToSheet(
  user: UserProfile,
  appsScriptUrl: string,
): Promise<RegistrationResult> {
  const registeredAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const country = user.country || (await detectCountry())

  const payload = {
    fullName: user.full_name,
    email: user.email.toLowerCase().trim(),
    country,
    registeredAt,
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.status === 'already_registered') {
      return { status: 'already_registered', message: "You're already registered!" }
    }

    if (data.status === 'success') {
      return { status: 'success', message: "You're on the list!" }
    }

    return { status: 'error', message: data.message || 'Registration failed. Please try again.' }
  } catch (err) {
    console.error('Submission error:', err)
    return { status: 'error', message: 'Could not connect to Google Sheet. Please try again.' }
  }
}
