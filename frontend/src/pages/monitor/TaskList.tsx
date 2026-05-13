import { useState, useMemo } from 'react'
import { Plus, RefreshCw, Search, Play, Pause, Trash2, Eye, Edit, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTaskJobs,
  createTaskJob,
  updateTaskJob,
  deleteTaskJob,
  runTaskNow,
  changeTaskStatus,
  type TaskJob
} from '@/api/system/task'
import { useToast } from '@/hooks/useToast'

const TaskList = () => {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskJob | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<TaskJob | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const [formData, setFormData] = useState<Partial<TaskJob>>({
    name: '',
    code: '',
    task_type: 'http',
    method: 'GET',
    target: '',
    cron_expression: '',
    interval_seconds: undefined,
    timeout: 30,
    retry_count: 0,
    status: '1',
    is_async: false,
    remark: ''
  })

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['taskJobs', page, pageSize, searchKeyword, statusFilter],
    queryFn: () => getTaskJobs({ page, page_size: pageSize, name: searchKeyword, status: statusFilter }),
  })

  const taskList: TaskJob[] = data?.rows || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const deleteMutation = useMutation({
    mutationFn: deleteTaskJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskJobs'] })
    }
  })

  const runMutation = useMutation({
    mutationFn: runTaskNow,
    onSuccess: (data, variables, context) => {
      toast.success('任务已开始执行', '请查看任务日志')
      queryClient.invalidateQueries({ queryKey: ['taskJobs'] })
    },
    onError: (error: Error) => {
      toast.error('执行失败', error.message)
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => changeTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskJobs'] })
    }
  })

  const handleDelete = (task: TaskJob) => {
    deleteMutation.mutate(task.id)
  }

  const handleRun = (task: TaskJob) => {
    runMutation.mutate(task.id)
  }

  const handleStatusChange = (task: TaskJob, newStatus: string) => {
    statusMutation.mutate({ id: task.id, status: newStatus })
  }

  const handleOpenModal = (task?: TaskJob) => {
    if (task) {
      setEditingTask(task)
      setFormData({ ...task })
    } else {
      setEditingTask(null)
      setFormData({
        name: '',
        code: '',
        task_type: 'http',
        method: 'GET',
        target: '',
        cron_expression: '',
        interval_seconds: undefined,
        timeout: 30,
        retry_count: 0,
        status: '1',
        is_async: false,
        remark: ''
      })
    }
    setIsModalOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: createTaskJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskJobs'] })
      setIsModalOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<TaskJob> }) => updateTaskJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskJobs'] })
      setIsModalOpen(false)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '1':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" /> 启用
        </span>
      case '0':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" /> 禁用
        </span>
      case '2':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Pause className="w-3 h-3 mr-1" /> 暂停
        </span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          未知
        </span>
    }
  }

  const getTaskTypeBadge = (type: string) => {
    const types: Record<string, { bg: string; text: string; label: string }> = {
      http: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'HTTP' },
      python: { bg: 'bg-green-100', text: 'text-green-800', label: 'Python' },
      bean: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Bean' },
    }
    const config = types[type] || types.http
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
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">定时任务</h1>
        <p className="text-gray-600 mt-1">管理系统定时任务，支持Cron表达式和间隔执行</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1) }}
              placeholder="搜索任务名称..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">禁用</option>
            <option value="2">暂停</option>
          </select>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建任务
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">执行方式</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">执行目标</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">执行统计</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">上次执行</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : taskList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    暂无任务数据
                  </td>
                </tr>
              ) : (
                taskList.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{task.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{task.code}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {getTaskTypeBadge(task.task_type)}
                        <div className="text-xs text-gray-500">
                          {task.cron_expression ? (
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{task.cron_expression}</span>
                          ) : task.interval_seconds ? (
                            <span className="flex items-center"><ArrowRight className="w-3 h-3 mr-1" />每{task.interval_seconds}秒</span>
                          ) : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 max-w-xs truncate" title={task.target}>
                        {task.target}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        <div>总计: {task.total_runs}</div>
                        <div className="text-green-600">成功: {task.success_runs}</div>
                        <div className="text-red-600">失败: {task.fail_runs}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500">
                        {task.last_run_time ? formatTime(task.last_run_time) : '从未执行'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => { setDetailTask(task); setIsDetailOpen(true) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRun(task)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="立即执行"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        {task.status === '1' ? (
                          <button
                            onClick={() => handleStatusChange(task, '2')}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="暂停"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : task.status === '2' ? (
                          <button
                            onClick={() => handleStatusChange(task, '1')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="启用"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDelete(task)}
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

      {/* 新建/编辑任务弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingTask ? '编辑任务' : '新建任务'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入任务名称"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务编码</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入任务编码"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务类型</label>
                  <select
                    value={formData.task_type || 'http'}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="http">HTTP</option>
                    <option value="python">Python</option>
                    <option value="bean">Bean</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">执行方法</label>
                  <select
                    value={formData.method || 'GET'}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">执行目标</label>
                  <input
                    type="text"
                    value={formData.target || ''}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入执行目标URL或路径"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cron表达式</label>
                  <input
                    type="text"
                    value={formData.cron_expression || ''}
                    onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如: */5 * * * *"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">间隔秒数</label>
                  <input
                    type="number"
                    value={formData.interval_seconds || ''}
                    onChange={(e) => setFormData({ ...formData, interval_seconds: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="优先级低于Cron表达式"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">超时时间(秒)</label>
                  <input
                    type="number"
                    value={formData.timeout || 30}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重试次数</label>
                  <input
                    type="number"
                    value={formData.retry_count || 0}
                    onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.status || '1'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="1">启用</option>
                    <option value="0">禁用</option>
                    <option value="2">暂停</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">异步执行</label>
                  <select
                    value={formData.is_async ? '1' : '0'}
                    onChange={(e) => setFormData({ ...formData, is_async: e.target.value === '1' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="1">是</option>
                    <option value="0">否</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={formData.remark || ''}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入备注信息"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? '保存中...' : (editingTask ? '保存' : '创建')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {isDetailOpen && detailTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">任务详情</h3>
              <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">任务名称</label>
                  <p className="font-medium">{detailTask.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">任务编码</label>
                  <p className="font-medium">{detailTask.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">任务类型</label>
                  <p className="font-medium">{detailTask.task_type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">执行方法</label>
                  <p className="font-medium">{detailTask.method}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">执行目标</label>
                  <p className="font-medium break-all">{detailTask.target}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Cron表达式</label>
                  <p className="font-medium">{detailTask.cron_expression || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">间隔秒数</label>
                  <p className="font-medium">{detailTask.interval_seconds ? `${detailTask.interval_seconds}秒` : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">超时时间</label>
                  <p className="font-medium">{detailTask.timeout}秒</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">重试次数</label>
                  <p className="font-medium">{detailTask.retry_count}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  {getStatusBadge(detailTask.status)}
                </div>
                <div>
                  <label className="text-sm text-gray-500">异步执行</label>
                  <p className="font-medium">{detailTask.is_async ? '是' : '否'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">备注</label>
                  <p className="font-medium">{detailTask.remark || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{formatTime(detailTask.create_time)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">更新时间</label>
                  <p className="font-medium">{formatTime(detailTask.update_time)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskList
