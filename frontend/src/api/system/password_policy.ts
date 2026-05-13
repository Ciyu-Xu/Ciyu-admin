import request from '@/utils/request'

export interface PasswordPolicy {
  min_length: number
  max_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_digit: boolean
  require_special: boolean
  history_count: number
  expiration_days: number
  same_as_username: boolean
}

export interface ValidateResult {
  valid: boolean
  error: string
  strength: string
}

export const getPasswordPolicy = () => {
  return request.get<PasswordPolicy>('/system/password-policy')
}

export const updatePasswordPolicy = (data: PasswordPolicy) => {
  return request.put('/system/password-policy', data)
}

export const validatePassword = (password: string) => {
  return request.post<ValidateResult>('/system/validate-password', null, {
    params: { password }
  })
}
