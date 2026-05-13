import request from '@/utils/request'

export interface DashboardStats {
  totalUsers: number
  totalUsersLastMonth: number
  onlineUsers: number
  totalRoles: number
  totalDepts: number
}

export interface ActivityItem {
  id: number
  oper_name: string
  oper_type: string
  oper_desc: string
  status: number
  ip_address: string
  create_time: string
}

export interface NoticeItem {
  id: number
  notice_title: string
  notice_content: string
  notice_type: string
  create_time: string
}

export const getDashboardStats = () => {
  return request<{ code: number; msg: string; data: DashboardStats }>({
    url: '/system/dashboard/stats',
    method: 'get',
  })
}

export const getRecentActivities = (limit = 10) => {
  return request<{ code: number; msg: string; data: { rows: ActivityItem[]; total: number } }>({
    url: '/system/dashboard/recent-activities',
    method: 'get',
    params: { limit },
  })
}

export const getNotices = (limit = 5) => {
  return request<{ code: number; msg: string; data: { rows: NoticeItem[]; total: number } }>({
    url: '/system/dashboard/notices',
    method: 'get',
    params: { limit },
  })
}
