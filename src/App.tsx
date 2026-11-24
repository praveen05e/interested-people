import { useEffect, useState, useCallback, useRef } from 'react'
import {
  initGoogleAuth,
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

  // Pre-initialize Google authentication on mount
  useEffect(() => {
    initGoogleAuth(GOOGLE_CLIENT_ID, (profile: UserProfile) => {
      // 1-touch auto registration via Google One-Tap
      if (!isProcessingRef.current && status !== 'success' && status !== 'already_registered') {
        isProcessingRef.current = true
        setUser(profile)
        doRegistration(profile)
      }
    })
  }, [status, doRegistration])

  // Single-touch click on "I'm Interested"
  const handleInterestClick = useCallback(async () => {
    if (isProcessingRef.current) return
    if (status === 'success' || status === 'already_registered') return
    isProcessingRef.current = true
    setErrorMessage('')

    if (user) {
      await doRegistration(user)
      return
    }

    setStatus('authenticating')

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
        onRetry={handleRetry}
        errorMessage={errorMessage}
      />
      <PrivacyNotice />
    </div>
  )
}
