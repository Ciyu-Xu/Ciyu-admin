import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth'
import { updateHeartbeat } from '@/api/system/monitor'

const HEARTBEAT_INTERVAL = 60000

export function useHeartbeat() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  useEffect(() => {
    if (!isLoggedIn) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const sendHeartbeat = async () => {
      try {
        await updateHeartbeat()
      } catch (error) {
        console.warn('心跳更新失败:', error)
      }
    }

    sendHeartbeat()

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isLoggedIn])
}
