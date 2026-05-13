import { useState, useEffect } from 'react'
import { X, Volume2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { getPopupNotices, markNoticeRead, type NoticeItem } from '@/api/system/notice'
import { useAuthStore } from '@/stores/auth'

const NoticePopup = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  useEffect(() => {
    if (!isLoggedIn || hasInitialized) return
    setHasInitialized(true)
    loadPopupNotices()
  }, [isLoggedIn, hasInitialized])

  const loadPopupNotices = async () => {
    try {
      const data = await getPopupNotices()
      const allNotices = data?.rows || []
      if (allNotices.length === 0) return
      setNotices(allNotices)
      setVisible(true)
    } catch (error) {
      console.error('获取弹窗公告失败:', error)
    }
  }

  const handleClose = async () => {
    const current = notices[currentIndex]
    if (current) {
      try {
        await markNoticeRead(current.id)
      } catch {}
    }

    if (currentIndex < notices.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setVisible(false)
    }
  }

  const handleCloseAll = async () => {
    for (const n of notices) {
      try {
        await markNoticeRead(n.id)
      } catch {}
    }
    setVisible(false)
  }

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-6 h-6 text-blue-600" />
      case 'warning': return <AlertCircle className="w-6 h-6 text-yellow-600" />
      case 'success': return <CheckCircle className="w-6 h-6 text-green-600" />
      default: return <Volume2 className="w-6 h-6 text-gray-600" />
    }
  }

  const getNoticeColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-l-blue-500'
      case 'warning': return 'border-l-yellow-500'
      case 'success': return 'border-l-green-500'
      default: return 'border-l-gray-500'
    }
  }

  if (!visible || notices.length === 0) return null

  const currentNotice = notices[currentIndex]
  if (!currentNotice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className={`bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 border-l-4 ${getNoticeColor(currentNotice.notice_type)}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {getNoticeIcon(currentNotice.notice_type)}
              <h3 className="ml-3 text-lg font-bold text-gray-900">{currentNotice.notice_title}</h3>
            </div>
            <button 
              onClick={handleCloseAll}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-gray-600 text-sm leading-relaxed">
            {currentNotice.notice_content}
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            {currentNotice.create_time && new Date(currentNotice.create_time).toLocaleDateString()}
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between rounded-b-lg">
          <div className="text-xs text-gray-500">
            {currentIndex + 1} / {notices.length}
          </div>
          <div className="flex space-x-2">
            {notices.length > 1 && currentIndex < notices.length - 1 && (
              <button
                onClick={handleClose}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                下一条
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              我已知晓
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoticePopup
