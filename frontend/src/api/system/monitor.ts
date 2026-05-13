import request from '@/utils/request'

export interface OnlineUser {
  id: number
  user_id: number
  username: string
  ip_address: string
  login_time: string
  last_active_time: string
  user_agent: string
  session_id: string
}

export interface OnlineUserListResponse {
  rows: OnlineUser[]
  total: number
  page: number
  page_size: number
}

export interface SystemStatus {
  cpu: {
    usage: number
    count: number
    frequency: number
  }
  memory: {
    total: number
    available: number
    used: number
    percent: number
  }
  disk: {
    total: number
    used: number
    free: number
    percent: number
  }
  network: {
    bytes_sent: number
    bytes_recv: number
  }
  platform: {
    system: string
    release: string
    version: string
    machine: string
  }
  timestamp: string
}

export interface ServerInfo {
  boot_time: string
  uptime_seconds: number
  uptime_formatted: string
  cpu_count: {
    physical: number
    logical: number
  }
  memory_total: number
  disk_total: number
}

export interface PaginationParams {
  page?: number
  page_size?: number
}

export const getOnlineUsers = (params?: PaginationParams) => {
  return request.get<any>('/system/monitor/online', { params })
}

export const forceLogout = (session_id: string) => {
  return request.delete<any>(`/system/monitor/online/${session_id}`)
}

export const forceLogoutAll = () => {
  return request.post<any>('/system/monitor/online/force-logout-all')
}

export const cleanupSessions = (minutes: number = 30) => {
  return request.post<any>(`/system/monitor/online/cleanup?minutes=${minutes}`)
}

export const updateHeartbeat = () => {
  return request.post<any>('/system/monitor/online/heartbeat')
}

export const getSystemStatus = () => {
  return request.get<any>('/system/monitor/status')
}

export const getServerInfo = () => {
  return request.get<any>('/system/monitor/server/info')
}

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
