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
        return "I'm Interested"
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
      {isLoading && (
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
      )}
      <span className="interest-btn__label">{getLabel()}</span>
    </button>
  )
}
