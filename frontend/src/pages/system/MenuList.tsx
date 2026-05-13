import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, RefreshCw, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getMenuList, 
  getMenuDetail,
  createMenu, 
  updateMenu,
  deleteMenu, 
  type MenuItem,
  type MenuFormData
} from '@/api/system/menu'
import { useToast } from '@/hooks/useToast'

const menuTypeOptions = [
  { value: 'M', label: '目录' },
  { value: 'C', label: '菜单' },
  { value: 'F', label: '按钮' },
]

const emptyForm: MenuFormData = {
  menu_name: '',
  path: '',
  component: '',
  icon: '',
  parent_id: 0,
  sort_order: 0,
  menu_type: 'C',
  permission: '',
  status: 1,
  visible: 1,
  is_frame: 0,
  is_cache: 0,
}

const MenuList = () => {
  const [expandedKeys, setExpandedKeys] = useState<number[]>([])
  const [searchForm, setSearchForm] = useState({
    menu_name: '',
    status: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [formData, setFormData] = useState<MenuFormData>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuOptions, setMenuOptions] = useState<MenuItem[]>([])
  
  const queryClient = useQueryClient()
  const toast = useToast()
  
  const { data: menus, isLoading, refetch } = useQuery({
    queryKey: ['menuList', searchForm],
    queryFn: () => getMenuList({
      menu_name: searchForm.menu_name || undefined,
      status: searchForm.status ? Number(searchForm.status) : undefined
    }),
  })

  // 加载所有菜单（用于父级菜单选择）
  useEffect(() => {
    const loadMenuOptions = async () => {
      try {
        const res = await getMenuList()
        setMenuOptions(res || [])
      } catch (error) {
        console.error('加载菜单选项失败')
      }
    }
    loadMenuOptions()
  }, [])

  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuList'] })
      toast.success('删除成功')
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || '删除失败'
      toast.error(msg)
    }
  })

  const toggleExpand = (id: number) => {
    if (expandedKeys.includes(id)) {
      setExpandedKeys(expandedKeys.filter(key => key !== id))
    } else {
      setExpandedKeys([...expandedKeys, id])
    }
  }

  const handleSearch = () => {
    refetch()
  }

  const handleReset = () => {
    setSearchForm({ menu_name: '', status: '' })
    refetch()
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleAdd = () => {
    setModalMode('add')
    setFormData(emptyForm)
    setEditingId(null)
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = async (menu: MenuItem) => {
    setModalMode('edit')
    setEditingId(menu.id)
    setFormError('')
    try {
      const detail = await getMenuDetail(menu.id)
      setFormData({
        menu_name: detail.menu_name,
        path: detail.path || '',
        component: detail.component || '',
        icon: detail.icon || '',
        parent_id: detail.parent_id,
        sort_order: detail.sort_order,
        menu_type: detail.menu_type,
        permission: detail.permission || '',
        status: detail.status,
        visible: detail.visible,
        is_frame: detail.is_frame,
        is_cache: detail.is_cache,
      })
      setShowModal(true)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '获取菜单详情失败')
    }
  }

  // 展开所有节点（为了让父级菜单选择器能看到所有选项）
  const expandAll = (items: MenuItem[] | undefined) => {
    if (!items) return []
    const keys: number[] = []
    const walk = (list: MenuItem[]) => {
      list.forEach(item => {
        keys.push(item.id)
        if (item.children && item.children.length > 0) {
          walk(item.children)
        }
      })
    }
    walk(items)
    return keys
  }

  // 获取展开后的菜单树（用于父级菜单选择器）
  const getFlattenMenus = (items: MenuItem[] | undefined, level = 0): (MenuItem & { _level: number })[] => {
    if (!items) return []
    let result: (MenuItem & { _level: number })[] = []
    for (const item of items) {
      result.push({ ...item, _level: level })
      if (item.children && item.children.length > 0) {
        result = result.concat(getFlattenMenus(item.children, level + 1))
      }
    }
    return result
  }

  const validateForm = (): boolean => {
    if (!formData.menu_name.trim()) {
      setFormError('菜单名称不能为空')
      return false
    }
    if (!formData.menu_type) {
      setFormError('请选择菜单类型')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setFormError('')

    try {
      if (modalMode === 'add') {
        await createMenu(formData)
        toast.success('创建成功')
      } else if (editingId) {
        await updateMenu(editingId, formData)
        toast.success('更新成功')
      }
      setShowModal(false)
      queryClient.invalidateQueries({ queryKey: ['menuList'] })
    } catch (error: any) {
      setFormError(error?.response?.data?.detail || error.message || '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMenuRows = (menu: MenuItem, level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = []
    const isExpanded = expandedKeys.includes(menu.id)
    const hasChildren = menu.children && menu.children.length > 0

    rows.push(
      <tr key={menu.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren && (
              <button 
                onClick={() => toggleExpand(menu.id)}
                className="mr-2 p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {!hasChildren && <span className="w-6 mr-2"></span>}
            {menu.menu_name}
            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {menu.menu_type === 'M' ? '目录' : menu.menu_type === 'C' ? '菜单' : '按钮'}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{menu.path || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{menu.component || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{menu.icon || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{menu.sort_order}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            menu.status === 1 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {menu.status === 1 ? '启用' : '禁用'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(menu)}
              className="text-primary-600 hover:text-primary-900"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleDelete(menu.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )

    if (hasChildren && isExpanded) {
      menu.children.forEach((child) => {
        rows.push(...renderMenuRows(child, level + 1))
      })
    }

    return rows
  }

  return (
    <div className="space-y-4">
      {/* 搜索区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">菜单名称</label>
              <input
                type="text"
                value={searchForm.menu_name}
                onChange={(e) => setSearchForm({...searchForm, menu_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="请输入菜单名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={searchForm.status}
                onChange={(e) => setSearchForm({...searchForm, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部</option>
                <option value="1">启用</option>
                <option value="0">禁用</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                重置
              </button>
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">菜单管理</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => refetch()}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增菜单
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">菜单名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">路由路径</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">组件路径</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">图标</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排序</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : menus && menus.length > 0 ? (
              menus.flatMap(menu => renderMenuRows(menu))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑/新增弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-medium">
                {modalMode === 'add' ? '新增菜单' : '编辑菜单'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    菜单名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.menu_name}
                    onChange={(e) => setFormData({...formData, menu_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入菜单名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    菜单类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.menu_type}
                    onChange={(e) => setFormData({...formData, menu_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {menuTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">父级菜单</label>
                <select
                  value={formData.parent_id || 0}
                  onChange={(e) => setFormData({...formData, parent_id: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={0}>顶级菜单</option>
                  {getFlattenMenus(menuOptions).filter(m => m.id !== editingId).map(menu => (
                    <option key={menu.id} value={menu.id}>
                      {'　'.repeat(menu._level)}{menu.menu_name}
                      {menu.menu_type === 'M' ? ' (目录)' : menu.menu_type === 'C' ? ' (菜单)' : ' (按钮)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">路由路径</label>
                  <input
                    type="text"
                    value={formData.path || ''}
                    onChange={(e) => setFormData({...formData, path: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：/system/menu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">组件路径</label>
                  <input
                    type="text"
                    value={formData.component || ''}
                    onChange={(e) => setFormData({...formData, component: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：system/MenuList"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                  <input
                    type="text"
                    value={formData.icon || ''}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：folder-tree"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">权限标识</label>
                  <input
                    type="text"
                    value={formData.permission || ''}
                    onChange={(e) => setFormData({...formData, permission: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：system:menu:list"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">是否可见</label>
                  <select
                    value={formData.visible}
                    onChange={(e) => setFormData({...formData, visible: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={1}>显示</option>
                    <option value={0}>隐藏</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">是否外链</label>
                  <select
                    value={formData.is_frame}
                    onChange={(e) => setFormData({...formData, is_frame: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">是否缓存</label>
                  <select
                    value={formData.is_cache}
                    onChange={(e) => setFormData({...formData, is_cache: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={0}>否</option>
                    <option value={1}>是</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
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

export default MenuList
