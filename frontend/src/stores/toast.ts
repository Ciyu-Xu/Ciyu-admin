import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast_${++toastId}`
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  success: (title, message) => get().addToast({ type: 'success', title, message }),
  error: (title, message) => get().addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (title, message) => get().addToast({ type: 'warning', title, message, duration: 5000 }),
  info: (title, message) => get().addToast({ type: 'info', title, message }),
}))
