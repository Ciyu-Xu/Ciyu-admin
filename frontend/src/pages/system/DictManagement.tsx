import { useState, useEffect } from 'react'
import { 
  Book, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  ChevronRight,
  ChevronDown,
  Database,
  X,
  CheckCircle2
} from 'lucide-react'
import { 
  getDictTypes,
  getDictDatas,
  createDictType,
  updateDictType,
  deleteDictType,
  createDictData,
  updateDictData,
  deleteDictData,
  type DictType,
  type DictData
} from '@/api/dict'
import { useToast } from '@/hooks/useToast'

const DictManagement = () => {
  const [dictTypes, setDictTypes] = useState<DictType[]>([])
  const [dictDatasMap, setDictDatasMap] = useState<Record<number, DictData[]>>({})
  const [expandedTypes, setExpandedTypes] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  
  const [dictTypeFilter, setDictTypeFilter] = useState('')
  const [dictLabelFilter, setDictLabelFilter] = useState('')
  
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [isDataModalOpen, setIsDataModalOpen] = useState(false)
  const [isEditType, setIsEditType] = useState(false)
  const toast = useToast()
  const [isEditData, setIsEditData] = useState(false)
  
  const [typeForm, setTypeForm] = useState({
    id: 0,
    dict_name: '',
    dict_type: '',
    status: 1
  })
  
  const [dataForm, setDataForm] = useState({
    id: 0,
    dict_id: 0,
    dict_label: '',
    dict_value: '',
    sort_order: 0,
    remark: '',
    status: 1
  })

  const loadDictTypes = async () => {
    setLoading(true)
    try {
      const result = await getDictTypes({})
      setDictTypes(result.rows)
      
      const datasMap: Record<number, DictData[]> = {}
      for (const type of result.rows) {
        const dataResult = await getDictDatas({ dict_type: type.dict_type })
        datasMap[type.id] = dataResult.rows
      }
      setDictDatasMap(datasMap)
    } catch (error) {
      console.error('加载字典失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDictTypes()
  }, [])

  const toggleExpand = (typeId: number) => {
    setExpandedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(typeId)) {
        newSet.delete(typeId)
      } else {
        newSet.add(typeId)
      }
      return newSet
    })
  }

  const handleOpenTypeModal = (dict?: DictType) => {
    if (dict) {
      setIsEditType(true)
      setTypeForm({
        id: dict.id,
        dict_name: dict.dict_name,
        dict_type: dict.dict_type,
        status: dict.status
      })
    } else {
      setIsEditType(false)
      setTypeForm({ id: 0, dict_name: '', dict_type: '', status: 1 })
    }
    setIsTypeModalOpen(true)
  }

  const handleSubmitType = async () => {
    if (!typeForm.dict_name.trim() || !typeForm.dict_type.trim()) {
      toast.warning('请填写完整信息')
      return
    }

    try {
      if (isEditType) {
        await updateDictType(typeForm.id, typeForm)
      } else {
        await createDictType(typeForm)
      }
      setIsTypeModalOpen(false)
      loadDictTypes()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  const handleDeleteType = async (id: number) => {
    try {
      await deleteDictType(id)
      loadDictTypes()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleOpenDataModal = (dictTypeId: number, data?: DictData) => {
    setDataForm(prev => ({ ...prev, dict_id: dictTypeId }))
    if (data) {
      setIsEditData(true)
      setDataForm({
        id: data.id,
        dict_id: data.dict_id,
        dict_label: data.dict_label,
        dict_value: data.dict_value,
        sort_order: data.sort_order,
        remark: data.remark || '',
        status: data.status
      })
    } else {
      setIsEditData(false)
      setDataForm({
        id: 0,
        dict_id: dictTypeId,
        dict_label: '',
        dict_value: '',
        sort_order: 0,
        remark: '',
        status: 1
      })
    }
    setIsDataModalOpen(true)
  }

  const handleSubmitData = async () => {
    if (!dataForm.dict_label.trim() || !dataForm.dict_value.trim()) {
      toast.warning('请填写完整信息')
      return
    }

    try {
      if (isEditData) {
        await updateDictData(dataForm.id, dataForm)
      } else {
        await createDictData({
          ...dataForm,
          dict_id: dataForm.dict_id
        })
      }
      setIsDataModalOpen(false)
      loadDictTypes()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  const handleDeleteData = async (dataId: number) => {
    try {
      await deleteDictData(dataId)
      loadDictTypes()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const filteredDictTypes = dictTypes.filter(type => {
    const matchName = !dictTypeFilter || type.dict_name.toLowerCase().includes(dictTypeFilter.toLowerCase())
    const matchType = !dictLabelFilter || type.dict_type.toLowerCase().includes(dictLabelFilter.toLowerCase())
    return matchName && matchType
  })

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">字典管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            统一管理系统字典类型和字典数据
          </p>
        </div>
        <button
          onClick={() => handleOpenTypeModal()}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
        >
          <Plus size={18} className="mr-2" />
          新增字典类型
        </button>
      </div>

      {/* 搜索工具栏 */}
      <div className="mb-4 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索字典名称..."
            value={dictTypeFilter}
            onChange={(e) => setDictTypeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索字典类型..."
            value={dictLabelFilter}
            onChange={(e) => setDictLabelFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* 字典列表 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : filteredDictTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Book size={48} className="mx-auto mb-2 text-gray-300" />
            <p>暂无字典数据</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDictTypes.map((type) => {
              const isExpanded = expandedTypes.has(type.id)
              const datas = dictDatasMap[type.id] || []
              
              return (
                <div key={type.id}>
                  {/* 字典类型行 */}
                  <div 
                    className="flex items-center px-6 py-4 hover:bg-gray-50 cursor-pointer bg-gray-50"
                    onClick={() => toggleExpand(type.id)}
                  >
                    <button className="mr-2 text-gray-400">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <Book size={18} className="mr-3 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium text-gray-900">{type.dict_name}</span>
                        <span className="text-sm text-gray-500">({type.dict_type})</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          type.status === 1 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {type.status === 1 ? '正常' : '停用'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {datas.length} 个数据项
                      </div>
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDataModal(type.id)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                        title="新增字典数据"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenTypeModal(type)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑字典类型"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="删除字典类型"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* 字典数据行 */}
                  {isExpanded && (
                    <div className="bg-white">
                      {datas.length === 0 ? (
                        <div className="px-6 py-4 text-center text-gray-400 text-sm">
                          暂无字典数据，点击上方 + 按钮添加
                        </div>
                      ) : (
                        datas.map((data) => (
                          <div 
                            key={data.id}
                            className="flex items-center px-6 py-3 pl-16 hover:bg-gray-50 border-t border-gray-100"
                          >
                            <Database size={16} className="mr-3 text-gray-400" />
                            <div className="flex-1 grid grid-cols-4 gap-4">
                              <div>
                                <span className="text-sm text-gray-600">标签：</span>
                                <span className="text-sm font-medium text-gray-900">{data.dict_label}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">值：</span>
                                <span className="text-sm text-gray-900">{data.dict_value}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">排序：</span>
                                <span className="text-sm text-gray-900">{data.sort_order}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">状态：</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  data.status === 1 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {data.status === 1 ? '正常' : '停用'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenDataModal(type.id, data)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="编辑"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteData(data.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 字典类型模态框 */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{isEditType ? '编辑字典类型' : '新增字典类型'}</h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                  value={typeForm.dict_name}
                  onChange={(e) => setTypeForm({ ...typeForm, dict_name: e.target.value })}
                  placeholder="例如：用户性别"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典类型 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={typeForm.dict_type}
                  onChange={(e) => setTypeForm({ ...typeForm, dict_type: e.target.value })}
                  placeholder="例如：sys_user_gender"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <select
                  value={typeForm.status}
                  onChange={(e) => setTypeForm({ ...typeForm, status: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>正常</option>
                  <option value={0}>停用</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 mr-3"
              >
                取消
              </button>
              <button
                onClick={handleSubmitType}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 字典数据模态框 */}
      {isDataModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{isEditData ? '编辑字典数据' : '新增字典数据'}</h3>
              <button onClick={() => setIsDataModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典标签 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dataForm.dict_label}
                  onChange={(e) => setDataForm({ ...dataForm, dict_label: e.target.value })}
                  placeholder="例如：男"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字典值 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dataForm.dict_value}
                  onChange={(e) => setDataForm({ ...dataForm, dict_value: e.target.value })}
                  placeholder="例如：0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  排序
                </label>
                <input
                  type="number"
                  value={dataForm.sort_order}
                  onChange={(e) => setDataForm({ ...dataForm, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注
                </label>
                <textarea
                  value={dataForm.remark}
                  onChange={(e) => setDataForm({ ...dataForm, remark: e.target.value })}
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
                  value={dataForm.status}
                  onChange={(e) => setDataForm({ ...dataForm, status: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>正常</option>
                  <option value={0}>停用</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setIsDataModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 mr-3"
              >
                取消
              </button>
              <button
                onClick={handleSubmitData}
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

export default DictManagement