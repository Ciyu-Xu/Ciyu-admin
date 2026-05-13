import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TabItem {
  path: string
  title: string
  icon?: string
}

interface TabsState {
  tabs: TabItem[]
  activeTab: string
  addTab: (tab: TabItem) => void
  removeTab: (path: string) => string | null
  setActiveTab: (path: string) => void
  closeOthers: (path: string) => void
  closeAll: () => void
}

export const useTabStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [{ path: '/dashboard', title: '首页', icon: 'home' }],
      activeTab: '/dashboard',

      addTab: (tab) => {
        const { tabs } = get()
        if (!tabs.some(t => t.path === tab.path)) {
          set({ tabs: [...tabs, tab] })
        }
        set({ activeTab: tab.path })
      },

      removeTab: (path) => {
        const { tabs, activeTab } = get()
        if (tabs.length <= 1) return path === activeTab ? activeTab : null
        const newTabs = tabs.filter(t => t.path !== path)
        let newActive = activeTab
        if (activeTab === path) {
          const idx = tabs.findIndex(t => t.path === path)
          newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.path || '/dashboard'
        }
        set({ tabs: newTabs, activeTab: newActive })
        return newActive
      },

      setActiveTab: (path) => set({ activeTab: path }),

      closeOthers: (path) => {
        const tab = get().tabs.find(t => t.path === path)
        if (tab) {
          set({ tabs: [tab], activeTab: path })
        }
      },

      closeAll: () => set({
        tabs: [{ path: '/dashboard', title: '首页', icon: 'home' }],
        activeTab: '/dashboard'
      }),
    }),
    {
      name: 'tab-storage',
      partialize: (state) => ({ tabs: state.tabs, activeTab: state.activeTab }),
    }
  )
)
