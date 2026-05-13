import request from '@/utils/request'

export interface SSOProvider {
  name: string
  label: string
  icon: string
}

export interface SSOConfig {
  id: number
  key: string
  value: string
  description: string
}

export const getSSOProviders = (): Promise<SSOProvider[]> => {
  return request.get('/sso/providers')
}

export const getSSOLoginUrl = (provider: string): Promise<{ authorize_url: string; state: string }> => {
  return request.get(`/sso/login/${provider}`)
}

export const getSSOConfigs = (): Promise<SSOConfig[]> => {
  return request.get('/sso/configs')
}

export const updateSSOConfig = (id: number, value: string) => {
  return request.put(`/sso/config/${id}`, { value })
}
