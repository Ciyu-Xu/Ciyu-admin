import { useState, useEffect } from 'react'
import { 
  Book, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { 
  getDictTypes,
  createDictType,
  updateDictType,
  deleteDictType,
  type DictType
} from '@/api/dict'

const DictTypeList = () => {
  const [dictTypes, setDictTypes] = useState<DictType[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [dictName, setDictName] = useState('')
  const [dictType, setDictType] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)

  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState({
    id: 0,
    dict_name: '',
    dict_type: '',
    status: 1
  })

  const loadDictTypes = async () => {
    setLoading(true)
    try {
      const result = await getDictTypes({ 
        page, 
        page_size: pageSize,
        dict_name: dictName || undefined,
        dict_type: dictType || undefined,
        status
      })
      setDictTypes(result.rows)
      setTotal(result.total)
    } catch (error) {
      console.error('加载字典类型失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDictTypes()
  }, [page, status])

  const handleSearch = () => {
    setPage(1)
    loadDictTypes()
  }

  const handleOpenModal = (dict?: DictType) => {
    if (dict) {
      setIsEdit(true)
      setForm({
        id: dict.id,
        dict_name: dict.dict_name,
        dict_type: dict.dict_type,
        status: dict.status
      })
    } else {
      setIsEdit(false)
      setForm({ id: 0, dict_name: '', dict_type: '', status: 1 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.dict_name.trim() || !form.dict_type.trim()) {
      toast.warning('请填写完整信息')
      return
    }

    try {
      if (isEdit) {
        await updateDictType(form.id, form)
        toast.success('更新成功')
      } else {
        await createDictType(form)
        toast.success('创建成功')
      }
      setIsModalOpen(false)
      loadDictTypes()
    } catch (error) {
      toast.error('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDictType(id)
      toast.success('删除成功')
      loadDictTypes()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">字典类型</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理系统的字典类型
        </p>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="字典名称"
              value={dictName}
              onChange={(e) => setDictName(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="字典类型"
              value={dictType}
              onChange={(e) => setDictType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
          >
            <Search size={16} className="mr-2" />
            搜索
          </button>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
        >
          <Plus size={18} className="mr-2" />
          新增
        </button>
      </div>

      {/* 筛选 */}
      <div className="mb-4 flex items-center space-x-4">
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value === '' ? undefined : Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="0">停用</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : dictTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Book size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无数据</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  字典名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  字典类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dictTypes.map((dict) => (
                <tr key={dict.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {dict.dict_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {dict.dict_type}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      dict.status === 1 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {dict.status === 1 ? '正常' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {dict.create_time}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(dict)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(dict.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {total} 条记录
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 页
            </span>
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

      {/* 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{isEdit ? '编辑字典类型' : '新增字典类型'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.dict_name}
                  onChange={(e) => setForm({ ...form, dict_name: e.target.value })}
                  placeholder="请输入字典名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典类型 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.dict_type}
                  onChange={(e) => setForm({ ...form, dict_type: e.target.value })}
                  placeholder="请输入字典类型标识"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>正常</option>
                  <option value={0}>停用</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 mr-3"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DictTypeList