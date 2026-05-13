import { useState } from 'react'
import { RefreshCw, LogOut, Search, Users, ShieldAlert, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOnlineUsers,
  forceLogout,
  forceLogoutAll,
  cleanupSessions,
  type OnlineUser,
  type OnlineUserListResponse
} from '@/api/system/monitor'
import { useToast } from '@/hooks/useToast'

const OnlineUser = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['onlineUsers', page, pageSize],
    queryFn: () => getOnlineUsers({ page, page_size: pageSize }),
    refetchInterval: 30000,
  })

  const responseData: OnlineUserListResponse | undefined = data
  const onlineList: OnlineUser[] = responseData?.rows || data?.data?.rows || []
  const total = responseData?.total || data?.data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const filteredList = searchKeyword
    ? onlineList.filter(user =>
        user.username?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        user.ip_address?.includes(searchKeyword)
      )
    : onlineList

  const handleForceLogout = async (sessionId: string, username: string) => {
    try {
      await forceLogout(sessionId)
      toast.success('强制下线成功')
      refetch()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleForceLogoutAll = async () => {
    try {
      await forceLogoutAll()
      toast.success('操作成功')
      refetch()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleCleanup = async () => {
    const minutes = prompt('请输入清理不活跃会话的分钟数（默认30分钟）:', '30')
    if (minutes === null) return
    const minutesNum = parseInt(minutes) || 30
    if (minutesNum < 1) {
      toast.warning('分钟数必须大于0')
      return
    }
    try {
      await cleanupSessions(minutesNum)
      toast.success('清理完成')
      refetch()
    } catch (error) {
      toast.error('清理失败')
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN')
  }

  const formatDuration = (timeStr: string | null) => {
    if (!timeStr) return '-'
    const loginDate = new Date(timeStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - loginDate.getTime()) / 1000)
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  const parseUserAgent = (ua: string) => {
    if (!ua || ua === '-') return '未知浏览器'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    if (ua.includes('MSIE') || ua.includes('Trident')) return 'IE'
    return '其他浏览器'
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">在线用户</h1>
        <p className="text-gray-600 mt-1">监控当前在线用户会话，支持强制下线操作</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索用户名或IP..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            共 {total} 人在线
          </span>
          <button
            onClick={handleCleanup}
            className="flex items-center px-3 py-2 border border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50"
            title="清理不活跃会话"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            清理
          </button>
          <button
            onClick={handleForceLogoutAll}
            className="flex items-center px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50"
            title="强制下线除当前用户外的所有用户"
          >
            <ShieldAlert className="w-4 h-4 mr-1" />
            批量下线
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">浏览器</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登录时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">在线时长</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后活跃</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    暂无在线用户
                  </td>
                </tr>
              ) : (
                filteredList.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {user.ip_address}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {parseUserAgent(user.user_agent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(user.login_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {formatDuration(user.login_time)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(user.last_active_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleForceLogout(user.session_id || String(user.id), user.username)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        强退
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              第 {page} / {totalPages} 页，共 {total} 条记录
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">i</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">使用说明</h3>
            <div className="mt-1 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>列表每30秒自动刷新一次</li>
                <li>点击「刷新」按钮可立即获取最新数据</li>
                <li>「强退」可强制指定用户下线</li>
                <li>「批量下线」会将除当前用户外的所有在线用户强制下线</li>
                <li>「清理」会将会话超时（超过指定分钟数不活跃）的用户标记为离线</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnlineUser
