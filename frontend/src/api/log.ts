import request from '@/utils/request'

export interface OperationLog {
  id: number
  oper_name: string
  oper_type: string
  oper_desc: string
  request_method: string
  request_url: string
  request_params: string | null
  response_data: string | null
  status: number
  error_msg: string | null
  ip_address: string | null
  user_agent: string | null
  user_id: number | null
  execution_time: number | null
  create_time: string
}

export interface LoginLog {
  id: number
  username: string
  ip_address: string | null
  login_location: string | null
  browser: string | null
  os: string | null
  status: number
  msg: string | null
  user_id: number | null
  create_time: string
}

export interface LogListResponse {
  rows: any[]
  total: number
  page: number
  page_size: number
}

// 操作日志
export const getOperationLogs = (params?: {
  oper_name?: string
  oper_type?: string
  status?: number
  begin_time?: string
  end_time?: string
  page?: number
  page_size?: number
}): Promise<LogListResponse> => {
  return request.get('/system/operlog', { params })
}

export const getOperationLog = (id: number): Promise<OperationLog> => {
  return request.get(`/system/operlog/${id}`)
}

export const deleteOperationLog = (id: number): Promise<void> => {
  return request.delete(`/system/operlog/${id}`)
}

export const batchDeleteOperationLogs = (ids: number[]): Promise<void> => {
  return request.delete('/system/operlog', { data: ids })
}

// 登录日志
export const getLoginLogs = (params?: {
  username?: string
  status?: number
  begin_time?: string
  end_time?: string
  page?: number
  page_size?: number
}): Promise<LogListResponse> => {
  return request.get('/system/loginlog', { params })
}

export const deleteLoginLog = (id: number): Promise<void> => {
  return request.delete(`/system/loginlog/${id}`)
}

export const batchDeleteLoginLogs = (ids: number[]): Promise<void> => {
  return request.delete('/system/loginlog', { data: ids })
}