import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo, Menu } from '@/types'
import { login as loginApi, getUserInfo, getUserMenus } from '@/api/auth'
import { useTabStore } from '@/stores/tabs'

interface AuthState {
  // 状态
  token: string | null
  refreshToken: string | null
  userInfo: UserInfo | null
  menus: Menu[]
  permissions: string[]
  isLoggedIn: boolean
  rememberedUsername: string | null

  // 方法
  login: (username: string, password: string, captcha?: string, captchaSessionId?: string, rememberMe?: boolean) => Promise<void>
  logout: () => void
  fetchUserInfo: () => Promise<void>
  fetchUserMenus: () => Promise<void>
  setToken: (token: string) => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: null,
      refreshToken: null,
      userInfo: null,
      menus: [],
      permissions: [],
      isLoggedIn: false,
      rememberedUsername: null,

      // 登录
      login: async (username: string, password: string, captcha?: string, captchaSessionId?: string, rememberMe?: boolean) => {
        useTabStore.getState().closeAll()
        const response = await loginApi({ 
          username, 
          password,
          captcha,
          captcha_session_id: captchaSessionId
        })
        const { access_token, refresh_token } = response
        
        set({ 
          token: access_token, 
          refreshToken: refresh_token,
          isLoggedIn: true,
          rememberedUsername: rememberMe ? username : null
        })
        
        // 保存到localStorage
        localStorage.setItem('token', access_token)
        localStorage.setItem('refreshToken', refresh_token)
        
        // 获取用户信息和菜单
        await get().fetchUserInfo()
        await get().fetchUserMenus()
      },
      
      // 登出
      logout: () => {
        set({
          token: null,
          refreshToken: null,
          userInfo: null,
          menus: [],
          permissions: [],
          isLoggedIn: false,
        })
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        useTabStore.getState().closeAll()
      },
      
      // 获取用户信息
      fetchUserInfo: async () => {
        try {
          const userInfo = await getUserInfo()
          set({ 
            userInfo,
            permissions: userInfo.permissions 
          })
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
      },
      
      // 更新用户信息（用于头像等实时更新）
      updateUserInfo: (updates: Partial<UserInfo>) => {
        const { userInfo } = get()
        if (userInfo) {
          set({ userInfo: { ...userInfo, ...updates } })
        }
      },
      
      // 获取用户菜单
      fetchUserMenus: async () => {
        try {
          const menus = await getUserMenus()
          console.log('[菜单] 获取到的菜单数据:', menus)
          set({ menus })
        } catch (error) {
          console.error('获取用户菜单失败:', error)
        }
      },
      
      // 设置token
      setToken: (token: string) => {
        set({ token, isLoggedIn: true })
        localStorage.setItem('token', token)
      },
      
      // 检查权限
      hasPermission: (permission: string) => {
        const { permissions } = get()
        return permissions.includes(permission) || permissions.includes('*')
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        refreshToken: state.refreshToken,
        isLoggedIn: state.isLoggedIn,
        rememberedUsername: state.rememberedUsername,
      }),
    }
  )
)
