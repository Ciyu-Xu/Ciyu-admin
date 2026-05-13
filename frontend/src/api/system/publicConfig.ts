import request from '@/utils/request'

export interface PublicConfig {
  'sys.index.sitename': string
  'sys.index.logo': string
  'sys.index.copyright': string
  'sys.account.captchaEnabled': string
  'sys.account.rememberMe': string
  'sys.account.registerEnabled': string
  'sys.expire.time': string
}

export const getPublicConfig = () => {
  return request.get<ApiResponse<PublicConfig>>('/system/public')
}

export const isCaptchaEnabled = () => {
  return request.get<ApiResponse<{ enabled: boolean }>>('/system/captcha-enabled')
}
