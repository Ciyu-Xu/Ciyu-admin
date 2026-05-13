import request from '@/utils/request'

export interface DictType {
  id: number
  dict_name: string
  dict_type: string
  status: number
  create_time: string
}

export interface DictData {
  id: number
  dict_id: number
  dict_label: string
  dict_value: string
  sort_order: number
  remark: string | null
  status: number
  create_time: string
}

export interface DictTypeListResponse {
  rows: DictType[]
  total: number
  page: number
  page_size: number
}

export interface DictDataListResponse {
  rows: DictData[]
  total: number
  page: number
  page_size: number
}

export interface DictOption {
  id: number
  dictLabel: string
  dictType: string
}

export interface TypeDataItem {
  id: number
  dictLabel: string
  dictValue: string
}

// 字典类型管理
export const getDictTypes = (params?: {
  dict_name?: string
  dict_type?: string
  status?: number
  page?: number
  page_size?: number
}): Promise<DictTypeListResponse> => {
  return request.get('/system/dict/type', { params })
}

export const getDictType = (id: number): Promise<DictType> => {
  return request.get(`/system/dict/type/${id}`)
}

export const createDictType = (data: {
  dict_name: string
  dict_type: string
  status?: number
}): Promise<void> => {
  return request.post('/system/dict/type', data)
}

export const updateDictType = (id: number, data: {
  dict_name: string
  dict_type: string
  status: number
}): Promise<void> => {
  return request.put(`/system/dict/type/${id}`, data)
}

export const deleteDictType = (id: number): Promise<void> => {
  return request.delete(`/system/dict/type/${id}`)
}

// 字典数据管理
export const getDictDatas = (params?: {
  dict_type?: string
  dict_label?: string
  status?: number
  page?: number
  page_size?: number
}): Promise<DictDataListResponse> => {
  return request.get('/system/dict/data', { params })
}

export const getDictData = (id: number): Promise<DictData> => {
  return request.get(`/system/dict/data/${id}`)
}

export const createDictData = (data: {
  dict_id: number
  dict_label: string
  dict_value: string
  sort_order?: number
  remark?: string
  status?: number
}): Promise<void> => {
  return request.post('/system/dict/data', data)
}

export const updateDictData = (id: number, data: {
  dict_label: string
  dict_value: string
  sort_order: number
  remark: string | null
  status: number
}): Promise<void> => {
  return request.put(`/system/dict/data/${id}`, data)
}

export const deleteDictData = (id: number): Promise<void> => {
  return request.delete(`/system/dict/data/${id}`)
}

// 获取字典类型选择列表
export const getDictOptionSelect = (): Promise<DictOption[]> => {
  return request.get('/system/dict/optionselect')
}

// 根据字典类型获取字典数据
export const getTypeData = (dict_type: string): Promise<TypeDataItem[]> => {
  return request.get('/system/dict/data/typedata', { params: { dict_type } })
}