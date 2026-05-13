import request from '@/utils/request'

export interface SystemConfig {
  id: number
  config_name: string
  config_key: string
  config_value: string
  config_type: 'string' | 'number' | 'boolean' | 'json'
  remark?: string
  is_system: number
  create_time?: string
}

export interface ConfigListParams {
  config_name?: string
  config_key?: string
  config_type?: string
  page?: number
  page_size?: number
}

export interface ConfigListResponse {
  rows: SystemConfig[]
  total: number
  page: number
  page_size: number
}

export const getConfigList = (params: ConfigListParams) => {
  return request.get<ApiResponse<ConfigListResponse>>('/system/config/list', { params })
}

export const getConfig = (id: number) => {
  return request.get<ApiResponse<SystemConfig>>(`/system/config/${id}`)
}

export const createConfig = (data: Partial<SystemConfig>) => {
  return request.post<ApiResponse<any>>('/system/config', data)
}

export const updateConfig = (id: number, data: Partial<SystemConfig>) => {
  return request.put<ApiResponse<any>>(`/system/config/${id}`, data)
}

export const deleteConfig = (id: number) => {
  return request.delete<ApiResponse<any>>(`/system/config/${id}`)
}

export const getConfigByKey = (configKey: string) => {
  return request.get<ApiResponse<{ config_key: string; config_value: string; config_type: string }>>(`/system/config/keys/${configKey}`)
}

export const getConfigsBatch = (configKeys: string) => {
  return request.get<ApiResponse<Record<string, string>>>(`/system/config/batch/${configKeys}`)
}

export const refreshConfigCache = () => {
  return request.post<ApiResponse<any>>('/system/config/refresh')
}
