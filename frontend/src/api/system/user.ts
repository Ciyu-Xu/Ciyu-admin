import request from '@/utils/request'
import type { ApiResponse, PageResponse } from '@/types'

export interface RoleItem {
  id: number
  role_name: string
}

export interface UserItem {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status: number
  dept_id?: number
  create_time?: string
  update_time?: string
  roles?: RoleItem[]
  role_ids?: number[]
}

export interface UserSearchParams {
  username?: string
  nickname?: string
  phone?: string
  status?: number
  dept_id?: number
  page?: number
  page_size?: number
}

export const getUserList = (params: UserSearchParams) => {
  return request.get<ApiResponse<PageResponse<UserItem>>>('/system/user', { params })
}

export const getUserDetail = (id: number) => {
  return request.get<ApiResponse<UserItem>>(`/system/user/${id}`)
}

export const createUser = (data: Partial<UserItem> & { role_ids?: number[] }) => {
  return request.post<ApiResponse<UserItem>>('/system/user', data)
}

export const updateUser = (id: number, data: Partial<UserItem> & { role_ids?: number[] }) => {
  return request.put<ApiResponse<UserItem>>(`/system/user/${id}`, data)
}

export const deleteUser = (id: number) => {
  return request.delete<ApiResponse<void>>(`/system/user/${id}`)
}

export const batchDeleteUsers = (ids: number[]) => {
  return request.delete<ApiResponse<void>>('/system/user/batch', { data: { ids } })
}

export const resetUserPassword = (id: number) => {
  return request.post<ApiResponse<void>>(`/system/user/${id}/reset-password`)
}

export const changeUserStatus = (id: number, status: number) => {
  return request.put<ApiResponse<void>>(`/system/user/${id}/status`, { status })
}
