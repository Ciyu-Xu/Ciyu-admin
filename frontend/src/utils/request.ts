import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

interface FailedRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: FailedRequest[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const refreshRequest = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response.data
    }
    const { code, message, data } = response.data
    if (code !== 200) {
      return Promise.reject(new Error(message || '操作失败'))
    }
    return data ?? response.data
  },
  async (error: AxiosError<{ detail?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    let errorMessage = '请求失败'

    if (!error.response) {
      errorMessage = '网络错误，请检查网络连接'
      return Promise.reject(new Error(errorMessage))
    }

    const { status, data } = error.response
    const isLoginRequest = originalRequest.url?.includes('/auth/login')
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh')

    if (status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return request(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await refreshRequest.post('/auth/refresh', {
          refresh_token: refreshToken,
        })
        const data = res.data as { code: number; data?: { access_token?: string } }
        const newToken = data?.data?.access_token

        if (!newToken) {
          throw new Error('刷新令牌失败')
        }

        localStorage.setItem('token', newToken)

        const { useAuthStore } = await import('@/stores/auth')
        useAuthStore.getState().setToken(newToken)

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return request(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(new Error('登录已过期，请重新登录'))
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && (isLoginRequest || isRefreshRequest)) {
      return Promise.reject(new Error(data?.detail || data?.message || '认证失败'))
    }

    errorMessage = data?.detail || data?.message || errorMessage

    switch (status) {
      case 403:
        errorMessage = '权限不足'
        break
      case 404:
        errorMessage = '请求的资源不存在'
        break
      case 429:
        errorMessage = data?.detail || '请求过于频繁，请稍后再试'
        break
      case 500:
        errorMessage = '服务器错误'
        break
    }

    return Promise.reject(new Error(errorMessage))
  }
)

export default request
