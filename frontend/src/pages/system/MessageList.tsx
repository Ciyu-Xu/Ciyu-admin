import { useState, useEffect } from 'react'
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  CheckCheck, 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  AlertCircle,
  MessageSquare,
  Plus,
  X,
  Send,
  Inbox,
  ArrowUpFromLine
} from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { 
  getMessageList, 
  markAsRead, 
  markAllAsRead, 
  deleteMessage,
  sendMessage,
  getAllUsers,
  type Message 
} from '@/api/message'
import { useToast } from '@/hooks/useToast'

const MessageList = () => {
  const [direction, setDirection] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [keyword, setKeyword] = useState('')
  const [selectedMessages, setSelectedMessages] = useState<number[]>([])
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendForm, setSendForm] = useState({
    title: '',
    content: '',
    msg_type: 1,
    user_ids: [] as number[]
  })
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const toast = useToast()

  const loadMessages = async () => {
    setLoading(true)
    try {
      const result = await getMessageList({ 
        page, 
        size: pageSize,
        status,
        direction
      })
      setMessages(result.rows)
      setTotal(result.total)
    } catch (error) {
      console.error('加载消息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [page, status, direction])

  const loadUsers = async () => {
    try {
      const result = await getAllUsers()
      console.log('用户数据:', result)
      if (result.data && result.data.rows) {
        setAllUsers(result.data.rows)
      } else if (result.rows) {
        setAllUsers(result.rows)
      } else if (Array.isArray(result)) {
        setAllUsers(result)
      } else {
        console.error('用户数据结构异常:', result)
        setAllUsers([])
      }
    } catch (error) {
      console.error('加载用户失败:', error)
      setAllUsers([])
    }
  }

  const handleOpenSendModal = () => {
    loadUsers()
    setIsSendModalOpen(true)
  }

  const handleSendMessage = async () => {
    if (!sendForm.title.trim()) {
      toast.warning('请输入消息标题')
      return
    }
    if (sendForm.user_ids.length === 0) {
      toast.warning('请选择接收用户')
      return
    }
    if (!sendForm.content.trim() || sendForm.content === '<p><br></p>') {
      toast.warning('请输入消息内容')
      return
    }

    setSending(true)
    try {
      await sendMessage(sendForm)
      toast.success('消息发送成功')
      setIsSendModalOpen(false)
      setSendForm({ title: '', content: '', msg_type: 1, user_ids: [] })
    } catch (error) {
      console.error('发送消息失败:', error)
      toast.error('发送消息失败')
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsRead = async (msgId: number) => {
    try {
      await markAsRead(msgId)
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, status: 1 } : m
      ))
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setMessages(prev => prev.map(m => ({ ...m, status: 1 })))
    } catch (error) {
      console.error('全部标记已读失败:', error)
    }
  }

  const handleDelete = async (msgId: number) => {
    try {
      await deleteMessage(msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
      setTotal(prev => prev - 1)
    } catch (error) {
      console.error('删除消息失败:', error)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedMessages.length === 0) return
    try {
      await Promise.all(selectedMessages.map(id => deleteMessage(id)))
      setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)))
      setTotal(prev => prev - selectedMessages.length)
      setSelectedMessages([])
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([])
    } else {
      setSelectedMessages(messages.map(m => m.id))
    }
  }

  const handleSelect = (msgId: number) => {
    setSelectedMessages(prev => 
      prev.includes(msgId) 
        ? prev.filter(id => id !== msgId)
        : [...prev, msgId]
    )
  }

  const getMessageTypeLabel = (type: number | string) => {
    const t = Number(type)
    const types: Record<number, string> = { 1: '系统通知', 2: '业务提醒', 3: '私信' }
    const icons: Record<number, React.ReactNode> = { 1: <Bell size={14} />, 2: <AlertCircle size={14} />, 3: <MessageSquare size={14} /> }
    return { label: types[t] || '未知', icon: icons[t] || <Mail size={14} /> }
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString()
  }

  const filteredMessages = messages.filter(msg => {
    if (!keyword) return true
    return msg.title.toLowerCase().includes(keyword.toLowerCase()) ||
           msg.content.toLowerCase().includes(keyword.toLowerCase())
  })

  const unreadCount = messages.filter(m => m.status === 0).length

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  }

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ]

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">消息通知</h1>
          <p className="mt-1 text-sm text-gray-500">
            {direction === 'inbox' ? `共 ${total} 条收件，${unreadCount} 条未读` : `共 ${total} 条已发送`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 rounded-lg p-0.5 flex">
            <button
              onClick={() => { setDirection('inbox'); setPage(1); setSelectedMessages([]) }}
              className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                direction === 'inbox' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Inbox size={16} className="mr-1.5" />
              收件箱
            </button>
            <button
              onClick={() => { setDirection('sent'); setPage(1); setSelectedMessages([]) }}
              className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                direction === 'sent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Send size={16} className="mr-1.5" />
              发件箱
            </button>
          </div>
        </div>
        <button
          onClick={handleOpenSendModal}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
        >
          <Plus size={18} className="mr-2" />
          发布消息
        </button>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索消息..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={status ?? ''}
              onChange={(e) => setStatus(e.target.value === '' ? undefined : Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部消息</option>
              <option value="0">未读消息</option>
              <option value="1">已读消息</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <CheckCheck size={16} className="mr-2" />
            全部已读
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedMessages.length === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Trash2 size={16} className="mr-2" />
            批量删除
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无消息</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedMessages.length === messages.length && messages.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {direction === 'inbox' ? '发件人' : '收件人'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMessages.map((msg) => {
                const typeInfo = getMessageTypeLabel(msg.msg_type)
                return (
                  <tr 
                    key={msg.id} 
                    className={`hover:bg-gray-50 ${msg.status === 0 ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(msg.id)}
                        onChange={() => handleSelect(msg.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {msg.other_username || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-700">
                        <span className="mr-1">{typeInfo.icon}</span>
                        <span className="text-sm">{typeInfo.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {msg.status === 0 && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                        )}
                        <span className={`text-sm font-medium ${
                          msg.status === 0 ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {msg.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="text-sm text-gray-500 line-clamp-2 max-w-xs"
                        dangerouslySetInnerHTML={{ __html: msg.content || '暂无内容' }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(msg.create_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        msg.status === 0 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {msg.status === 0 ? '未读' : '已读'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleMarkAsRead(msg.id)}
                        disabled={msg.status === 1}
                        className="text-primary-600 hover:text-primary-900 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="标记已读"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
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

      {/* 分页 */}
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 发布消息模态框 */}
      {isSendModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">发布消息</h3>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    接收用户 <span className="text-red-500">*</span>
                  </label>
                  {allUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 border border-gray-300 rounded-lg bg-gray-50">
                      <p>正在加载用户列表...</p>
                      <p className="text-xs mt-1">如果没有显示用户，请检查网络连接</p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {allUsers.map(user => (
                          <label key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sendForm.user_ids.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSendForm(prev => ({
                                    ...prev,
                                    user_ids: [...prev.user_ids, user.id]
                                  }))
                                } else {
                                  setSendForm(prev => ({
                                    ...prev,
                                    user_ids: prev.user_ids.filter(id => id !== user.id)
                                  }))
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                            />
                            <span className="text-sm">{user.username}</span>
                            {user.nickname && (
                              <span className="text-xs text-gray-400">({user.nickname})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    已选择 {sendForm.user_ids.length} 个用户
                    {allUsers.length > 0 && `（共 ${allUsers.length} 个用户）`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消息类型
                  </label>
                  <select
                    value={sendForm.msg_type}
                    onChange={(e) => setSendForm(prev => ({ ...prev, msg_type: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>系统通知</option>
                    <option value={2}>业务提醒</option>
                    <option value={3}>私信</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消息标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sendForm.title}
                    onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入消息标题"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消息内容 <span className="text-red-500">*</span>
                  </label>
                  <div className="h-64 mb-12">
                    <ReactQuill
                      theme="snow"
                      value={sendForm.content}
                      onChange={(content) => setSendForm(prev => ({ ...prev, content }))}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 mr-3"
              >
                取消
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sending}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
              >
                <Send size={16} className="mr-2" />
                {sending ? '发送中...' : '发送消息'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList