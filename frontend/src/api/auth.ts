import request from '@/utils/request'
import type { 
  LoginRequest, 
  LoginResponse, 
  UserInfo, 
  Menu,
  ApiResponse 
} from '@/types'

// 登录
export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return request.post('/auth/login', data)
}

// 登出
export const logout = (): Promise<void> => {
  return request.post('/auth/logout')
}

// 获取用户信息
export const getUserInfo = (): Promise<UserInfo> => {
  return request.get('/auth/info')
}

// 获取用户菜单
export const getUserMenus = (): Promise<Menu[]> => {
  return request.get('/auth/menus')
}

// 刷新token
export const refreshToken = (refreshToken: string): Promise<LoginResponse> => {
  return request.post('/auth/refresh', { refresh_token: refreshToken })
}

export interface RegisterData {
  username: string
  password: string
  nickname?: string
  email?: string
  phone?: string
  captcha?: string
  captcha_session_id?: string
}

export const register = (data: RegisterData) => {
  return request.post('/auth/register', data)
}

export const checkRegisterEnabled = () => {
  return request.get('/system/public')
}
