import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import type { Menu } from '@/types'

// 布局组件
import MainLayout from '@/layouts/MainLayout'

// 页面组件
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'

// 系统管理页面
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
import Profile from '@/pages/system/Profile'
import SystemSettings from '@/pages/system/SystemSettings'

// 监控页面
import OnlineUser from '@/pages/monitor/OnlineUser'
import SystemStatus from '@/pages/monitor/SystemStatus'
import TaskList from '@/pages/monitor/TaskList'
import TaskLogList from '@/pages/monitor/TaskLogList'

// 路由守卫组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// 根据菜单生成路由配置
export const generateRoutesFromMenus = (menus: Menu[]) => {
  const routes: { path: string; component: React.ComponentType }[] = []
  
  const traverseMenus = (menuList: Menu[]) => {
    menuList.forEach((menu) => {
      if (menu.path && menu.component) {
        routes.push({
          path: menu.path,
          component: Dashboard,
        })
      }
      
      if (menu.children && menu.children.length > 0) {
        traverseMenus(menu.children)
      }
    })
  }
  
  traverseMenus(menus)
  return routes
}

// 基础路由配置
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'system',
        children: [
          {
            path: 'user',
            element: <UserList />,
          },
          {
            path: 'role',
            element: <RoleList />,
          },
          {
            path: 'menu',
            element: <MenuList />,
          },
          {
            path: 'dept',
            element: <DeptList />,
          },
          {
            path: 'post',
            element: <PostList />,
          },
          {
            path: 'notice',
            element: <NoticeList />,
          },
          {
            path: 'message',
            element: <MessageList />,
          },
          {
            path: 'dict',
            element: <DictManagement />,
          },
          {
            path: 'settings',
            element: <SystemSettings />,
          },

        ],
      },
      {
        path: 'monitor',
        children: [
          {
            path: 'online',
            element: <OnlineUser />,
          },
          {
            path: 'status',
            element: <SystemStatus />,
          },
          {
            path: 'task',
            element: <TaskList />,
          },
          {
            path: 'task-log',
            element: <TaskLogList />,
          },
          {
            path: 'operlog',
            element: <OperationLogList />,
          },
          {
            path: 'loginlog',
            element: <LoginLogList />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

export default router
