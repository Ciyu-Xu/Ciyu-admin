import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Bell,
  Search,
  Home,
  Users,
  Shield,
  FolderTree,
  Building2,
  Briefcase,
  ChevronRight,
  XCircle,
  Book,
  Activity,
  Volume2,
  Clock,
  LogIn,
  FileText,
  Code,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useTabStore, type TabItem } from '@/stores/tabs'
import KeepAlive from '@/components/KeepAlive'
import type { Menu as MenuType } from '@/types'
import { getUnreadCount, getMessageList, markAsRead, markAllAsRead, deleteMessage, type Message } from '@/api/message'
import { getPublicConfig } from '@/api/system/publicConfig'
import NoticePopup from '@/components/NoticePopup'
import ToastContainer from '@/components/Toast'
import CommandPalette from '@/components/CommandPalette'
import { useHeartbeat } from '@/hooks/useHeartbeat'

// 页面组件
import Dashboard from '@/pages/Dashboard'
import Profile from '@/pages/system/Profile'
import UserList from '@/pages/system/UserList'
import RoleList from '@/pages/system/RoleList'
import MenuList from '@/pages/system/MenuList'
import DeptList from '@/pages/system/DeptList'
import PostList from '@/pages/system/PostList'
import NoticeList from '@/pages/system/NoticeList'
import MessageList from '@/pages/system/MessageList'
import DictManagement from '@/pages/system/DictManagement'
import OperationLogList from '@/pages/system/OperationLogList'
import LoginLogList from '@/pages/system/LoginLogList'
import SystemSettings from '@/pages/system/SystemSettings'
import OnlineUser from '@/pages/monitor/OnlineUser'
import SystemStatus from '@/pages/monitor/SystemStatus'
import TaskList from '@/pages/monitor/TaskList'
import TaskLogList from '@/pages/monitor/TaskLogList'

const pageComponents: Record<string, React.ComponentType> = {
  '/dashboard': Dashboard,
  '/profile': Profile,
  '/system/user': UserList,
  '/system/role': RoleList,
  '/system/menu': MenuList,
  '/system/dept': DeptList,
  '/system/post': PostList,
  '/system/notice': NoticeList,
  '/system/message': MessageList,
  '/system/dict': DictManagement,
  '/system/settings': SystemSettings,
  '/monitor/online': OnlineUser,
  '/monitor/status': SystemStatus,
  '/monitor/task': TaskList,
  '/monitor/task-log': TaskLogList,
  '/monitor/operlog': OperationLogList,
  '/monitor/loginlog': LoginLogList,
}

const pageTitles: Record<string, string> = {
  '/dashboard': '首页',
  '/profile': '个人中心',
  '/system/user': '用户管理',
  '/system/role': '角色管理',
  '/system/menu': '菜单管理',
  '/system/dept': '部门管理',
  '/system/post': '岗位管理',
  '/system/notice': '公告管理',
  '/system/message': '消息通知',
  '/system/dict': '字典管理',
  '/system/settings': '系统设置',
  '/monitor/online': '在线用户',
  '/monitor/status': '系统状态',
  '/monitor/task': '定时任务',
  '/monitor/task-log': '任务日志',
  '/monitor/operlog': '操作日志',
  '/monitor/loginlog': '登录日志',
}

const getPageIcon = (iconName?: string) => {
  const icons: Record<string, React.ReactNode> = {
    'home': <Home size={14} />,
    'user': <User size={14} />,
    'shield': <Shield size={14} />,
    'folder-tree': <FolderTree size={14} />,
    'building': <Building2 size={14} />,
    'briefcase': <Briefcase size={14} />,
    'bell': <Bell size={14} />,
    'book': <Book size={14} />,
    'monitor': <Activity size={14} />,
    'users': <Users size={14} />,
    'activity': <Activity size={14} />,
    'volume-2': <Volume2 size={14} />,
    'clock': <Clock size={14} />,
    'log-in': <LogIn size={14} />,
    'file-text': <FileText size={14} />,
    'settings': <Settings size={14} />,
    'code': <Code size={14} />,
  }
  return icons[iconName || ''] || null
}

