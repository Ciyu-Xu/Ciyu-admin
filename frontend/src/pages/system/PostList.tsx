import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, RefreshCw, X } from 'lucide-react'
import { getPostList, createPost, updatePost, deletePost, changePostStatus, PostItem, PostFormData } from '@/api/system/post'
import { useToast } from '@/hooks/useToast'
import { getDeptTree, Dept } from '@/api/system/dept'

const emptyForm: PostFormData = {
  post_name: '',
  post_code: '',
  dept_id: null,
  sort_order: 0,
  status: 1
}

const PostList = () => {
  const [searchForm, setSearchForm] = useState({
    post_name: '',
    post_code: '',
    dept_id: '',
    status: ''
  })
  const [posts, setPosts] = useState<PostItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [currentPost, setCurrentPost] = useState<PostItem | null>(null)
  const [formData, setFormData] = useState<PostFormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PostFormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [deptOptions, setDeptOptions] = useState<Dept[]>([])
  const toast = useToast()

  useEffect(() => {
    loadDepts()
  }, [])

  useEffect(() => {
    loadPosts()
  }, [page, pageSize])

  const loadDepts = async () => {
    try {
      const res: any = await getDeptTree()
      const flattenDepts = (depts: Dept[], level = 0): Dept[] => {
        let result: Dept[] = []
        for (const dept of depts) {
          result.push({ ...dept, _level: level })
          if (dept.children && dept.children.length > 0) {
            result = result.concat(flattenDepts(dept.children, level + 1))
          }
        }
        return result
      }
      setDeptOptions(flattenDepts(res || []))
    } catch (error) {
      console.error('加载部门失败')
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res: any = await getPostList({
        post_name: searchForm.post_name || undefined,
        post_code: searchForm.post_code || undefined,
        dept_id: searchForm.dept_id ? Number(searchForm.dept_id) : undefined,
        status: searchForm.status !== '' ? Number(searchForm.status) : undefined,
        page,
        page_size: pageSize
      })
      setPosts(res.rows || [])
      setTotal(res.total || 0)
    } catch (error) {
      toast.error('加载岗位数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadPosts()
  }

  const handleReset = () => {
    setSearchForm({ post_name: '', post_code: '', dept_id: '', status: '' })
    setPage(1)
    loadPosts()
  }

  const openCreateModal = () => {
    setModalMode('create')
    setCurrentPost(null)
    setFormData(emptyForm)
    setFormErrors({})
    setModalVisible(true)
  }

  const openEditModal = (post: PostItem) => {
    setModalMode('edit')
    setCurrentPost(post)
    setFormData({
      post_name: post.post_name,
      post_code: post.post_code,
      dept_id: post.dept_id,
      sort_order: post.sort_order,
      status: post.status
    })
    setFormErrors({})
    setModalVisible(true)
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PostFormData, string>> = {}

    if (!formData.post_name.trim()) {
      errors.post_name = '请输入岗位名称'
    }

    if (!formData.post_code.trim()) {
      errors.post_code = '请输入岗位编码'
    } else if (!/^[A-Z0-9_]+$/.test(formData.post_code)) {
      errors.post_code = '岗位编码只能包含大写字母、数字和下划线'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const submitData = {
        ...formData,
        dept_id: formData.dept_id || null
      }
      if (modalMode === 'create') {
        await createPost(submitData)
        toast.success('创建成功')
      } else if (currentPost) {
        await updatePost(currentPost.id, submitData)
        toast.success('更新成功')
      }
      setModalVisible(false)
      loadPosts()
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (post: PostItem) => {
    try {
      await deletePost(post.id)
      toast.success('删除成功')
      loadPosts()
    } catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  const handleStatusChange = async (post: PostItem) => {
    const newStatus = post.status === 1 ? 0 : 1
    const action = newStatus === 1 ? '启用' : '停用'

    try {
      await changePostStatus(post.id, newStatus)
      toast.success(`${action}成功`)
      loadPosts()
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === posts.length && posts.length > 0) {
      setSelectedRows([])
    } else {
      setSelectedRows(posts.map(p => p.id))
    }
  }

  const toggleSelect = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const getDeptName = (deptId: number | null | undefined) => {
    if (!deptId) return '-'
    const dept = deptOptions.find(d => d.id === deptId)
    return dept?.dept_name || '-'
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">岗位管理</h1>
        <p className="text-gray-600 mt-1">管理系统岗位信息</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">岗位名称</label>
            <input
              type="text"
              value={searchForm.post_name}
              onChange={(e) => setSearchForm({ ...searchForm, post_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入岗位名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">岗位编码</label>
            <input
              type="text"
              value={searchForm.post_code}
              onChange={(e) => setSearchForm({ ...searchForm, post_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入岗位编码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所属部门</label>
            <select
              value={searchForm.dept_id}
              onChange={(e) => setSearchForm({ ...searchForm, dept_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              {deptOptions.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {'　'.repeat((dept as any)._level || 0)}{dept.dept_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              value={searchForm.status}
              onChange={(e) => setSearchForm({ ...searchForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              搜索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={async () => {
                for (const id of selectedRows) {
                  try {
                    await deletePost(id)
                  } catch (error) {
                    console.error(`删除岗位 ${id} 失败`)
                  }
                }
                toast.success('批量删除完成')
                setSelectedRows([])
                loadPosts()
              }}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除 ({selectedRows.length})
            </button>
          )}
        </div>
        <button
          onClick={loadPosts}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={posts.length > 0 && selectedRows.length === posts.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位编码</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属部门</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">显示顺序</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{post.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{post.post_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.post_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.dept_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.sort_order}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusChange(post)}
                      className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                        post.status === 1
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {post.status === 1 ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.create_time ? post.create_time.split('T')[0] : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(post)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="text-red-600 hover:text-red-900"
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

      {total > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg px-6 py-4">
          <div className="text-sm text-gray-500">
            共 {total} 条记录，每页显示
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="mx-2 px-2 py-1 border border-gray-300 rounded"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              首页
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              末页
            </button>
          </div>
        </div>
      )}

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {modalMode === 'create' ? '新增岗位' : '编辑岗位'}
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
                  岗位名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.post_name}
                  onChange={(e) => setFormData({ ...formData, post_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    formErrors.post_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="请输入岗位名称"
                />
                {formErrors.post_name && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.post_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  岗位编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.post_code}
                  onChange={(e) => setFormData({ ...formData, post_code: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    formErrors.post_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="如：ENGINEER、MANAGER"
                />
                {formErrors.post_code && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.post_code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                <select
                  value={formData.dept_id || ''}
                  onChange={(e) => setFormData({ ...formData, dept_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">无（通用岗位）</option>
                  {deptOptions.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {'　'.repeat((dept as any)._level || 0)}{dept.dept_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

export default PostList
