import { useState } from 'react'
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X,
  Volume2,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  BookOpen,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/useToast'
import { noticeSchema, type NoticeForm } from '@/utils/validation'
import { InputField, SelectField, TextareaField, CheckboxField } from '@/components/FormField'
import { 
  getNoticeList, 
  createNotice, 
  updateNotice, 
  deleteNotice,
  getNoticeReadRecords,
  type NoticeItem,
  type NoticeFormData,
  type NoticeReadRecord,
} from '@/api/system/notice'

const noticeTypeOptions = [
  { value: 'info', label: '通知', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: '警告', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'success', label: '成功', color: 'bg-green-100 text-green-800' },
]

const NoticeList = () => {
  const [searchForm, setSearchForm] = useState({
    notice_title: '',
    notice_type: '',
    status: ''
  })
  const [showSearch, setShowSearch] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const noticeForm = useForm<NoticeForm>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { notice_title: '', notice_content: '', notice_type: 'info', is_popup: 0, status: 1 },
  })
  const [readRecords, setReadRecords] = useState<{ noticeTitle: string; records: NoticeReadRecord[]; total: number; page: number } | null>(null)
  const [readRecordsLoading, setReadRecordsLoading] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['noticeList', searchForm, page, pageSize],
    queryFn: () => getNoticeList({
      notice_title: searchForm.notice_title || undefined,
      notice_type: searchForm.notice_type || undefined,
      status: searchForm.status ? Number(searchForm.status) : undefined,
      page,
      page_size: pageSize,
    }),
  })

  const notices = data?.rows || []
  const total = data?.total || 0

  const handleSearch = () => {
    setPage(1)
    refetch()
  }
  
  const handleReset = () => {
    setSearchForm({
      notice_title: '',
      notice_type: '',
      status: ''
    })
    setPage(1)
  }

  const handleAdd = () => {
    setModalMode('add')
    setEditingId(null)
    noticeForm.reset({ notice_title: '', notice_content: '', notice_type: 'info', is_popup: 0, status: 1 })
    setShowModal(true)
  }

  const handleEdit = (notice: NoticeItem) => {
    setModalMode('edit')
    setEditingId(notice.id)
    noticeForm.reset({
      notice_title: notice.notice_title,
      notice_content: notice.notice_content,
      notice_type: notice.notice_type,
      is_popup: notice.is_popup,
      status: notice.status,
    })
    setShowModal(true)
  }
  
  const handleDelete = async (id: number) => {
    try {
      await deleteNotice(id)
      toast.success('删除成功')
      refetch()
    } catch (error: any) {
      toast.error('删除失败', error?.response?.data?.detail || '')
    }
  }

  const onFormSubmit = async (data: NoticeForm) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'add') {
        await createNotice(data)
        toast.success('创建成功')
      } else {
        await updateNotice(editingId!, data)
        toast.success('更新成功')
      }
      setShowModal(false)
      refetch()
    } catch (error: any) {
      toast.error('操作失败', error?.response?.data?.detail)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewReadRecords = async (notice: NoticeItem) => {
    setReadRecordsLoading(true)
    try {
      const res = await getNoticeReadRecords(notice.id, { page: 1, page_size: 20 })
      setReadRecords({
        noticeTitle: notice.notice_title,
        records: res.rows,
        total: res.total,
        page: 1,
      })
    } catch {
      toast.error('加载阅读记录失败')
    } finally {
      setReadRecordsLoading(false)
    }
  }

  const loadMoreRecords = async (noticeId: number, page: number) => {
    setReadRecordsLoading(true)
    try {
      const res = await getNoticeReadRecords(noticeId, { page, page_size: 20 })
      setReadRecords(prev => prev ? { ...prev, records: [...prev.records, ...res.rows], total: res.total, page } : prev)
    } catch {
      toast.error('加载失败')
    } finally {
      setReadRecordsLoading(false)
    }
  }

  const getNoticeTypeBadge = (type: string) => {
    const option = noticeTypeOptions.find(o => o.value === type)
    return option ? (
      <span className={`px-2 py-1 text-xs font-medium rounded ${option.color}`}>
        {option.label}
      </span>
    ) : type
  }

  const getNoticeTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-5 h-5" />
      case 'warning': return <AlertCircle className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      default: return <Volume2 className="w-5 h-5" />
    }
  }

  const getNoticeTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
          <p className="text-gray-600 mt-1">管理系统公告信息</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div 
          className="px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer"
          onClick={() => setShowSearch(!showSearch)}
        >
          <h3 className="text-lg font-medium text-gray-900">搜索条件</h3>
          <span className="text-gray-400">{showSearch ? '收起' : '展开'}</span>
        </div>
        
        {showSearch && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公告标题</label>
                <input
                  type="text"
                  value={searchForm.notice_title}
                  onChange={(e) => setSearchForm({...searchForm, notice_title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入公告标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公告类型</label>
                <select
                  value={searchForm.notice_type}
                  onChange={(e) => setSearchForm({...searchForm, notice_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">全部</option>
                  {noticeTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <select
                  value={searchForm.status}
                  onChange={(e) => setSearchForm({...searchForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">全部</option>
                  <option value="1">启用</option>
                  <option value="0">禁用</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                重置
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                搜索
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增
        </button>
        <button 
          onClick={() => refetch()}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公告标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公告类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">弹窗</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">阅读</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                     加载中...
                    </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                     暂无数据
                  </td>
                </tr>
              ) : (
                notices.map((notice: NoticeItem) => (
                  <tr key={notice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{notice.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`mr-2 ${getNoticeTypeColor(notice.notice_type)}`}>
                          {getNoticeTypeIcon(notice.notice_type)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{notice.notice_title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getNoticeTypeBadge(notice.notice_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notice.is_popup === 1 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          弹窗
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewReadRecords(notice)}
                        className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600"
                      >
                        <BookOpen size={14} />
                        <span>{notice.read_count ?? 0}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        notice.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {notice.status === 1 ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {notice.create_time ? new Date(notice.create_time).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(notice)}
                          className="text-primary-600 hover:text-primary-900"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(notice.id)}
                          className="text-red-600 hover:text-red-900"
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
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              第 {page} / {Math.ceil(total / pageSize) || 1} 页
            </span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-medium">
                {modalMode === 'add' ? '新增公告' : '编辑公告'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <InputField
                  label="公告标题"
                  required
                  placeholder="请输入公告标题"
                  error={noticeForm.formState.errors.notice_title?.message}
                  {...noticeForm.register('notice_title')}
                />
                <SelectField
                  label="公告类型"
                  required
                  options={noticeTypeOptions.map(o => ({ value: o.value, label: o.label }))}
                  error={noticeForm.formState.errors.notice_type?.message}
                  {...noticeForm.register('notice_type')}
                />
                <TextareaField
                  label="公告内容"
                  required
                  rows={5}
                  placeholder="请输入公告内容"
                  error={noticeForm.formState.errors.notice_content?.message}
                  {...noticeForm.register('notice_content')}
                />
                <CheckboxField
                  label="弹窗公告（登录后弹出）"
                  checked={noticeForm.watch('is_popup') === 1}
                  onChange={(c) => noticeForm.setValue('is_popup', c ? 1 : 0)}
                />
                <SelectField
                  label="状态"
                  options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]}
                  {...noticeForm.register('status', { valueAsNumber: true })}
                />
              </div>
              <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">取消</button>
                <button type="button" onClick={noticeForm.handleSubmit(onFormSubmit)} disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {isSubmitting ? '提交中...' : '确定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 阅读记录弹窗 */}
      {readRecords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center space-x-2">
                <BookOpen size={18} className="text-gray-500" />
                <h3 className="text-lg font-medium">阅读记录</h3>
              </div>
              <button 
                onClick={() => setReadRecords(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-3 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-700">{readRecords.noticeTitle}</p>
              <p className="text-xs text-gray-500 mt-1">共 {readRecords.total} 人已读</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {readRecords.records.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen size={40} className="mx-auto mb-2 text-gray-300" />
                  <p>暂无阅读记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {readRecords.records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.username}</p>
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Clock size={10} className="mr-1" />
                            {new Date(record.read_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {readRecords.records.length < readRecords.total && (
              <div className="px-6 py-3 border-t flex justify-center">
                <button
                  onClick={() => {
                    const noticeId = notices.find(n => n.notice_title === readRecords.noticeTitle)?.id
                    if (noticeId) loadMoreRecords(noticeId, readRecords.page + 1)
                  }}
                  disabled={readRecordsLoading}
                  className="flex items-center px-4 py-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {readRecordsLoading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NoticeList
