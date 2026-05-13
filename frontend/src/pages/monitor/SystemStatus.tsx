import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Cpu, HardDrive, Wifi, Server, Activity, Zap, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { getSystemStatus, getServerInfo, formatBytes, type SystemStatus, type ServerInfo } from '@/api/system/monitor'

const MAX_DATA_POINTS = 30

const SystemStatus = () => {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cpuHistory, setCpuHistory] = useState<{ time: string; value: number }[]>([])
  const [memoryHistory, setMemoryHistory] = useState<{ time: string; value: number }[]>([])
  const [diskHistory, setDiskHistory] = useState<{ time: string; value: number }[]>([])
  const [networkUpHistory, setNetworkUpHistory] = useState<{ time: string; value: number }[]>([])
  const [networkDownHistory, setNetworkDownHistory] = useState<{ time: string; value: number }[]>([])
  const [lastNetwork, setLastNetwork] = useState<{ sent: number; recv: number; time: number } | null>(null)
  
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: getSystemStatus,
    refetchInterval: autoRefresh ? 5000 : false,
  })

  const { data: serverData, isLoading: serverLoading, refetch: refetchServer } = useQuery({
    queryKey: ['serverInfo'],
    queryFn: getServerInfo,
    refetchInterval: autoRefresh ? 30000 : false,
  })

  const status: SystemStatus = statusData || {}
  const server: ServerInfo = serverData || {}

  const formatTime = useCallback(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  }, [])

  useEffect(() => {
    if (status.cpu?.usage !== undefined) {
      const time = formatTime()
      setCpuHistory(prev => {
        const newData = [...prev, { time, value: status.cpu.usage }]
        return newData.slice(-MAX_DATA_POINTS)
      })
    }
  }, [status.cpu?.usage, formatTime])

  useEffect(() => {
    if (status.memory?.percent !== undefined) {
      const time = formatTime()
      setMemoryHistory(prev => {
        const newData = [...prev, { time, value: status.memory.percent }]
        return newData.slice(-MAX_DATA_POINTS)
      })
    }
  }, [status.memory?.percent, formatTime])

  useEffect(() => {
    if (status.disk?.percent !== undefined) {
      const time = formatTime()
      setDiskHistory(prev => {
        const newData = [...prev, { time, value: status.disk.percent }]
        return newData.slice(-MAX_DATA_POINTS)
      })
    }
  }, [status.disk?.percent, formatTime])

  useEffect(() => {
    if (status.network) {
      const now = Date.now()
      const currentSent = status.network.bytes_sent || 0
      const currentRecv = status.network.bytes_recv || 0
      
      if (lastNetwork && lastNetwork.time) {
        const timeDiff = (now - lastNetwork.time) / 1000
        if (timeDiff > 0 && currentSent >= lastNetwork.sent) {
          const upSpeed = (currentSent - lastNetwork.sent) / timeDiff
          const downSpeed = (currentRecv - lastNetwork.recv) / timeDiff
          const time = formatTime()
          
          setNetworkUpHistory(prev => {
            const newData = [...prev, { time, value: upSpeed }]
            return newData.slice(-MAX_DATA_POINTS)
          })
          setNetworkDownHistory(prev => {
            const newData = [...prev, { time, value: downSpeed }]
            return newData.slice(-MAX_DATA_POINTS)
          })
        }
      }
      
      setLastNetwork({
        sent: currentSent,
        recv: currentRecv,
        time: now
      })
    }
  }, [status.network, formatTime])

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchStatus(), refetchServer()])
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const ChartCard = ({ 
    title, 
    data, 
    color, 
    gradientColor,
    unit = '%',
    maxValue = 100,
    icon: Icon,
    currentValue
  }: { 
    title: string
    data: { time: string; value: number }[]
    color: string
    gradientColor: string
    unit?: string
    maxValue?: number
    icon: any
    currentValue?: number
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {currentValue !== undefined && (
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold" style={{ color }}>
              {currentValue.toFixed(1)}{unit}
            </span>
          </div>
        )}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, maxValue]} 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`${value.toFixed(1)}${unit}`, '使用率']}
              labelStyle={{ color: '#6b7280' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const NetworkChart = ({ 
    upData, 
    downData 
  }: { 
    upData: { time: string; value: number }[]
    downData: { time: string; value: number }[]
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-50">
            <Wifi className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">网络流量</h3>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-500">上传</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-500">下载</span>
          </div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={upData.map((item, i) => ({ 
            time: item.time, 
            up: item.value,
            down: downData[i]?.value || 0 
          }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatSpeed(v)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => [formatSpeed(value), name === 'up' ? '上传' : '下载']}
              labelStyle={{ color: '#6b7280' }}
            />
            <Line 
              type="monotone" 
              dataKey="up" 
              stroke="#22c55e" 
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
            <Line 
              type="monotone" 
              dataKey="down" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subValue, 
    iconBg,
    iconColor
  }: { 
    icon: any, 
    title: string, 
    value: string, 
    subValue?: string, 
    iconBg?: string,
    iconColor?: string
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-xl ${iconBg || 'bg-blue-50'}`}>
          <Icon className={`w-6 h-6 ${iconColor || 'text-blue-600'}`} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
          <p className="text-gray-500 mt-1">实时监控服务器运行状态</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${autoRefresh ? 'bg-primary-500' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${autoRefresh ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="text-sm text-gray-600">自动刷新</span>
          </label>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing || statusLoading ? 'animate-spin' : ''}`} />
            {isRefreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          title="操作系统"
          value={status.platform?.system || '-'}
          subValue={`${status.platform?.release || ''} · ${status.platform?.machine || ''}`}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          iconColor="text-white"
        />
        <StatCard
          icon={Activity}
          title="运行时间"
          value={server.uptime_formatted || '-'}
          subValue={`启动于 ${server.boot_time ? new Date(server.boot_time).toLocaleString() : '-'}`}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          iconColor="text-white"
        />
        <StatCard
          icon={Cpu}
          title="CPU"
          value={`${server.cpu_count?.physical || '-'} 核 / ${server.cpu_count?.logical || '-'} 线程`}
          subValue={`频率: ${status.cpu?.frequency?.toFixed(0) || '-'} MHz`}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          iconColor="text-white"
        />
        <StatCard
          icon={HardDrive}
          title="存储总量"
          value={formatBytes(server.memory_total || 0)}
          subValue={`磁盘: ${formatBytes(server.disk_total || 0)}`}
          iconBg="bg-gradient-to-br from-orange-500 to-orange-600"
          iconColor="text-white"
        />
      </div>

      {/* 资源使用图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="CPU 使用率"
          data={cpuHistory}
          color="#3b82f6"
          gradientColor="#3b82f6"
          unit="%"
          maxValue={100}
          icon={Cpu}
          currentValue={status.cpu?.usage}
        />
        <ChartCard
          title="内存使用率"
          data={memoryHistory}
          color="#8b5cf6"
          gradientColor="#8b5cf6"
          unit="%"
          maxValue={100}
          icon={HardDrive}
          currentValue={status.memory?.percent}
        />
        <ChartCard
          title="磁盘使用率"
          data={diskHistory}
          color="#f59e0b"
          gradientColor="#f59e0b"
          unit="%"
          maxValue={100}
          icon={HardDrive}
          currentValue={status.disk?.percent}
        />
        <NetworkChart upData={networkUpHistory} downData={networkDownHistory} />
      </div>

      {/* 系统信息 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">系统版本</span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{status.platform?.version || '-'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">更新时间</span>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : '-'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm">CPU 核心</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{status.cpu?.count || 0} 核心</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm">磁盘剩余</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatBytes(status.disk?.free || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
