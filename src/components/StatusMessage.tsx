import type { RegistrationStatus } from '../types'

interface StatusMessageProps {
  status: RegistrationStatus
}

export default function StatusMessage({ status }: StatusMessageProps) {
  if (status !== 'success' && status !== 'already_registered') return null

  return (
    <div className="status-banner" role="status" aria-live="polite">
      {status === 'success' ? (
        <p>✓ Your interest has been registered successfully.</p>
      ) : (
        <p>✓ Your email is already on our list.</p>
      )}
    </div>
  )
}