// 侧边栏菜单项组件
const SidebarItem = ({ 
  menu, 
  level = 0,
  isCollapsed,
  onNavigate
}: { 
  menu: MenuType
  level?: number
  isCollapsed: boolean
  onNavigate: (path: string, title: string, icon?: string) => void
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(true)
  
  const isActive = location.pathname === menu.path
  const hasChildren = menu.children && menu.children.length > 0
  
  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    } else if (menu.path) {
      onNavigate(menu.path, menu.menu_name, menu.icon)
      navigate(menu.path)
    }
  }
  
  const getIcon = (iconName?: string) => {
    const icons: Record<string, React.ReactNode> = {
      'home': <Home size={18} />,
      'user': <User size={18} />,
      'shield': <Shield size={18} />,
      'folder-tree': <FolderTree size={18} />,
      'building': <Building2 size={18} />,
      'briefcase': <Briefcase size={18} />,
      'bell': <Bell size={18} />,
      'book': <Book size={18} />,
      'database': <Book size={18} />,
      'monitor': <Activity size={18} />,
      'users': <Users size={18} />,
      'activity': <Activity size={18} />,
      'volume-2': <Volume2 size={18} />,
    }
    return icons[iconName || ''] || <Home size={18} />
  }
  
  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
          isActive 
            ? 'bg-primary-600 text-white' 
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        } ${level > 0 ? 'ml-4' : ''}`}
        style={{ paddingLeft: isCollapsed ? '1rem' : `${1 + level * 0.5}rem` }}
      >
        <span className="flex-shrink-0">{getIcon(menu.icon)}</span>
        {!isCollapsed && (
          <>
            <span className="ml-3 flex-1 text-left">{menu.menu_name}</span>
            {hasChildren && (
              <ChevronRight 
                size={16} 
                className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </>
        )}
      </button>
      
      {!isCollapsed && hasChildren && isExpanded && (
        <div className="mt-1">
          {menu.children?.map((child) => (
            <SidebarItem 
              key={child.id} 
              menu={child} 
              level={level + 1}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const MainLayout = () => {
  useHeartbeat()
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout, menus, fetchUserInfo, fetchUserMenus, isLoggedIn } = useAuthStore()
  const { tabs, activeTab, addTab, removeTab, setActiveTab } = useTabStore()
  const hasInitialized = useRef(false)
  const [siteName, setSiteName] = useState('Admin System')
  const prevPathRef = useRef(location.pathname)
  
  // 同步路由变化到活动tab
  useEffect(() => {
    const path = location.pathname
    if (path !== prevPathRef.current) {
      prevPathRef.current = path
      const title = pageTitles[path] || path.split('/').pop() || ''
      if (!tabs.some(t => t.path === path)) {
        addTab({ path, title })
      } else {
        setActiveTab(path)
      }
    }
  }, [location.pathname])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await getPublicConfig()
        if (res && res['sys.index.sitename']) {
          setSiteName(res['sys.index.sitename'])
        }
      } catch (err) {
        console.error('加载系统配置失败:', err)
      }
    }
    loadConfig()
  }, [])
  
  useEffect(() => {
    if (isLoggedIn && !hasInitialized.current) {
      hasInitialized.current = true
      fetchUserInfo()
      fetchUserMenus()
    }
  }, [isLoggedIn, fetchUserInfo, fetchUserMenus])

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null)
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavigate = useCallback((path: string, title: string, icon?: string) => {
    addTab({ path, title, icon })
  }, [addTab])
  
  const loadMessages = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
      const list = await getMessageList({ page: 1, size: 10 })
      setMessages(list.rows)
    } catch (error) {
      console.error('加载消息失败:', error)
    }
  }
  
  useEffect(() => {
    loadMessages()
  }, [])
  
  const handleMarkAsRead = async (msgId: number) => {
    try {
      await markAsRead(msgId)
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, status: 1 } : m
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setMessages(prev => prev.map(m => ({ ...m, status: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('全部标记已读失败:', error)
    }
  }
  
  const handleDeleteMessage = async (msgId: number) => {
    try {
      await deleteMessage(msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
      if (messages.find(m => m.id === msgId)?.status === 0) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('删除消息失败:', error)
    }
  }

  const handleTabClick = (tab: TabItem) => {
    setActiveTab(tab.path)
    navigate(tab.path)
  }

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    if (path === '/dashboard') return
    const nextActive = removeTab(path)
    if (nextActive && nextActive !== path) {
      navigate(nextActive)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path })
  }

  const handleCloseOthers = () => {
    if (contextMenu) {
      const { path } = contextMenu
      const { closeOthers } = useTabStore.getState()
      closeOthers(path)
      setContextMenu(null)
      navigate(path)
    }
  }

  const handleCloseAllTabs = () => {
    const { closeAll } = useTabStore.getState()
    closeAll()
    setContextMenu(null)
    navigate('/dashboard')
  }

  const getMessageTypeLabel = (type: number) => {
    const types: Record<number, string> = { 1: '系统通知', 2: '业务提醒', 3: '私信' }
    return types[type] || '未知'
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
  
  // 默认菜单（当后端菜单未加载时显示）
  const defaultMenus: MenuType[] = [
    {
      id: 1,
      menu_name: '首页',
      path: '/dashboard',
      icon: 'home',
      parent_id: 0,
      sort_order: 1,
      is_frame: 0,
      is_cache: 0,
      visible: 1,
      status: 1,
      create_time: '',
      children: []
    },
    {
      id: 4,
      menu_name: '个人中心',
      path: '/profile',
      icon: 'user',
      parent_id: 0,
      sort_order: 1.5,
      is_frame: 0,
      is_cache: 0,
      visible: 1,
      status: 1,
      create_time: '',
      children: []
    },
    {
      id: 2,
      menu_name: '系统管理',
      path: '',
      icon: 'settings',
      parent_id: 0,
      sort_order: 2,
      is_frame: 0,
      is_cache: 0,
      visible: 1,
      status: 1,
      create_time: '',
      children: [
        { id: 21, menu_name: '用户管理', path: '/system/user', icon: 'user', parent_id: 2, sort_order: 1, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 22, menu_name: '角色管理', path: '/system/role', icon: 'shield', parent_id: 2, sort_order: 2, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 23, menu_name: '菜单管理', path: '/system/menu', icon: 'folder-tree', parent_id: 2, sort_order: 3, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 24, menu_name: '部门管理', path: '/system/dept', icon: 'building', parent_id: 2, sort_order: 4, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 25, menu_name: '岗位管理', path: '/system/post', icon: 'briefcase', parent_id: 2, sort_order: 5, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 26, menu_name: '消息通知', path: '/system/message', icon: 'bell', parent_id: 2, sort_order: 6, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 27, menu_name: '字典管理', path: '/system/dict', icon: 'book', parent_id: 2, sort_order: 7, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 28, menu_name: '系统设置', path: '/system/settings', icon: 'settings', parent_id: 2, sort_order: 8, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
      ]
    },
    {
      id: 3,
      menu_name: '系统监控',
      path: '',
      icon: 'monitor',
      parent_id: 0,
      sort_order: 3,
      is_frame: 0,
      is_cache: 0,
      visible: 1,
      status: 1,
      create_time: '',
      children: [
        { id: 31, menu_name: '在线用户', path: '/monitor/online', icon: 'users', parent_id: 3, sort_order: 1, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 32, menu_name: '系统状态', path: '/monitor/status', icon: 'activity', parent_id: 3, sort_order: 2, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 33, menu_name: '操作日志', path: '/monitor/operlog', icon: 'activity', parent_id: 3, sort_order: 3, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
        { id: 34, menu_name: '登录日志', path: '/monitor/loginlog', icon: 'log-in', parent_id: 3, sort_order: 4, is_frame: 0, is_cache: 0, visible: 1, status: 1, create_time: '' },
      ]
    },
  ]
  
  const displayMenus = menus.length > 0 ? menus : defaultMenus
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 通知弹窗 */}
      <NoticePopup />
      <ToastContainer />
      {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} />}
      
      {/* 右键菜单 */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-40"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleCloseOthers}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              关闭其他标签
            </button>
            <button
              onClick={handleCloseAllTabs}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              关闭所有标签
            </button>
          </div>
        </>
      )}
      
      {/* 侧边栏 */}
      <aside 
        className={`bg-gray-800 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold text-white">{siteName}</h1>
          ) : (
            <span className="text-xl font-bold text-white">{siteName[0]}</span>
          )}
        </div>
        
        {/* 菜单 */}
        <nav className="mt-4 px-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
          {displayMenus.map((menu) => (
            <SidebarItem 
              key={menu.id} 
              menu={menu} 
              isCollapsed={!isSidebarOpen}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>
      </aside>
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            
            {/* 面包屑 */}
            <nav className="ml-4 flex items-center space-x-2 text-sm text-gray-500">
              <span>首页</span>
              <ChevronRight size={16} />
              <span className="text-gray-900">{pageTitles[location.pathname] || location.pathname.split('/').pop()}</span>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 搜索 / 命令面板 */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            >
              <Search size={16} className="mr-2" />
              <span className="hidden sm:inline">搜索页面...</span>
              <kbd className="ml-4 px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded hidden sm:inline">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
              </kbd>
            </button>
            
            {/* 通知 */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen)
                  if (!isNotificationOpen) {
                    loadMessages()
                  }
                }}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">消息通知</h3>
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      全部已读
                    </button>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                        <p>暂无消息</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            onClick={() => {
                              if (msg.status === 0) {
                                handleMarkAsRead(msg.id)
                              }
                              setSelectedMessage(msg)
                            }}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                              msg.status === 0 ? 'bg-gray-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  {msg.status === 0 ? (
                                    <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                                  ) : (
                                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                  )}
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {getMessageTypeLabel(msg.msg_type)}
                                  </span>
                                </div>
                                <h4 className={`mt-1 text-sm font-medium truncate ${
                                  msg.status === 0 ? 'text-gray-900' : 'text-gray-600'
                                }`}>
                                  {msg.title}
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                  {msg.content || '暂无内容'}
                                </p>
                                <p className="mt-2 text-xs text-gray-400">
                                  {formatTime(msg.create_time)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteMessage(msg.id)
                                }}
                                className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {messages.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setIsNotificationOpen(false)
                          navigate('/system/message')
                        }}
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                      >
                        查看全部消息
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 用户菜单 */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
              >
                {userInfo?.avatar ? (
                  <img 
                    src={userInfo.avatar} 
                    alt="头像" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                    {userInfo?.nickname?.[0] || userInfo?.username?.[0] || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {userInfo?.nickname || userInfo?.username}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <User size={16} className="mr-2" />
                    个人中心
                  </button>
                  <button
                    onClick={() => navigate('/system/settings')}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    系统设置
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* 标签栏 */}
        {tabs.length > 1 && (
          <div className="bg-white border-b border-gray-200 flex items-center px-2 overflow-x-auto flex-shrink-0">
            {tabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => handleTabClick(tab)}
                onContextMenu={(e) => handleContextMenu(e, tab.path)}
                className={`group flex items-center px-3 py-2 text-sm border-r border-gray-200 cursor-pointer select-none whitespace-nowrap transition-colors ${
                  tab.path === activeTab
                    ? 'bg-white text-primary-600 border-t-2 border-t-primary-500 border-b-2 border-b-white -mb-px'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getPageIcon(tab.icon)}
                <span className={tab.icon ? 'ml-1.5' : ''}>{tab.title}</span>
                {tab.path !== '/dashboard' && (
                  <button
                    onClick={(e) => handleTabClose(e, tab.path)}
                    className="ml-2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-6">
          <KeepAlive pages={pageComponents} />
        </main>
      </div>

      {/* 消息详情模态框 */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedMessage.title}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {getMessageTypeLabel(selectedMessage.msg_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedMessage.create_time}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedMessage.content || '暂无内容' }}
              />
            </div>
            
            <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainLayout
