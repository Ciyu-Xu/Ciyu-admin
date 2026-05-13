import request from '@/utils/request'

export interface PostFormData {
  id?: number
  post_name: string
  post_code: string
  dept_id?: number | null
  sort_order: number
  status: number
}

export interface PostItem {
  id: number
  post_name: string
  post_code: string
  dept_id?: number | null
  dept_name?: string | null
  sort_order: number
  status: number
  create_time?: string
}

export interface PostListParams {
  post_name?: string
  post_code?: string
  dept_id?: number
  status?: number
  page?: number
  page_size?: number
}

export interface PageResponse<T> {
  rows: T[]
  total: number
  page: number
  page_size: number
}

export const getPostList = (params: PostListParams) => {
  return request<{ code: number; msg: string; data: PageResponse<PostItem> }>({
    url: '/system/post',
    method: 'get',
    params
  })
}

export const getAllPosts = (dept_id?: number) => {
  return request<{ code: number; msg: string; data: PostItem[] }>({
    url: '/system/post/all',
    method: 'get',
    params: dept_id ? { dept_id } : undefined
  })
}

export const getPost = (id: number) => {
  return request<{ code: number; msg: string; data: PostItem }>({
    url: `/system/post/${id}`,
    method: 'get'
  })
}

export const createPost = (data: PostFormData) => {
  return request({
    url: '/system/post',
    method: 'post',
    data
  })
}

export const updatePost = (id: number, data: PostFormData) => {
  return request({
    url: `/system/post/${id}`,
    method: 'put',
    data
  })
}

export const deletePost = (id: number) => {
  return request({
    url: `/system/post/${id}`,
    method: 'delete'
  })
}

export const changePostStatus = (id: number, status: number) => {
  return request({
    url: `/system/post/${id}/status`,
    method: 'put',
    params: { status }
  })
}
