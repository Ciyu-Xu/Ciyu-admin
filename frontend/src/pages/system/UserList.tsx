import { useState } from 'react'
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreHorizontal,
  RefreshCw,
  Download,
  Upload,
  X,
  ChevronDown
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getUserList, createUser, updateUser, deleteUser, batchDeleteUsers, type UserItem } from '@/api/system/user'
import { getRoleList } from '@/api/system/role'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { useToast } from '@/hooks/useToast'

interface UserFormData {
  id?: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  password: string
  role_ids: number[]
}

const UserList = () => {
  console.log('[UserList] 组件渲染')
  const [searchForm, setSearchForm] = useState({
    username: '',
    nickname: '',
    phone: '',
    status: ''
  })
  const [showSearch, setShowSearch] = useState(true)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    nickname: '',
    email: '',
    phone: '',
    status: 1,
    password: '',
    role_ids: []
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['userList', searchForm, page, pageSize],
    queryFn: () => getUserList({
      username: searchForm.username || undefined,
      nickname: searchForm.nickname || undefined,
      phone: searchForm.phone || undefined,
      status: searchForm.status ? Number(searchForm.status) : undefined,
      page,
      page_size: pageSize,
    }),
  })

  const { data: roleData, error: roleError } = useQuery({
    queryKey: ['roleList'],
    queryFn: async () => {
      console.log('[角色查询] 开始获取角色列表')
      try {
        const result = await getRoleList({ page: 1, page_size: 100 })
        console.log('[角色查询] API返回结果:', result)
        console.log('[角色查询] 返回的data:', result?.data)
        console.log('[角色查询] 返回的rows:', result?.data?.rows)
        return result
      } catch (error) {
        console.error('[角色查询] API调用失败:', error)
        throw error
      }
    },
  })

  const users = data?.rows || []
  const total = data?.total || 0
  const roles = roleData?.rows || []
  
  console.log('[UserList] 当前roles状态:', roles)
  if (roleError) {
    console.error('[UserList] 角色查询错误:', roleError)
  }

  const handleSearch = () => {
    setPage(1)
    refetch()
  }
  
  const handleReset = () => {
    setSearchForm({
      username: '',
      nickname: '',
      phone: '',
      status: ''
    })
    setPage(1)
  }

  const handleAdd = () => {
    console.log('[handleAdd] 开始执行')
    console.log('[handleAdd] 当前角色数据:', roleData)
    console.log('[handleAdd] 角色列表:', roles)
    setModalMode('add')
    setFormData({
      username: '',
      nickname: '',
      email: '',
      phone: '',
      status: 1,
      password: '',
      role_ids: []
    })
    setFormError('')
    setShowRoleDropdown(false)
    console.log('[handleAdd] 设置showModal为true')
    setShowModal(true)
    console.log('[handleAdd] 执行完成')
  }

  const handleEdit = (user: UserItem) => {
    console.log('[handleEdit] 开始执行, 用户:', user)
    console.log('[handleEdit] 用户关联的角色:', user.role_ids)
    console.log('[handleEdit] 角色列表:', roles)
    setModalMode('edit')
    setFormData({
      id: user.id,
      username: user.username,
      nickname: user.nickname || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status,
      password: '',
      role_ids: user.role_ids || []
    })
    setFormError('')
    setShowRoleDropdown(false)
    console.log('[handleEdit] 设置showModal为true')
    setShowModal(true)
    console.log('[handleEdit] 执行完成')
  }
  
  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id)
      toast.success('删除成功')
      refetch()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '删除失败')
    }
  }
  
  const handleBatchDelete = async () => {
    try {
      await batchDeleteUsers(selectedRows)
      toast.success('批量删除成功')
      setSelectedRows([])
      refetch()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '批量删除失败')
    }
  }

  const handleImport = () => {
    toast.info('导入功能开发中...')
  }

  const handleExport = () => {
    toast.info('导出功能开发中...')
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      setFormError('用户名不能为空')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      const submitData = {
        username: formData.username,
        nickname: formData.nickname,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        role_ids: formData.role_ids,
        ...(formData.password && { password: formData.password })
      }

      if (modalMode === 'add') {
        await createUser(submitData)
        toast.success('创建成功')
      } else {
        await updateUser(formData.id!, submitData)
        toast.success('更新成功')
      }
      setShowModal(false)
      refetch()
    } catch (error: any) {
      setFormError(error?.response?.data?.detail || '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleRoleSelection = (roleId: number) => {
    if (formData.role_ids.includes(roleId)) {
      setFormData({
        ...formData,
        role_ids: formData.role_ids.filter(id => id !== roleId)
      })
    } else {
      setFormData({
        ...formData,
        role_ids: [...formData.role_ids, roleId]
      })
    }
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === users.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(users.map(u => u.id))
    }
  }
  
  const toggleSelect = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-1">管理系统用户账号信息</p>
        </div>
      </div>
      
      {/* 搜索区域 */}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input
                  type="text"
                  value={searchForm.username}
                  onChange={(e) => setSearchForm({...searchForm, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={searchForm.nickname}
                  onChange={(e) => setSearchForm({...searchForm, nickname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入昵称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                <input
                  type="text"
                  value={searchForm.phone}
                  onChange={(e) => setSearchForm({...searchForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入手机号"
                />
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
      
      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button 
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增
          </button>
          {selectedRows.length > 0 && (
            <button 
              onClick={handleBatchDelete}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除 ({selectedRows.length})
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleImport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            导入
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
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
      
      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">昵称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                users.map((user: UserItem) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.nickname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.roles?.map((role, index) => (
                        <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {role.role_name}{index < (user.roles?.length || 0) - 1 ? ', ' : ''}
                        </span>
                      )) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 1 ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.create_time ? new Date(user.create_time).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="text-primary-600 hover:text-primary-900"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600" title="更多">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页 */}
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

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-medium">
                {modalMode === 'add' ? '新增用户' : '编辑用户'}
              </h3>
              <button 
                onClick={() => {
                  setShowRoleDropdown(false)
                  setShowModal(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="请输入用户名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalMode === 'add' ? '密码 ' : '新密码 '}
                  {modalMode === 'edit' && <span className="text-gray-400 text-xs">(不填则保持原密码)</span>}
                  {modalMode === 'add' && <span className="text-gray-400 text-xs">(留空使用系统默认密码)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={modalMode === 'add' ? '留空使用系统默认密码' : '请输入新密码(留空保持不变)'}
                />
                {formData.password && modalMode === 'add' && (
                  <div className="mt-2">
                    <PasswordStrengthIndicator password={formData.password} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入昵称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入邮箱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入手机号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={1}>启用</option>
                  <option value={0}>禁用</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      console.log('[角色选择] 点击按钮, 当前showRoleDropdown:', showRoleDropdown)
                      console.log('[角色选择] 当前formData.role_ids:', formData.role_ids)
                      console.log('[角色选择] 可选角色列表:', roles)
                      setShowRoleDropdown(!showRoleDropdown)
                      console.log('[角色选择] 设置后的showRoleDropdown:', !showRoleDropdown)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-left flex items-center justify-between"
                  >
                    <span className="text-gray-600">
                      {formData.role_ids.length > 0 
                        ? roles.filter(r => formData.role_ids.includes(r.id)).map(r => r.role_name).join(', ')
                        : '请选择角色'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showRoleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="max-h-48 overflow-y-auto">
                        {roles.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500 text-sm">暂无角色数据</div>
                        ) : (
                          roles.map((role) => (
                            <label 
                              key={role.id} 
                              className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${formData.role_ids.includes(role.id) ? 'bg-blue-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.role_ids.includes(role.id)}
                                onChange={() => {
                                  console.log('[角色选择] 选择/取消角色:', role.role_name, 'id:', role.id)
                                  toggleRoleSelection(role.id)
                                }}
                                className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-gray-700">{role.role_name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowRoleDropdown(false)
                  setShowModal(false)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? '提交中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserList
