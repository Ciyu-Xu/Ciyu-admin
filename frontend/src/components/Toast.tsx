import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/stores/toast'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} className="text-green-500" />,
  error: <XCircle size={20} className="text-red-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />,
  info: <Info size={20} className="text-blue-500" />,
}

const bgBorders: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
}

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const ToastItem = ({ toast, onClose }: { toast: any; onClose: () => void }) => {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setLeaving(true)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className={`pointer-events-auto bg-white rounded-lg shadow-xl border border-gray-200 border-l-4 ${bgBorders[toast.type]} overflow-hidden transition-all duration-300 ${
        visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs text-gray-500">{toast.message}</p>}
        </div>
        <button onClick={handleClose} className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      <ProgressBar duration={toast.duration} onComplete={handleClose} />
    </div>
  )
}

const ProgressBar = ({ duration, onComplete }: { duration: number; onComplete: () => void }) => {
  const [width, setWidth] = useState(100)

  useEffect(() => {
    if (duration <= 0) return
    const start = performance.now()
    const frame = () => {
      const elapsed = performance.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (elapsed < duration) {
        requestAnimationFrame(frame)
      } else {
        onComplete()
      }
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [duration, onComplete])

  if (duration <= 0) return null

  return (
    <div className="h-0.5 bg-gray-100">
      <div className="h-full bg-gray-300 transition-none" style={{ width: `${width}%` }} />
    </div>
  )
}

export default ToastContainer
