import request from '@/utils/request'
import type { ApiResponse } from '@/types'

export interface MenuItem {
  id: number
  menu_name: string
  path?: string
  component?: string
  icon?: string
  parent_id: number
  sort_order: number
  menu_type: string
  permission?: string
  status: number
  visible: number
  is_frame: number
  is_cache: number
  children?: MenuItem[]
}

export interface MenuFormData {
  menu_name: string
  path?: string
  component?: string
  icon?: string
  parent_id?: number
  sort_order?: number
  menu_type?: string
  permission?: string
  status?: number
  visible?: number
  is_frame?: number
  is_cache?: number
}

export const getMenuList = (params?: {
  menu_name?: string
  status?: number
}): Promise<MenuItem[]> => {
  return request.get('/system/menu', { params })
}

export const getMenuDetail = (menuId: number): Promise<MenuItem> => {
  return request.get(`/system/menu/${menuId}`)
}

export const createMenu = (data: MenuFormData): Promise<ApiResponse> => {
  return request.post('/system/menu', data)
}

export const updateMenu = (menuId: number, data: MenuFormData): Promise<ApiResponse> => {
  return request.put(`/system/menu/${menuId}`, data)
}

export const deleteMenu = (menuId: number): Promise<ApiResponse> => {
  return request.delete(`/system/menu/${menuId}`)
}