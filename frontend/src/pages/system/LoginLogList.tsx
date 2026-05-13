import { useState, useEffect } from 'react'
import { 
  LogIn, 
  Trash2, 
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle as XCircleIcon,
  Monitor
} from 'lucide-react'
import { 
  getLoginLogs,
  deleteLoginLog,
  batchDeleteLoginLogs,
  type LoginLog
} from '@/api/log'
import { useToast } from '@/hooks/useToast'

const LoginLogList = () => {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [selectedLogs, setSelectedLogs] = useState<number[]>([])
  const toast = useToast()

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getLoginLogs({ 
        page, 
        page_size: pageSize,
        username: username || undefined,
        status
      })
      setLogs(result.rows)
      setTotal(result.total)
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, status])

  const handleSearch = () => {
    setPage(1)
    loadLogs()
  }

  const handleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([])
    } else {
      setSelectedLogs(logs.map(log => log.id))
    }
  }

  const handleSelect = (logId: number) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    )
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteLoginLog(id)
      loadLogs()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedLogs.length === 0) return
    try {
      await batchDeleteLoginLogs(selectedLogs)
      setSelectedLogs([])
      loadLogs()
    } catch (error) {
      console.error('批量删除失败:', error)
      toast.error('删除失败')
    }
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return date.toLocaleString()
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">登录日志</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看用户登录记录，进行安全审计
        </p>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="搜索用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
          >
            <Search size={16} className="mr-2" />
            搜索
          </button>
        </div>

        <button
          onClick={handleBatchDelete}
          disabled={selectedLogs.length === 0}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Trash2 size={16} className="mr-2" />
          批量删除
        </button>
      </div>

      {/* 筛选 */}
      <div className="mb-4 flex items-center space-x-4">
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value === '' ? undefined : Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部状态</option>
          <option value="1">成功</option>
          <option value="0">失败</option>
        </select>
      </div>

      {/* 统计信息 */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">总记录数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">登录成功</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {logs.filter(l => l.status === 1).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">登录失败</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {logs.filter(l => l.status === 0).length}
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <LogIn size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无登录记录</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedLogs.length === logs.length && logs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  用户名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  登录状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  提示消息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  登录地点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  浏览器
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作系统
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  登录时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLogs.includes(log.id)}
                      onChange={() => handleSelect(log.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {log.username}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${
                      log.status === 1 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status === 1 ? (
                        <CheckCircle2 size={12} className="mr-1" />
                      ) : (
                        <XCircleIcon size={12} className="mr-1" />
                      )}
                      {log.status === 1 ? '成功' : '失败'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.msg || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.login_location || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.browser || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.os || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatTime(log.create_time)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-600 hover:text-red-900"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {total} 条记录
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginLogList