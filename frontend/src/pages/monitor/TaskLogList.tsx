import { useState } from 'react'
import { RefreshCw, Search, Trash2, Eye, CheckCircle, XCircle, Loader, Clock, Trash } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTaskLogs, deleteTaskLog, cleanTaskLogs, type TaskLog } from '@/api/system/task'
import { useToast } from '@/hooks/useToast'

const TaskLogList = () => {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [jobCodeFilter, setJobCodeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<TaskLog | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['taskLogs', page, pageSize, jobCodeFilter, statusFilter],
    queryFn: () => getTaskLogs({ page, page_size: pageSize, job_code: jobCodeFilter, status: statusFilter }),
    refetchInterval: 10000,
  })

  const responseData = data
  const logList: TaskLog[] = responseData?.rows || []
  const total = responseData?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const deleteMutation = useMutation({
    mutationFn: deleteTaskLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs'] })
    }
  })

  const cleanMutation = useMutation({
    mutationFn: cleanTaskLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs'] })
    }
  })

  const handleDelete = (log: TaskLog) => {
    deleteMutation.mutate(log.id)
  }

  const handleClean = () => {
    const days = prompt('请输入要清理多少天之前的日志（默认7天）:', '7')
    if (days !== null) {
      cleanMutation.mutate(parseInt(days) || 7)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '1':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" /> 成功
        </span>
      case '0':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" /> 失败
        </span>
      case '2':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Loader className="w-3 h-3 mr-1 animate-spin" /> 运行中
        </span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          未知
        </span>
    }
  }

  const getTriggerBadge = (trigger: string) => {
    const triggers: Record<string, { bg: string; text: string; label: string }> = {
      cron: { bg: 'bg-purple-100', text: 'text-purple-800', label: '定时' },
      manual: { bg: 'bg-blue-100', text: 'text-blue-800', label: '手动' },
      retry: { bg: 'bg-orange-100', text: 'text-orange-800', label: '重试' },
    }
    const config = triggers[trigger] || { bg: 'bg-gray-100', text: 'text-gray-800', label: trigger }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleString('zh-CN')
  }

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}分${seconds}秒`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">任务日志</h1>
        <p className="text-gray-600 mt-1">查看定时任务的执行记录和结果</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={jobCodeFilter}
              onChange={(e) => { setJobCodeFilter(e.target.value); setPage(1) }}
              placeholder="搜索任务编码..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部状态</option>
            <option value="1">成功</option>
            <option value="0">失败</option>
            <option value="2">运行中</option>
          </select>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClean}
            className="flex items-center px-3 py-2 border border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50"
          >
            <Trash className="w-4 h-4 mr-2" />
            清理日志
          </button>
          <button
            onClick={() => refetch()}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">执行状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">触发方式</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">执行时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">耗时</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    暂无日志数据
                  </td>
                </tr>
              ) : (
                logList.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.job_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{log.job_code}</code>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3">
                      {getTriggerBadge(log.trigger_type)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500">
                        <div>{formatTime(log.start_time)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${log.execution_time && log.execution_time > 30000 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatDuration(log.execution_time)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              第 {page} / {totalPages} 页，共 {total} 条
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">执行详情</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">任务名称</label>
                  <p className="font-medium">{selectedLog.job_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">任务编码</label>
                  <p className="font-medium">{selectedLog.job_code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">执行状态</label>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>
                  <label className="text-sm text-gray-500">触发方式</label>
                  {getTriggerBadge(selectedLog.trigger_type)}
                </div>
                <div>
                  <label className="text-sm text-gray-500">开始时间</label>
                  <p className="font-medium">{formatTime(selectedLog.start_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">结束时间</label>
                  <p className="font-medium">{formatTime(selectedLog.end_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">执行耗时</label>
                  <p className="font-medium">{formatDuration(selectedLog.execution_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">服务器IP</label>
                  <p className="font-medium">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {selectedLog.error_msg && (
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">错误信息</label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm whitespace-pre-wrap">
                    {selectedLog.error_msg}
                  </div>
                </div>
              )}

              {selectedLog.response_data && (
                <div>
                  <label className="text-sm text-gray-500 block mb-2">响应数据</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm max-h-64 overflow-auto">
                    <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                      {typeof selectedLog.response_data === 'string' 
                        ? JSON.stringify(JSON.parse(selectedLog.response_data), null, 2)
                        : JSON.stringify(selectedLog.response_data, null, 2)
                      }
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskLogList
