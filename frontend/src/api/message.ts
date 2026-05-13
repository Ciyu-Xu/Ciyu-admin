import request from '@/utils/request'

export interface Message {
  id: number
  title: string
  content: string
  msg_type: number | string
  status: number
  from_user_id: number | null
  to_user_id: number
  other_username: string | null
  create_time: string
}

export interface MessageListResponse {
  rows: Message[]
  total: number
}

export interface SendMessageData {
  user_ids: number[]
  title: string
  content: string
  msg_type: number
}

export const getMessageList = (params?: {
  direction?: string
  status?: number
  page?: number
  size?: number
}): Promise<MessageListResponse> => {
  return request.get('/system/message/list', { params })
}

export const getUnreadCount = (): Promise<number> => {
  return request.get('/system/message/unread/count')
}

export const markAsRead = (msgId: number): Promise<void> => {
  return request.put(`/system/message/read/${msgId}`, {})
}

export const markAllAsRead = (): Promise<void> => {
  return request.put('/system/message/read-all', {})
}

export const deleteMessage = (msgId: number): Promise<void> => {
  return request.delete(`/system/message/${msgId}`)
}

export const sendMessage = (data: SendMessageData): Promise<void> => {
  return request.post('/system/message/send', data)
}

export const getAllUsers = (): Promise<any> => {
  return request.get('/system/users')
}