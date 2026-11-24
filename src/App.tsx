import { useEffect, useState, useCallback, useRef } from 'react'
import {
  loadGoogleIdentityServices,
  signInWithGoogle,
  submitToSheet,
} from './services/registration'
import type { RegistrationStatus, UserProfile } from './types'
import HeroSection from './components/HeroSection'
import PrivacyNotice from './components/PrivacyNotice'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<RegistrationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const isProcessingRef = useRef(false)
  const gisReadyRef = useRef(false)

  // Preload Google Identity Services on mount
  useEffect(() => {
    loadGoogleIdentityServices()
      .then(() => { gisReadyRef.current = true })
      .catch(() => { /* Will retry on click */ })
  }, [])

  const doRegistration = useCallback(async (profile: UserProfile) => {
    setStatus('submitting')
    try {
      const result = await submitToSheet(profile, APPS_SCRIPT_URL)
      if (result.status === 'success') {
        setStatus('success')
      } else if (result.status === 'already_registered') {
        setStatus('already_registered')
      } else {
        setStatus('error')
        setErrorMessage(result.message)
      }
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      isProcessingRef.current = false
    }
  }, [])

  const handleInterestClick = useCallback(async () => {
    if (isProcessingRef.current) return
    if (status === 'success' || status === 'already_registered') return
    isProcessingRef.current = true
    setErrorMessage('')

    // If already signed in, go straight to submit
    if (user) {
      await doRegistration(user)
      return
    }

    setStatus('authenticating')

    // Ensure GIS is loaded
    if (!gisReadyRef.current) {
      try {
        await loadGoogleIdentityServices()
        gisReadyRef.current = true
      } catch {
        setStatus('error')
        setErrorMessage('Could not load Google Sign-In. Please refresh and try again.')
        isProcessingRef.current = false
        return
      }
    }

    // Show Google account chooser prompt
    try {
      const profile = await signInWithGoogle(GOOGLE_CLIENT_ID)

      if (!profile) {
        // User closed the popup or cancelled
        setStatus('idle')
        isProcessingRef.current = false
        return
      }

      setUser(profile)
      await doRegistration(profile)
    } catch {
      setStatus('error')
      setErrorMessage('Google sign-in could not be completed. Please try again.')
      isProcessingRef.current = false
    }
  }, [user, status, doRegistration])

  const handleManualEmailSubmit = useCallback(async (email: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setErrorMessage('')

    const profile: UserProfile = {
      id: 'email_' + Date.now(),
      email: email.trim(),
      full_name: email.split('@')[0],
    }

    setUser(profile)
    await doRegistration(profile)
  }, [doRegistration])

  const handleRetry = useCallback(() => {
    setStatus('idle')
    setErrorMessage('')
    isProcessingRef.current = false
  }, [])

  return (
    <div className="app">
      <HeroSection
        status={status}
        user={user}
        onInterestClick={handleInterestClick}
        onManualEmailSubmit={handleManualEmailSubmit}
        onRetry={handleRetry}
        errorMessage={errorMessage}
      />
      <PrivacyNotice />
    </div>
  )
}
