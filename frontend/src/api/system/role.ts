import request from '@/utils/request'
import type { ApiResponse, PageResponse } from '@/types'

export interface RoleItem {
  id: number
  role_name: string
  role_key: string
  sort_order: number
  status: number
  data_scope: string
  create_time?: string
}

export interface RoleDetail extends RoleItem {
  menu_ids: number[]
}

export interface RoleFormData {
  id?: number
  role_name: string
  role_key: string
  sort_order: number
  status: number
  data_scope: string
  menu_ids: number[]
}

export interface MenuItem {
  id: number
  menu_name: string
  path?: string
  component?: string
  icon?: string
  parent_id: number
  sort_order: number
  menu_type?: string
  permission?: string
  children?: MenuItem[]
}

export const getRoleList = (params: {
  role_name?: string
  role_key?: string
  status?: number
  page?: number
  page_size?: number
}) => {
  return request.get<ApiResponse<PageResponse<RoleItem>>>('/system/role', { params })
}

export const getRoleDetail = (id: number) => {
  return request.get<ApiResponse<RoleDetail>>(`/system/role/${id}`)
}

export const createRole = (data: RoleFormData) => {
  return request.post<ApiResponse<{ id: number }>>('/system/role', data)
}

export const updateRole = (id: number, data: RoleFormData) => {
  return request.put<ApiResponse<{ id: number }>>(`/system/role/${id}`, data)
}

export const deleteRole = (id: number) => {
  return request.delete<ApiResponse<void>>(`/system/role/${id}`)
}

export const changeRoleStatus = (id: number, status: number) => {
  return request.put<ApiResponse<void>>(`/system/role/${id}/status`, { status })
}

export const getAllMenus = () => {
  return request.get<ApiResponse<MenuItem[]>>('/system/role/all/menu')
}
