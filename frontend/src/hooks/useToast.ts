import { useCallback } from 'react'
import { useToastStore } from '@/stores/toast'

export const useToast = () => {
  const success = useToastStore((s) => s.success)
  const error = useToastStore((s) => s.error)
  const warning = useToastStore((s) => s.warning)
  const info = useToastStore((s) => s.info)
  const removeToast = useToastStore((s) => s.removeToast)

  return {
    success: useCallback((title: string, message?: string) => success(title, message), [success]),
    error: useCallback((title: string, message?: string) => error(title, message), [error]),
    warning: useCallback((title: string, message?: string) => warning(title, message), [warning]),
    info: useCallback((title: string, message?: string) => info(title, message), [info]),
    dismiss: useCallback((id: string) => removeToast(id), [removeToast]),
  }
}
