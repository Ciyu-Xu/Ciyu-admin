import request from '@/utils/request'

export interface DeptFormData {
  id?: number
  dept_name: string
  parent_id: number
  sort_order: number
  leader?: string
  phone?: string
  email?: string
  status: number
}

export const getDeptList = (params?: { dept_name?: string; status?: number }) => {
  return request({
    url: '/system/dept',
    method: 'get',
    params
  })
}

export const getDeptTree = () => {
  return request({
    url: '/system/dept/tree',
    method: 'get'
  })
}

export const getDept = (id: number) => {
  return request({
    url: `/system/dept/${id}`,
    method: 'get'
  })
}

export const createDept = (data: DeptFormData) => {
  return request({
    url: '/system/dept',
    method: 'post',
    data
  })
}

export const updateDept = (id: number, data: DeptFormData) => {
  return request({
    url: `/system/dept/${id}`,
    method: 'put',
    data
  })
}

export const deleteDept = (id: number) => {
  return request({
    url: `/system/dept/${id}`,
    method: 'delete'
  })
}
