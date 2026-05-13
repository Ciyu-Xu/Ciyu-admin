import request from '@/utils/request'
import type { ApiResponse } from '@/types'

export interface ProfileFormData {
  nickname: string
  email: string
  phone: string
  avatar?: string
}

export interface PasswordFormData {
  oldPassword: string
  newPassword: string
}

export const getUserProfile = () => {
  return request.get<ApiResponse<any>>('/auth/info')
}

export const updateProfile = (data: ProfileFormData) => {
  return request.put<ApiResponse<any>>('/auth/profile', data)
}

export const updatePassword = (data: PasswordFormData) => {
  return request.put<ApiResponse<any>>('/auth/password', data)
}
