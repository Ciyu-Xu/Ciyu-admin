import request from '@/utils/request'

export interface NoticeItem {
  id: number
  notice_title: string
  notice_content: string
  notice_type: string
  is_popup: number
  status: number
  read_count?: number
  is_read?: boolean
  create_time: string | null
}

export interface NoticeReadRecord {
  id: number
  user_id: number
  username: string
  read_time: string
}

export interface NoticeFormData {
  notice_title: string
  notice_content: string
  notice_type: string
  is_popup: number
  status: number
}

export const getNoticeList = (params?: {
  notice_title?: string
  notice_type?: string
  status?: number
  page?: number
  page_size?: number
}) => {
  return request<{ code: number; msg: string; data: { rows: NoticeItem[]; total: number; page: number; page_size: number } }>({
    url: '/system/notice',
    method: 'get',
    params,
  })
}

export const getPopupNotices = () => {
  return request<{ code: number; msg: string; data: { rows: NoticeItem[]; total: number } }>({
    url: '/system/notice/popup',
    method: 'get',
  })
}

export const getNotice = (id: number) => {
  return request<{ code: number; msg: string; data: NoticeItem }>({
    url: `/system/notice/${id}`,
    method: 'get',
  })
}

export const createNotice = (data: NoticeFormData) => {
  return request<{ code: number; msg: string; data: { id: number } }>({
    url: '/system/notice',
    method: 'post',
    data,
  })
}

export const updateNotice = (id: number, data: Partial<NoticeFormData>) => {
  return request<{ code: number; msg: string; data: { id: number } }>({
    url: `/system/notice/${id}`,
    method: 'put',
    data,
  })
}

export const deleteNotice = (id: number) => {
  return request<{ code: number; msg: string }>({
    url: `/system/notice/${id}`,
    method: 'delete',
  })
}

export const changeNoticeStatus = (id: number, status: number) => {
  return request<{ code: number; msg: string }>({
    url: `/system/notice/${id}/status`,
    method: 'put',
    params: { status },
  })
}

export const getNotices = (limit = 10) => {
  return request<{ code: number; msg: string; data: { rows: NoticeItem[]; total: number } }>({
    url: '/system/notice',
    method: 'get',
    params: { page_size: limit, status: 1 },
  })
}

export const markNoticeRead = (noticeId: number) => {
  return request<{ code: number; msg: string; data: { read_id?: number; already_read?: boolean } }>({
    url: `/system/notice/${noticeId}/read`,
    method: 'post',
  })
}

export const getNoticeReadRecords = (noticeId: number, params?: { page?: number; page_size?: number }) => {
  return request<{ code: number; msg: string; data: { rows: NoticeReadRecord[]; total: number; page: number; page_size: number } }>({
    url: `/system/notice/${noticeId}/read-records`,
    method: 'get',
    params,
  })
}
