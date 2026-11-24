export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  country?: string
}

export type RegistrationStatus =
  | 'idle'
  | 'authenticating'
  | 'submitting'
  | 'success'
  | 'already_registered'
  | 'cancelled'
  | 'error'

export interface RegistrationResult {
  status: 'success' | 'already_registered' | 'error'
  message: string
}
