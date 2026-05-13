import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from '@/stores/auth'
import type { Menu } from '@/types'

import MainLayout from '@/layouts/MainLayout'
import Loading from '@/components/Loading'

const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const UserList = lazy(() => import('@/pages/system/UserList'))
const RoleList = lazy(() => import('@/pages/system/RoleList'))
const MenuList = lazy(() => import('@/pages/system/MenuList'))
const DeptList = lazy(() => import('@/pages/system/DeptList'))
const PostList = lazy(() => import('@/pages/system/PostList'))
const NoticeList = lazy(() => import('@/pages/system/NoticeList'))
const MessageList = lazy(() => import('@/pages/system/MessageList'))
const DictManagement = lazy(() => import('@/pages/system/DictManagement'))
const OperationLogList = lazy(() => import('@/pages/system/OperationLogList'))
const LoginLogList = lazy(() => import('@/pages/system/LoginLogList'))
const Profile = lazy(() => import('@/pages/system/Profile'))
const SystemSettings = lazy(() => import('@/pages/system/SystemSettings'))
const OnlineUser = lazy(() => import('@/pages/monitor/OnlineUser'))
const SystemStatus = lazy(() => import('@/pages/monitor/SystemStatus'))
const TaskList = lazy(() => import('@/pages/monitor/TaskList'))
const TaskLogList = lazy(() => import('@/pages/monitor/TaskLogList'))

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Loading />}>{children}</Suspense>
)

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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspenseWrapper>
        <Login />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/register',
    element: (
      <SuspenseWrapper>
        <Register />
      </SuspenseWrapper>
    ),
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
        element: <SuspenseWrapper><Dashboard /></SuspenseWrapper>,
      },
      {
        path: 'profile',
        element: <SuspenseWrapper><Profile /></SuspenseWrapper>,
      },
      {
        path: 'system',
        children: [
          { path: 'user', element: <SuspenseWrapper><UserList /></SuspenseWrapper> },
          { path: 'role', element: <SuspenseWrapper><RoleList /></SuspenseWrapper> },
          { path: 'menu', element: <SuspenseWrapper><MenuList /></SuspenseWrapper> },
          { path: 'dept', element: <SuspenseWrapper><DeptList /></SuspenseWrapper> },
          { path: 'post', element: <SuspenseWrapper><PostList /></SuspenseWrapper> },
          { path: 'notice', element: <SuspenseWrapper><NoticeList /></SuspenseWrapper> },
          { path: 'message', element: <SuspenseWrapper><MessageList /></SuspenseWrapper> },
          { path: 'dict', element: <SuspenseWrapper><DictManagement /></SuspenseWrapper> },
          { path: 'settings', element: <SuspenseWrapper><SystemSettings /></SuspenseWrapper> },
        ],
      },
      {
        path: 'monitor',
        children: [
          { path: 'online', element: <SuspenseWrapper><OnlineUser /></SuspenseWrapper> },
          { path: 'status', element: <SuspenseWrapper><SystemStatus /></SuspenseWrapper> },
          { path: 'task', element: <SuspenseWrapper><TaskList /></SuspenseWrapper> },
          { path: 'task-log', element: <SuspenseWrapper><TaskLogList /></SuspenseWrapper> },
          { path: 'operlog', element: <SuspenseWrapper><OperationLogList /></SuspenseWrapper> },
          { path: 'loginlog', element: <SuspenseWrapper><LoginLogList /></SuspenseWrapper> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <SuspenseWrapper><NotFound /></SuspenseWrapper>,
  },
])

export default router
