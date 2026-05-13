import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, X } from 'lucide-react'
import { getDeptTree, getDept, createDept, updateDept, deleteDept } from '@/api/system/dept'
import { useToast } from '@/hooks/useToast'

interface Dept {
  id: number
  dept_name: string
  parent_id: number
  sort_order: number
  leader?: string
  phone?: string
  email?: string
  status: number
  children?: Dept[]
}

interface DeptFormData {
  dept_name: string
  parent_id: number
  sort_order: number
  leader: string
  phone: string
  email: string
  status: number
}

const emptyForm: DeptFormData = {
  dept_name: '',
  parent_id: 0,
  sort_order: 0,
  leader: '',
  phone: '',
  email: '',
  status: 1
}

const DeptList = () => {
  const [expandedKeys, setExpandedKeys] = useState<number[]>([])
  const [deptData, setDeptData] = useState<Dept[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [currentDept, setCurrentDept] = useState<Dept | null>(null)
  const [formData, setFormData] = useState<DeptFormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DeptFormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadDeptTree()
  }, [])

  const loadDeptTree = async () => {
    setLoading(true)
    try {
      const res: any = await getDeptTree()
      setDeptData(res || [])
      if (res && res.length > 0) {
        setExpandedKeys([res[0].id])
      }
    } catch (error) {
      toast.error('加载部门数据失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: number) => {
    if (expandedKeys.includes(id)) {
      setExpandedKeys(expandedKeys.filter(key => key !== id))
    } else {
      setExpandedKeys([...expandedKeys, id])
    }
  }

  const getAllDepts = (depts: Dept[]): Dept[] => {
    let result: Dept[] = []
    for (const dept of depts) {
      result.push(dept)
      if (dept.children && dept.children.length > 0) {
        result = result.concat(getAllDepts(dept.children))
      }
    }
    return result
  }

  const openCreateModal = (parentId: number = 0) => {
    setModalMode('create')
    setCurrentDept(null)
    setFormData({ ...emptyForm, parent_id: parentId })
    setFormErrors({})
    setModalVisible(true)
  }

  const openEditModal = async (dept: Dept) => {
    setModalMode('edit')
    setCurrentDept(dept)
    setFormData({
      dept_name: dept.dept_name,
      parent_id: dept.parent_id,
      sort_order: dept.sort_order,
      leader: dept.leader || '',
      phone: dept.phone || '',
      email: dept.email || '',
      status: dept.status
    })
    setFormErrors({})
    setModalVisible(true)
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof DeptFormData, string>> = {}

    if (!formData.dept_name.trim()) {
      errors.dept_name = '请输入部门名称'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入正确的邮箱格式'
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入正确的手机号'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createDept(formData)
        toast.success('创建成功')
      } else if (currentDept) {
        await updateDept(currentDept.id, formData)
        toast.success('更新成功')
      }
      setModalVisible(false)
      loadDeptTree()
    } catch (error: any) {
      toast.error('操作失败', error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (dept: Dept) => {
    if (dept.children && dept.children.length > 0) {
      toast.warning('该部门存在子部门，无法删除')
      return
    }

    try {
      await deleteDept(dept.id)
      toast.success('删除成功')
      loadDeptTree()
    } catch (error: any) {
      toast.error('删除失败', error.message)
    }
  }

  const handleStatusChange = async (dept: Dept) => {
    const newStatus = dept.status === 1 ? 0 : 1
    const action = newStatus === 1 ? '启用' : '停用'

    try {
      await updateDept(dept.id, { ...dept, status: newStatus })
      toast.success(`${action}成功`)
      loadDeptTree()
    } catch (error: any) {
      toast.error('操作失败', error.message)
    }
  }

  const renderDeptRows = (dept: Dept, level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = []
    const isExpanded = expandedKeys.includes(dept.id)
    const hasChildren = dept.children && dept.children.length > 0

    rows.push(
      <tr key={dept.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(dept.id)}
                className="mr-2 p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 mr-2"></span>
            )}
            {dept.dept_name}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.leader || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.phone || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.email || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.sort_order}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => handleStatusChange(dept)}
            className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
              dept.status === 1
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            {dept.status === 1 ? '启用' : '禁用'}
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button
              onClick={() => openCreateModal(dept.id)}
              className="text-green-600 hover:text-green-900"
              title="添加子部门"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openEditModal(dept)}
              className="text-primary-600 hover:text-primary-900"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(dept)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )

    if (hasChildren && isExpanded) {
      dept.children!.forEach((child: Dept) => {
        rows.push(...renderDeptRows(child, level + 1))
      })
    }

    return rows
  }

  const allDepts = getAllDepts(deptData)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">部门管理</h1>
        <p className="text-gray-600 mt-1">管理组织架构和部门信息</p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => openCreateModal(0)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增
        </button>
        <button
          onClick={loadDeptTree}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          刷新
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                部门名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                负责人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                联系电话
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                邮箱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                排序
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : deptData.length > 0 ? (
              deptData.map((dept) => renderDeptRows(dept))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {modalMode === 'create' ? '新增部门' : '编辑部门'}
              </h3>
              <button
                onClick={() => setModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  部门名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dept_name}
                  onChange={(e) => setFormData({ ...formData, dept_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    formErrors.dept_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="请输入部门名称"
                />
                {formErrors.dept_name && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.dept_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">父部门</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={0}>无（顶级部门）</option>
                  {allDepts
                    .filter(d => !currentDept || d.id !== currentDept.id)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {'　'.repeat(dept.parent_id > 0 ? 1 : 0)}{dept.dept_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                  <input
                    type="text"
                    value={formData.leader}
                    onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入负责人"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入手机号"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={1}>启用</option>
                    <option value={0}>禁用</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="请输入邮箱"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeptList
