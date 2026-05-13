import { useTabStore } from '@/stores/tabs'
import { Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import Loading from '@/components/Loading'

interface KeepAliveProps {
  pages: Record<string, ComponentType | LazyExoticComponent<ComponentType>>
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
            <Suspense fallback={<Loading />}>
              <Component />
            </Suspense>
          </div>
        )
      })}
    </>
  )
}

export default KeepAlive
