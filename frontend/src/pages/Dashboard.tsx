import { useState, useEffect } from 'react'
import { 
  Users, 
  UserCheck, 
  Shield, 
  Building2,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Activity,
  Bell,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getRecentActivities, getNotices, type ActivityItem, type NoticeItem } from '@/api/system/dashboard'

const StatCard = ({ 
  title, 
  value: propValue,
  icon: Icon, 
  trend,
  trendValue,
  color,
  loading 
}: { 
  title: string
  value: number | string
  icon: React.ElementType
  trend: 'up' | 'down' | null
  trendValue: string | null
  color: string
  loading?: boolean
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {loading ? (
            <span className="text-gray-300">-</span>
          ) : (
            propValue
          )}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    {trend && trendValue && (
      <div className="mt-4 flex items-center">
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trendValue}
        </span>
        <span className="text-sm text-gray-500 ml-2">较上月</span>
      </div>
    )}
  </div>
)

const QuickAction = ({ 
  title, 
  description, 
  icon: Icon,
  onClick 
}: { 
  title: string
  description: string
  icon: React.ElementType
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow w-full text-left"
  >
    <div className="p-3 bg-primary-50 rounded-lg">
      <Icon className="w-6 h-6 text-primary-600" />
    </div>
    <div className="ml-4">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  </button>
)

const RecentActivity = ({ activities, loading }: { activities: ActivityItem[]; loading: boolean }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case '新增': return <CheckCircle className="w-5 h-5" />
      case '修改': return <Info className="w-5 h-5" />
      case '删除': return <AlertCircle className="w-5 h-5" />
      case '登录': return <Activity className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }
  
  const getActivityColor = (type: string) => {
    switch (type) {
      case '新增': return 'bg-green-100 text-green-600'
      case '修改': return 'bg-blue-100 text-blue-600'
      case '删除': return 'bg-red-100 text-red-600'
      case '登录': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }
  
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
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
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">最近操作</h3>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">暂无操作记录</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.oper_type)}`}>
                  {getActivityIcon(activity.oper_type)}
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-primary-600">{activity.oper_name}</span> {activity.oper_desc}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(activity.create_time)} · {activity.ip_address || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SystemNotice = ({ notices, loading }: { notices: NoticeItem[]; loading: boolean }) => {
  console.log('[SystemNotice] 接收到的 notices:', notices, 'loading:', loading)
  
  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-5 h-5" />
      case 'warning': return <AlertCircle className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
  }
  
  const getNoticeColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-blue-200 bg-blue-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'success': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }
  
  const getNoticeIconColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">系统公告</h3>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-100 rounded w-full mt-2"></div>
              </div>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center text-gray-500 py-8">暂无公告</div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div 
                key={notice.id} 
                className={`p-4 rounded-lg border ${getNoticeColor(notice.notice_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className={`mt-0.5 mr-2 ${getNoticeIconColor(notice.notice_type)}`}>
                      {getNoticeIcon(notice.notice_type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{notice.notice_title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notice.notice_content}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{formatDate(notice.create_time)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const Dashboard = () => {
  const navigate = (path: string) => {
    window.location.href = path
  }
  
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      console.log('[Dashboard] 请求统计数据...')
      const result = await getDashboardStats()
      console.log('[Dashboard] statsData:', result)
      return result
    },
  })
  
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      console.log('[Dashboard] 请求最近活动...')
      const result = await getRecentActivities(5)
      console.log('[Dashboard] activitiesData:', result)
      return result
    },
  })
  
  const { data: noticesData, isLoading: noticesLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const result = await getNotices(3)
      return result
    },
  })
  
  console.log('[Dashboard] statsData:', statsData)
  console.log('[Dashboard] activitiesData:', activitiesData)
  console.log('[Dashboard] noticesData:', noticesData)
  
  const stats = statsData
  const activities = activitiesData?.rows || []
  const notices = noticesData?.rows || []
  
  const calculateTrend = (current: number, lastMonth: number) => {
    if (lastMonth === 0) return { trend: 'up' as const, value: '100%' }
    const change = ((current - lastMonth) / lastMonth) * 100
    return {
      trend: change >= 0 ? 'up' as const : 'down' as const,
      value: `${Math.abs(change).toFixed(1)}%`
    }
  }
  
  const usersTrend = stats ? calculateTrend(stats.totalUsers, stats.totalUsersLastMonth) : null
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-gray-600 mt-1">欢迎回来，这里是系统概览</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          trend={usersTrend?.trend || null}
          trendValue={usersTrend?.value || null}
          color="bg-blue-500"
          loading={statsLoading}
        />
        <StatCard
          title="启用用户"
          value={stats?.onlineUsers ?? 0}
          icon={UserCheck}
          trend={null}
          trendValue={null}
          color="bg-green-500"
          loading={statsLoading}
        />
        <StatCard
          title="角色数量"
          value={stats?.totalRoles ?? 0}
          icon={Shield}
          trend={null}
          trendValue={null}
          color="bg-purple-500"
          loading={statsLoading}
        />
        <StatCard
          title="部门数量"
          value={stats?.totalDepts ?? 0}
          icon={Building2}
          trend={null}
          trendValue={null}
          color="bg-orange-500"
          loading={statsLoading}
        />
      </div>
      
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">快捷入口</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="用户管理"
            description="管理系统用户账号"
            icon={Users}
            onClick={() => navigate('/system/user')}
          />
          <QuickAction
            title="角色管理"
            description="配置角色和权限"
            icon={Shield}
            onClick={() => navigate('/system/role')}
          />
          <QuickAction
            title="部门管理"
            description="管理组织架构"
            icon={Building2}
            onClick={() => navigate('/system/dept')}
          />
          <QuickAction
            title="系统设置"
            description="配置系统参数"
            icon={MoreHorizontal}
            onClick={() => navigate('/settings')}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={activities} loading={activitiesLoading} />
        <SystemNotice notices={notices} loading={noticesLoading} />
      </div>
    </div>
  )
}

export default Dashboard
