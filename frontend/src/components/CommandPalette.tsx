import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, User, Shield, FolderTree, Building2, Briefcase, Bell, Book, Settings, Users, Activity, Clock, LogIn, FileText, Volume2, Code } from 'lucide-react'
import { useTabStore } from '@/stores/tabs'

interface CommandItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  group: string
}

const iconMap: Record<string, React.ReactNode> = {
  'home': <Home size={16} />,
  'user': <User size={16} />,
  'shield': <Shield size={16} />,
  'folder-tree': <FolderTree size={16} />,
  'building': <Building2 size={16} />,
  'briefcase': <Briefcase size={16} />,
  'bell': <Bell size={16} />,
  'book': <Book size={16} />,
  'settings': <Settings size={16} />,
  'users': <Users size={16} />,
  'activity': <Activity size={16} />,
  'clock': <Clock size={16} />,
  'log-in': <LogIn size={16} />,
  'file-text': <FileText size={16} />,
  'volume-2': <Volume2 size={16} />,
  'code': <Code size={16} />,
}

const defaultIcon = <Home size={16} />

const defaultPages: CommandItem[] = [
  { id: '1', label: '首页', path: '/dashboard', icon: iconMap['home'] || defaultIcon, group: '常用' },
  { id: '4', label: '个人中心', path: '/profile', icon: iconMap['user'] || defaultIcon, group: '常用' },
  { id: '21', label: '用户管理', path: '/system/user', icon: iconMap['user'] || defaultIcon, group: '系统管理' },
  { id: '22', label: '角色管理', path: '/system/role', icon: iconMap['shield'] || defaultIcon, group: '系统管理' },
  { id: '23', label: '菜单管理', path: '/system/menu', icon: iconMap['folder-tree'] || defaultIcon, group: '系统管理' },
  { id: '24', label: '部门管理', path: '/system/dept', icon: iconMap['building'] || defaultIcon, group: '系统管理' },
  { id: '25', label: '岗位管理', path: '/system/post', icon: iconMap['briefcase'] || defaultIcon, group: '系统管理' },
  { id: '27', label: '字典管理', path: '/system/dict', icon: iconMap['book'] || defaultIcon, group: '系统管理' },
  { id: '28', label: '系统设置', path: '/system/settings', icon: iconMap['settings'] || defaultIcon, group: '系统管理' },
  { id: '26', label: '公告管理', path: '/system/notice', icon: iconMap['volume-2'] || defaultIcon, group: '系统管理' },
  { id: '11', label: '消息通知', path: '/system/message', icon: iconMap['bell'] || defaultIcon, group: '系统管理' },
  { id: '31', label: '在线用户', path: '/monitor/online', icon: iconMap['users'] || defaultIcon, group: '系统监控' },
  { id: '32', label: '系统状态', path: '/monitor/status', icon: iconMap['activity'] || defaultIcon, group: '系统监控' },
  { id: '33', label: '操作日志', path: '/monitor/operlog', icon: iconMap['file-text'] || defaultIcon, group: '系统监控' },
  { id: '34', label: '登录日志', path: '/monitor/loginlog', icon: iconMap['log-in'] || defaultIcon, group: '系统监控' },
  { id: '18', label: '定时任务', path: '/monitor/task', icon: iconMap['clock'] || defaultIcon, group: '系统监控' },
  { id: '19', label: '任务日志', path: '/monitor/task-log', icon: iconMap['file-text'] || defaultIcon, group: '系统监控' },
]

interface CommandPaletteProps {
  pages?: CommandItem[]
  onClose: () => void
}

const CommandPalette = ({ pages = defaultPages, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const addTab = useTabStore(s => s.addTab)

  const filtered = query.trim()
    ? pages.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.path.toLowerCase().includes(query.toLowerCase())
      )
    : pages

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item)
    return acc
  }, {})

  const flatList = filtered
  const totalItems = flatList.length

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSelect = useCallback((item: CommandItem) => {
    addTab({ path: item.path, title: item.label })
    navigate(item.path)
    onClose()
  }, [navigate, addTab, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (flatList[selectedIndex]) handleSelect(flatList[selectedIndex])
        break
      case 'Escape':
        onClose()
        break
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in">
        <div className="flex items-center px-4 border-b border-gray-200">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面..."
            className="w-full px-3 py-4 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              {query === '' && (
                <div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
              )}
              {items.map((item, idx) => {
                const globalIdx = flatList.indexOf(item)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors ${
                      globalIdx === selectedIndex
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex-shrink-0 mr-3 opacity-60">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.path}</span>
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              未找到匹配的页面
            </div>
          )}
        </div>

        <div className="flex items-center px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          <span className="flex items-center mr-4"><kbd className="px-1.5 py-0.5 bg-white border rounded mr-1">↑↓</kbd> 导航</span>
          <span className="flex items-center mr-4"><kbd className="px-1.5 py-0.5 bg-white border rounded mr-1">↵</kbd> 打开</span>
          <span className="flex items-center"><kbd className="px-1.5 py-0.5 bg-white border rounded mr-1">Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
