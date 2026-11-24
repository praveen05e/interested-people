import type { RegistrationStatus } from '../types'

interface InterestButtonProps {
  status: RegistrationStatus
  onClick: () => void
}

const LOADING_STATES: RegistrationStatus[] = ['authenticating', 'submitting']

export default function InterestButton({ status, onClick }: InterestButtonProps) {
  const isLoading = LOADING_STATES.includes(status)
  const isDisabled = isLoading

  const getLabel = () => {
    switch (status) {
      case 'authenticating':
        return 'Signing in…'
      case 'submitting':
        return 'Registering…'
      default:
        return 'Register with Mail'
    }
  }

  return (
    <button
      className={`interest-btn ${isLoading ? 'interest-btn--loading' : ''}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-label={getLabel()}
    >
      {isLoading ? (
        <span className="interest-btn__spinner" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle
              cx="9" cy="9" r="7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="32"
              strokeDashoffset="32"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 9 9"
                to="360 9 9"
                dur="0.9s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </span>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )}
      <span className="interest-btn__label">{getLabel()}</span>
    </button>
  )
}
