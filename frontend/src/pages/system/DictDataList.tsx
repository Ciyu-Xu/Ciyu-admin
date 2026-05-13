import { useState, useEffect } from 'react'
import { 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Book
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { 
  getDictDatas,
  getDictType,
  createDictData,
  updateDictData,
  deleteDictData,
  getDictOptionSelect,
  type DictData,
  type DictOption
} from '@/api/dict'

const DictDataList = () => {
  const [dictDatas, setDictDatas] = useState<DictData[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [dictTypeFilter, setDictTypeFilter] = useState('')
  const [dictLabel, setDictLabel] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  
  const toast = useToast()
  const [dictTypes, setDictTypes] = useState<DictOption[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState({
    id: 0,
    dict_id: 0,
    dict_label: '',
    dict_value: '',
    sort_order: 0,
    remark: '',
    status: 1
  })

  const loadDictTypes = async () => {
    try {
      const result = await getDictOptionSelect()
      setDictTypes(result)
    } catch (error) {
      console.error('加载字典类型失败:', error)
    }
  }

  const loadDictDatas = async () => {
    setLoading(true)
    try {
      const result = await getDictDatas({ 
        page, 
        page_size: pageSize,
        dict_type: dictTypeFilter || undefined,
        dict_label: dictLabel || undefined,
        status
      })
      setDictDatas(result.rows)
      setTotal(result.total)
    } catch (error) {
      console.error('加载字典数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDictTypes()
  }, [])

  useEffect(() => {
    loadDictDatas()
  }, [page, status, dictTypeFilter])

  const handleSearch = () => {
    setPage(1)
    loadDictDatas()
  }

  const handleOpenModal = async (dictData?: DictData) => {
    await loadDictTypes()
    if (dictData) {
      setIsEdit(true)
      setForm({
        id: dictData.id,
        dict_id: dictData.dict_id,
        dict_label: dictData.dict_label,
        dict_value: dictData.dict_value,
        sort_order: dictData.sort_order,
        remark: dictData.remark || '',
        status: dictData.status
      })
    } else {
      setIsEdit(false)
      setForm({ id: 0, dict_id: 0, dict_label: '', dict_value: '', sort_order: 0, remark: '', status: 1 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.dict_id) {
      toast.warning('请选择字典类型')
      return
    }
    if (!form.dict_label.trim() || !form.dict_value.trim()) {
      toast.warning('请填写完整信息')
      return
    }

    try {
      if (isEdit) {
        await updateDictData(form.id, form)
        toast.success('更新成功')
      } else {
        await createDictData(form)
        toast.success('创建成功')
      }
      setIsModalOpen(false)
      loadDictDatas()
    } catch (error) {
      toast.error('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDictData(id)
      toast.success('删除成功')
      loadDictDatas()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const getDictTypeName = (dictId: number) => {
    const dt = dictTypes.find(d => d.id === dictId)
    return dt ? dt.dictLabel : dictId.toString()
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">字典数据</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理系统的字典数据
        </p>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={dictTypeFilter}
            onChange={(e) => setDictTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部字典类型</option>
            {dictTypes.map(dt => (
              <option key={dt.id} value={dt.dictType}>{dt.dictLabel}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="字典标签"
            value={dictLabel}
            onChange={(e) => setDictLabel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
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
        ) : dictDatas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无数据</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  字典类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  字典标签
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  字典值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  排序
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  备注
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dictDatas.map((dict) => (
                <tr key={dict.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {getDictTypeName(dict.dict_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {dict.dict_label}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {dict.dict_value}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {dict.sort_order}
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
                    {dict.remark || '-'}
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
              <h3 className="text-lg font-medium">{isEdit ? '编辑字典数据' : '新增字典数据'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.dict_id}
                  onChange={(e) => setForm({ ...form, dict_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={0}>请选择字典类型</option>
                  {dictTypes.map(dt => (
                    <option key={dt.id} value={dt.id}>{dt.dictLabel} ({dt.dictType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典标签 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.dict_label}
                  onChange={(e) => setForm({ ...form, dict_label: e.target.value })}
                  placeholder="请输入字典标签"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典值 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.dict_value}
                  onChange={(e) => setForm({ ...form, dict_value: e.target.value })}
                  placeholder="请输入字典值"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  排序
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注
                </label>
                <textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder="请输入备注"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状态
                </label>
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

export default DictDataList