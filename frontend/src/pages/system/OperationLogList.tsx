import { useState, useEffect, useCallback } from 'react'
import { 
  Activity, 
  Trash2, 
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Monitor,
  Clock,
  Terminal,
  FileJson,
  Server,
} from 'lucide-react'
import { 
  getOperationLogs,
  getOperationLog,
  deleteOperationLog,
  batchDeleteOperationLogs,
  type OperationLog
} from '@/api/log'
import { useToast } from '@/hooks/useToast'

const safeJsonParse = (str: string | null | undefined, defaultValue: any = null) => {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

const formatJson = (data: any): string => {
  if (typeof data === 'string') {
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      return formatJson(safeJsonParse(data, data))
    }
    return data
  }
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

const OperationLogList = () => {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [operName, setOperName] = useState('')
  const [operType, setOperType] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [selectedLogs, setSelectedLogs] = useState<number[]>([])
  const [detailLog, setDetailLog] = useState<OperationLog | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const toast = useToast()
  const [detailTab, setDetailTab] = useState<'overview' | 'request' | 'response'>('overview')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getOperationLogs({ 
        page, 
        page_size: pageSize,
        oper_name: operName || undefined,
        oper_type: operType || undefined,
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
      await deleteOperationLog(id)
      toast.success('删除成功')
      loadLogs()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedLogs.length === 0) return
    try {
      await batchDeleteOperationLogs(selectedLogs)
      toast.success(`已删除 ${selectedLogs.length} 条日志`)
      setSelectedLogs([])
      loadLogs()
    } catch (error) {
      toast.error('批量删除失败')
    }
  }

  const openDetail = async (log: OperationLog) => {
    setDetailLoading(true)
    setDetailLog(log)
    setDetailTab('overview')
    try {
      const full = await getOperationLog(log.id)
      setDetailLog(full)
    } catch {
      setDetailLog(log)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }, [])

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return date.toLocaleString()
  }

  const getOperTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'CREATE': { label: '新增', color: 'bg-green-100 text-green-700' },
      'UPDATE': { label: '修改', color: 'bg-blue-100 text-blue-700' },
      'DELETE': { label: '删除', color: 'bg-red-100 text-red-700' },
      'QUERY': { label: '查询', color: 'bg-gray-100 text-gray-700' },
      'LOGIN': { label: '登录', color: 'bg-purple-100 text-purple-700' },
      'LOGOUT': { label: '登出', color: 'bg-yellow-100 text-yellow-700' },
    }
    return types[type] || { label: type, color: 'bg-gray-100 text-gray-700' }
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700',
    }
    return colors[method] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
        <p className="mt-1 text-sm text-gray-500">查看用户操作记录，进行审计追踪</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="搜索操作人"
            value={operName}
            onChange={(e) => setOperName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={operType}
            onChange={(e) => setOperType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部类型</option>
            <option value="CREATE">新增</option>
            <option value="UPDATE">修改</option>
            <option value="DELETE">删除</option>
            <option value="QUERY">查询</option>
          </select>
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

      <div className="mb-4 flex items-center space-x-4">
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value === '' ? undefined : Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="0">异常</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Activity size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无日志记录</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">请求地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const typeInfo = getOperTypeLabel(log.oper_type)
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => handleSelect(log.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.oper_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.oper_desc || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getMethodColor(log.request_method)}`}>
                        {log.request_method}
                      </span>
                      <span className="ml-2 text-xs truncate max-w-[200px] inline-block align-middle">{log.request_url}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.ip_address || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${
                        log.status === 1 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 1 ? <CheckCircle2 size={12} className="mr-1" /> : <AlertCircle size={12} className="mr-1" />}
                        {log.status === 1 ? '正常' : '异常'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatTime(log.create_time)}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openDetail(log)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {total} 条记录</p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600">第 {page} 页</span>
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

      {/* 详情模态框 */}
      {detailLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <Activity size={20} className="text-gray-500" />
                <h3 className="text-lg font-medium">操作日志详情</h3>
                {detailLoading && (
                  <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                )}
              </div>
              <button onClick={() => { setDetailLog(null); setDetailTab('overview') }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* 详情标签页 */}
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex px-6 -mb-px">
                {(['overview', 'request', 'response'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm ${
                      detailTab === tab
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'overview' && <Monitor size={14} className="mr-1.5" />}
                    {tab === 'request' && <Terminal size={14} className="mr-1.5" />}
                    {tab === 'response' && <FileJson size={14} className="mr-1.5" />}
                    {tab === 'overview' && '概览'}
                    {tab === 'request' && '请求信息'}
                    {tab === 'response' && '响应信息'}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 110px)' }}>
              {/* 概览标签 */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <Monitor size={12} className="mr-1" /> 操作人
                      </div>
                      <p className="text-sm font-medium text-gray-900">{detailLog.oper_name}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <Activity size={12} className="mr-1" /> 操作类型
                      </div>
                      <p className="mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getOperTypeLabel(detailLog.oper_type).color}`}>
                          {getOperTypeLabel(detailLog.oper_type).label}
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <CheckCircle2 size={12} className="mr-1" /> 状态
                      </div>
                      <p className="mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          detailLog.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {detailLog.status === 1 ? '正常' : '异常'}
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <Terminal size={12} className="mr-1" /> 请求方法
                      </div>
                      <p className="mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${getMethodColor(detailLog.request_method)}`}>
                          {detailLog.request_method}
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <Globe size={12} className="mr-1" /> IP地址
                      </div>
                      <p className="text-sm font-medium text-gray-900">{detailLog.ip_address || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <Clock size={12} className="mr-1" /> 执行耗时
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {detailLog.execution_time != null ? `${detailLog.execution_time}ms` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">操作描述</div>
                    <p className="text-sm text-gray-900">{detailLog.oper_desc || '-'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">请求地址</div>
                    <p className="text-sm text-gray-900 break-all font-mono">{detailLog.request_url}</p>
                  </div>

                  {detailLog.error_msg && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center text-red-700 text-xs mb-1">
                        <AlertCircle size={12} className="mr-1" /> 错误信息
                      </div>
                      <p className="text-sm text-red-600 font-mono">{detailLog.error_msg}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">操作时间</div>
                    <p className="text-sm text-gray-900">{formatTime(detailLog.create_time)}</p>
                  </div>
                </div>
              )}

              {/* 请求信息标签 */}
              {detailTab === 'request' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">请求参数</h4>
                    {detailLog.request_params && (
                      <button
                        onClick={() => handleCopy(formatJson(detailLog.request_params), 'params')}
                        className="flex items-center text-xs text-gray-500 hover:text-primary-600"
                      >
                        {copied === 'params' ? <Check size={14} className="mr-1 text-green-500" /> : <Copy size={14} className="mr-1" />}
                        {copied === 'params' ? '已复制' : '复制'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    {detailLog.request_params ? (
                      <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{formatJson(detailLog.request_params)}</pre>
                    ) : (
                      <p className="text-sm text-gray-500 italic">无请求参数</p>
                    )}
                  </div>
                </div>
              )}

              {/* 响应信息标签 */}
              {detailTab === 'response' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">响应数据</h4>
                    {detailLog.response_data && (
                      <button
                        onClick={() => handleCopy(formatJson(detailLog.response_data), 'response')}
                        className="flex items-center text-xs text-gray-500 hover:text-primary-600"
                      >
                        {copied === 'response' ? <Check size={14} className="mr-1 text-green-500" /> : <Copy size={14} className="mr-1" />}
                        {copied === 'response' ? '已复制' : '复制'}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    {detailLog.response_data ? (
                      <pre className="text-sm text-blue-400 font-mono whitespace-pre-wrap">{formatJson(detailLog.response_data)}</pre>
                    ) : (
                      <p className="text-sm text-gray-500 italic">无响应数据</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-400">日志ID: {detailLog.id}</span>
              <button
                onClick={() => { setDetailLog(null); setDetailTab('overview') }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OperationLogList
