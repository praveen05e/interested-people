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
            requestAccessToken: () => void
          }
        }
      }
    }
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

// ── Sign in with Google (OAuth2 Token Client popup) ───────────
export function signInWithGoogle(clientId: string): Promise<UserProfile | null> {
  return new Promise((resolve) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        console.error('Google OAuth2 SDK not loaded')
        resolve(null)
        return
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

      // If user closes the popup without completing, Google does not fire error_callback.
      // Listening for window regain focus allows us to detect when the popup was dismissed.
      const onWindowFocus = () => {
        setTimeout(() => {
          if (!resolved) {
            safeResolve(null)
          }
        }, 1200)
      }
      window.addEventListener('focus', onWindowFocus, { once: true })

      // Safety fallback: if no interaction after 45 seconds, reset state
      const timeoutId = setTimeout(() => {
        safeResolve(null)
      }, 45000)

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (!tokenResponse.access_token || tokenResponse.error) {
            console.warn('Google sign-in cancelled or failed:', tokenResponse.error)
            safeResolve(null)
            return
          }

          try {
            // Fetch verified user profile with access token
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
        error_callback: (err) => {
          console.error('OAuth token client error:', err)
          safeResolve(null)
        },
      })

      // Trigger the Google Account chooser popup
      client.requestAccessToken()
    } catch (err) {
      console.error('signInWithGoogle unexpected error:', err)
      resolve(null)
    }
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

  // Ensure country is resolved
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
