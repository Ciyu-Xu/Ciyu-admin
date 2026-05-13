import request from '@/utils/request'

export interface CaptchaResponse {
  session_id: string
  image: string
}

export const getCaptcha = () => {
  return request.get<ApiResponse<CaptchaResponse>>('/system/captcha')
}

export const verifyCaptcha = (session_id: string, captcha: string) => {
  return request.post<ApiResponse<{ valid: boolean }>>('/system/verify', {
    session_id,
    captcha
  })
}
