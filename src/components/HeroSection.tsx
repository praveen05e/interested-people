import type { RegistrationStatus, UserProfile } from '../types'
import InterestButton from './InterestButton'

interface HeroSectionProps {
  status: RegistrationStatus
  user: UserProfile | null
  onInterestClick: () => void
  onRetry: () => void
  errorMessage: string
}

export default function HeroSection({
  status,
  user,
  onInterestClick,
  onRetry,
  errorMessage,
}: HeroSectionProps) {
  const isConfirmed = status === 'success' || status === 'already_registered'

  return (
    <main className="hero">
      <div className="hero__overlay" />

      <div className="hero__content">
        {/* Wordmark & Brand Logo */}
        <div className="hero__brand">
          <img src="/logo.png" alt="ZTOI TECH Logo" className="hero__logo" />
          <span className="logo-text">ZTOI TECH</span>
        </div>

        {/* Eyebrow */}
        <p className="hero__eyebrow">Coming Soon</p>

        {/* Headline — changes on success */}
        <h1 className="hero__headline">
          {isConfirmed ? (
            status === 'success' ? <>You're on<br />the list.</> : <>Already<br />registered.</>
          ) : (
            <>Something New<br />Is Coming.</>
          )}
        </h1>

        {/* Supporting text */}
        <p className="hero__subtext">
          {status === 'success'
            ? "Thank you for your interest. We'll keep you updated when there's something new to share."
            : status === 'already_registered'
            ? "You're already on our list. We'll reach out when it's ready."
            : "We're exploring something new. Be among the first to know when it arrives."}
        </p>

        {/* Single-Click Interest Button — zero manual typing */}
        {!isConfirmed && (
          <div className="hero__cta">
            <InterestButton status={status} onClick={onInterestClick} />

            {status === 'error' && (
              <div className="hero__error">
                <p className="hero__error-text">{errorMessage || 'Something went wrong.'}</p>
                <button className="hero__retry-btn" onClick={onRetry}>
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tick icon on success */}
        {isConfirmed && (
          <div className="hero__success-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 24.5L20.5 31L34 17" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Subtle user hint while submitting */}
        {user && !isConfirmed && (
          <p className="hero__user-hint">
            Signed in as <span>{user.email}</span>
          </p>
        )}
      </div>
    </main>
  )
}
