import { useTabStore } from '@/stores/tabs'
import type { ComponentType } from 'react'

interface KeepAliveProps {
  pages: Record<string, ComponentType>
}

const KeepAlive = ({ pages }: KeepAliveProps) => {
  const tabs = useTabStore(s => s.tabs)
  const activeTab = useTabStore(s => s.activeTab)

  return (
    <>
      {tabs.map(tab => {
        const Component = pages[tab.path]
        if (!Component) return null
        return (
          <div
            key={tab.path}
            className="h-full"
            style={{ display: tab.path === activeTab ? 'block' : 'none' }}
          >
            <Component />
          </div>
        )
      })}
    </>
  )
}

export default KeepAlive
