import { useState } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { 
  getRoleList, 
  getRoleDetail, 
  createRole, 
  updateRole, 
  deleteRole,
  getAllMenus,
  type RoleItem,
  type RoleFormData,
  type MenuItem
} from '@/api/system/role'
import { useToast } from '@/hooks/useToast'

const RoleList = () => {
  const [searchForm, setSearchForm] = useState({
    role_name: '',
    role_key: '',
    status: ''
  })
  const [showSearch, setShowSearch] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [formData, setFormData] = useState<RoleFormData>({
    role_name: '',
    role_key: '',
    sort_order: 0,
    status: 1,
    data_scope: '1',
    menu_ids: []
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<number[]>([])
  const toast = useToast()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['roleList', searchForm, page, pageSize],
    queryFn: () => getRoleList({
      role_name: searchForm.role_name || undefined,
      role_key: searchForm.role_key || undefined,
      status: searchForm.status ? Number(searchForm.status) : undefined,
      page,
      page_size: pageSize,
    }),
  })

  const { data: menuData } = useQuery({
    queryKey: ['allMenus'],
    queryFn: getAllMenus,
    enabled: showModal,
  })

  const roles = data?.rows || []
  const total = data?.total || 0
  const menus = menuData || []

  const handleSearch = () => {
    setPage(1)
    refetch()
  }
  
  const handleReset = () => {
    setSearchForm({
      role_name: '',
      role_key: '',
      status: ''
    })
    setPage(1)
  }

  const handleAdd = () => {
    setModalMode('add')
    setFormData({
      role_name: '',
      role_key: '',
      sort_order: roles.length + 1,
      status: 1,
      data_scope: '1',
      menu_ids: []
    })
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = async (role: RoleItem) => {
    try {
      setModalMode('edit')
      const res = await getRoleDetail(role.id)
      if (res) {
        setFormData({
          id: role.id,
          role_name: res.role_name || '',
          role_key: res.role_key || '',
          sort_order: res.sort_order || 0,
          status: res.status || 1,
          data_scope: res.data_scope || '1',
          menu_ids: (res as any).menu_ids || []
        })
        const allKeys = (menus || []).flatMap((m: MenuItem) => [m.id, ...(m.children?.map((c: MenuItem) => c.id) || [])])
        setExpandedKeys(allKeys)
      }
      setFormError('')
      setShowModal(true)
    } catch (error) {
      toast.error('获取角色详情失败')
    }
  }
  
  const handleDelete = async (id: number) => {
    try {
      await deleteRole(id)
      toast.success('删除成功')
      refetch()
    } catch (error: any) {
      const msg = error?.response?.data?.detail
      toast.error(typeof msg === 'string' ? msg : '删除失败')
    }
  }

  const handleSubmit = async () => {
    if (!formData.role_name.trim()) {
      setFormError('角色名称不能为空')
      return
    }
    if (!formData.role_key.trim()) {
      setFormError('角色标识不能为空')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      if (modalMode === 'add') {
        await createRole({
          role_name: formData.role_name,
          role_key: formData.role_key,
          sort_order: formData.sort_order,
          status: formData.status,
          data_scope: formData.data_scope,
          menu_ids: formData.menu_ids
        })
        toast.success('创建成功')
      } else {
        await updateRole(formData.id!, {
          role_name: formData.role_name,
          role_key: formData.role_key,
          sort_order: formData.sort_order,
          status: formData.status,
          data_scope: formData.data_scope,
          menu_ids: formData.menu_ids
        })
        toast.success('更新成功')
      }
      setShowModal(false)
      refetch()
    } catch (error: any) {
      const msg = error?.response?.data?.detail
      setFormError(typeof msg === 'string' ? msg : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleExpand = (key: number) => {
    if (expandedKeys.includes(key)) {
      setExpandedKeys(expandedKeys.filter(k => k !== key))
    } else {
      setExpandedKeys([...expandedKeys, key])
    }
  }

  const handleParentCheck = (menu: MenuItem, checked: boolean) => {
    let newMenuIds = formData.menu_ids.filter(id => id !== menu.id)
    if (menu.children?.length) {
      const childIds = menu.children.map(c => c.id)
      newMenuIds = newMenuIds.filter(id => !childIds.includes(id))
    }
    if (checked) {
      newMenuIds.push(menu.id)
      if (menu.children?.length) {
        newMenuIds.push(...menu.children.map(c => c.id))
      }
    }
    setFormData({ ...formData, menu_ids: newMenuIds })
  }

  const isMenuChecked = (menu: MenuItem): boolean => {
    if (!menu.children?.length) return formData.menu_ids.includes(menu.id)
    const childIds = menu.children.map(c => c.id)
    return childIds.length > 0 && childIds.every(id => formData.menu_ids.includes(id))
  }

  const isMenuIndeterminate = (menu: MenuItem): boolean => {
    if (!menu.children?.length) return false
    const childIds = menu.children.map(c => c.id)
    const selectedCount = childIds.filter(id => formData.menu_ids.includes(id)).length
    return selectedCount > 0 && selectedCount < childIds.length
  }

  const renderMenuTree = (menuList: MenuItem[], level: number = 0): React.ReactNode[] => {
    const nodes: React.ReactNode[] = []
    for (const menu of menuList) {
      const hasChildren = menu.children && menu.children.length > 0
      const isExpanded = expandedKeys.includes(menu.id)
      const isChecked = isMenuChecked(menu)
      const isIndeterminate = isMenuIndeterminate(menu)

      nodes.push(
        <div key={menu.id} className="flex items-center py-1">
          <div style={{ width: `${level * 24}px` }} />
          {hasChildren && (
            <button 
              onClick={() => toggleExpand(menu.id)}
              className="p-1 hover:bg-gray-100 rounded mr-1"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <span className="w-6 mr-1" />}
          <input
            type="checkbox"
            checked={isChecked}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate
            }}
            onChange={(e) => handleParentCheck(menu, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">{menu.menu_name}</span>
          {menu.permission && (
            <span className="ml-2 text-xs text-gray-400">({String(menu.permission)})</span>
          )}
        </div>
      )
      
      if (hasChildren && isExpanded) {
        nodes.push(...renderMenuTree(menu.children!, level + 1))
      }
    }
    return nodes
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
        <p className="text-gray-600 mt-1">管理系统角色和权限配置</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
                <input
                  type="text"
                  value={searchForm.role_name}
                  onChange={(e) => setSearchForm({...searchForm, role_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入角色名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">角色标识</label>
                <input
                  type="text"
                  value={searchForm.role_key}
                  onChange={(e) => setSearchForm({...searchForm, role_key: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入角色标识"
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
      
      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色标识</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排序</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                roles.map((role: RoleItem) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{role.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{role.role_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.role_key}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.sort_order}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        role.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.status === 1 ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.create_time ? new Date(role.create_time).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(role)}
                          className="text-primary-600 hover:text-primary-900"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {role.id !== 1 && (
                          <button 
                            onClick={() => handleDelete(role.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {modalMode === 'add' ? '新增角色' : '编辑角色'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm mb-4">
                  {formError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    角色名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.role_name}
                    onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入角色名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    角色标识 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.role_key}
                    onChange={(e) => setFormData({...formData, role_key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如: system:user:list"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">显示顺序</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">数据权限</label>
                  <select
                    value={formData.data_scope}
                    onChange={(e) => setFormData({...formData, data_scope: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="1">全部数据权限</option>
                    <option value="2">本部门数据权限</option>
                    <option value="3">本部门及以下数据权限</option>
                    <option value="4">仅本人数据权限</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">菜单权限</label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {menus && menus.length > 0 ? (
                    renderMenuTree(menus)
                  ) : (
                    <div className="text-center text-gray-500 py-4">加载中...</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
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

export default RoleList
