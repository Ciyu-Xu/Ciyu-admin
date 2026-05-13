// 用户相关类型
export interface User {
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
  role_ids?: number[]
  post_ids?: number[]
}

export interface UserInfo {
  id: number
  username: string
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  roles: string[]
  permissions: string[]
}

// 登录请求参数
export interface LoginRequest {
  username: string
  password: string
  captcha?: string
  captcha_session_id?: string
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
}

// 角色相关类型
export interface Role {
  id: number
  role_name: string
  role_key: string
  sort_order: number
  status: number
  data_scope: string
  create_time?: string
  menu_ids?: number[]
}

// 菜单相关类型
export interface Menu {
  id: number
  menu_name: string
  path?: string
  component?: string
  icon?: string
  parent_id: number
  sort_order: number
  is_frame?: number
  is_cache?: number
  visible?: number
  status: number
  permission?: string
  menu_type?: string
  create_time?: string
  children?: Menu[]
}

// 部门相关类型
export interface Dept {
  id: number
  dept_name: string
  parent_id: number
  sort_order: number
  leader?: string
  phone?: string
  email?: string
  status: number
  create_time?: string
  children?: Dept[]
}

// 岗位相关类型
export interface Post {
  id: number
  post_name: string
  post_code: string
  sort_order: number
  status: number
  create_time?: string
}

// 字典相关类型
export interface DictType {
  id: number
  dict_name: string
  dict_type: string
  status: number
  create_time?: string
}

export interface DictData {
  id: number
  dict_id: number
  dict_label: string
  dict_value: string
  sort_order: number
  remark?: string
  status: number
  create_time?: string
}

// 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  msg?: string
  message?: string
  data?: T
}

export interface PageResponse<T = any> {
  rows: T[]
  total: number
  page: number
  page_size: number
}

// 登录相关类型
export interface LoginRequest {
  username: string
  password: string
  captcha?: string
  uuid?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// 查询参数类型
export interface UserQuery {
  username?: string
  nickname?: string
  phone?: string
  status?: number
  dept_id?: number
  page?: number
  size?: number
}

export interface RoleQuery {
  role_name?: string
  role_key?: string
  status?: number
  page?: number
  size?: number
}
