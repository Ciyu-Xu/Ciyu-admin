import request from '@/utils/request'

export interface TaskJob {
  id: number
  name: string
  code: string
  task_type: string
  cron_expression?: string
  interval_seconds?: number
  target: string
  method: string
  headers?: any
  params?: any
  body?: string
  timeout: number
  retry_count: number
  retry_interval: number
  status: string
  is_async: boolean
  remark?: string
  create_user?: number
  create_time?: string
  update_user?: number
  update_time?: string
  last_run_time?: string
  next_run_time?: string
  total_runs: number
  success_runs: number
  fail_runs: number
}

export interface TaskLog {
  id: number
  job_id: number
  job_name: string
  job_code: string
  status: string
  start_time: string
  end_time?: string
  execution_time?: number
  request_data?: string
  response_data?: string
  error_msg?: string
  trigger_type: string
  ip_address?: string
  create_time: string
}

export interface TaskListResponse {
  rows: TaskJob[]
  total: number
  page: number
  page_size: number
}

export interface TaskLogListResponse {
  rows: TaskLog[]
  total: number
  page: number
  page_size: number
}

export interface PaginationParams {
  page?: number
  page_size?: number
  name?: string
  status?: string
  task_type?: string
}

export const getTaskJobs = (params?: PaginationParams) => {
  return request.get<any>('/system/task/job', { params })
}

export const getTaskJob = (id: number) => {
  return request.get<any>(`/system/task/job/${id}`)
}

export const createTaskJob = (data: Partial<TaskJob>) => {
  return request.post<any>('/system/task/job', data)
}

export const updateTaskJob = (id: number, data: Partial<TaskJob>) => {
  return request.put<any>(`/system/task/job/${id}`, data)
}

export const deleteTaskJob = (id: number) => {
  return request.delete<any>(`/system/task/job/${id}`)
}

export const runTaskNow = (id: number) => {
  return request.post<any>(`/system/task/job/${id}/run`)
}

export const changeTaskStatus = (id: number, status: string) => {
  return request.post<any>(`/system/task/job/${id}/change-status?status=${status}`)
}

export const getTaskLogs = (params?: any) => {
  return request.get<any>('/system/task/log', { params })
}

export const deleteTaskLog = (id: number) => {
  return request.delete<any>(`/system/task/log/${id}`)
}

export const cleanTaskLogs = (days: number = 7) => {
  return request.delete<any>(`/system/task/log/clean?days=${days}`)
}
