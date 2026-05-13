import request from '@/utils/request'
import type { 
  User, 
  UserQuery, 
  PageResponse,
  ApiResponse 
} from '@/types'

// 获取用户列表
export const getUserList = (params: UserQuery): Promise<PageResponse<User>> => {
  return request.get('/users', { params })
}

// 获取用户详情
export const getUserDetail = (id: number): Promise<User> => {
  return request.get(`/users/${id}`)
}

// 创建用户
export const createUser = (data: Partial<User>): Promise<{ id: number }> => {
  return request.post('/users', data)
}

// 更新用户
export const updateUser = (id: number, data: Partial<User>): Promise<void> => {
  return request.put(`/users/${id}`, data)
}

// 删除用户
export const deleteUser = (id: number): Promise<void> => {
  return request.delete(`/users/${id}`)
}

// 重置密码
export const resetPassword = (id: number, newPassword: string): Promise<void> => {
  return request.put(`/users/${id}/reset-password`, { new_password: newPassword })
}

// 获取个人资料
export const getProfile = (): Promise<User> => {
  return request.get('/users/profile/info')
}

// 更新个人资料
export const updateProfile = (data: Partial<User>): Promise<void> => {
  return request.put('/users/profile/update', data)
}

// 修改密码
export const updatePassword = (oldPassword: string, newPassword: string): Promise<void> => {
  return request.put('/users/profile/password', { 
    old_password: oldPassword, 
    new_password: newPassword 
  })
}
