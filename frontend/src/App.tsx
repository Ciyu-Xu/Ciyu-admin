import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/auth'

function App() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const token = useAuthStore((state) => state.token)
  const userInfo = useAuthStore((state) => state.userInfo)
  const fetchUserInfo = useAuthStore((state) => state.fetchUserInfo)
  const fetchUserMenus = useAuthStore((state) => state.fetchUserMenus)

  console.log('[App] 渲染, isLoggedIn:', isLoggedIn, 'token:', !!token, 'userInfo:', !!userInfo)

  // 应用启动时，如果已登录则获取用户信息和菜单
  useEffect(() => {
    console.log('[App] useEffect 触发')
    console.log('[App] isLoggedIn:', isLoggedIn, 'token:', !!token)
    
    if (isLoggedIn && token) {
      console.log('[App] 满足条件，开始获取用户信息')
      fetchUserInfo()
      fetchUserMenus()
    } else {
      console.log('[App] 不满足条件，不获取用户信息')
    }
  }, [isLoggedIn, token, fetchUserInfo, fetchUserMenus])

  // App 组件现在只负责全局逻辑，路由在 main.tsx 中配置
  return null
}

export default App
