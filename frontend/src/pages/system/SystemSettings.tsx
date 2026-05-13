import { useState } from 'react'
import { Settings, Database, Shield, Bell, Save, RefreshCw, Globe, Lock, AlertTriangle, Key, Link } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfigList, updateConfig, refreshConfigCache, type SystemConfig } from '@/api/system/config'
import { getPasswordPolicy, updatePasswordPolicy, type PasswordPolicy } from '@/api/system/password_policy'
import { getSSOConfigs, updateSSOConfig, type SSOConfig } from '@/api/system/sso'

const SystemSettings = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'notification' | 'sso' | 'advanced'>('basic')
  const [successMessage, setSuccessMessage] = useState('')
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())

  const [ssoConfigs, setSsoConfigs] = useState<SSOConfig[]>([])
  const [ssoConfigDirty, setSsoConfigDirty] = useState(false)

  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    min_length: 6,
    max_length: 20,
    require_uppercase: true,
    require_lowercase: true,
    require_digit: true,
    require_special: false,
    history_count: 3,
    expiration_days: 0,
    same_as_username: true
  })

  const { data: configData, isLoading } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: async () => {
      const result = await getConfigList({ page: 1, page_size: 100 })
      return result.rows || []
    }
  })

  useQuery({
    queryKey: ['ssoConfigs'],
    queryFn: async () => {
      const result = await getSSOConfigs()
      setSsoConfigs(result)
      return result
    }
  })

  const { data: policyData } = useQuery({
    queryKey: ['passwordPolicy'],
    queryFn: getPasswordPolicy
  })

  useState(() => {
    if (policyData) {
      setPasswordPolicy(policyData)
    }
  })

  const configs = configData || []

  const getConfigValue = (key: string, defaultValue: string = ''): string => {
    const config = configs.find(c => c.config_key === key)
    return config?.config_value || defaultValue
  }

  const getConfig = (key: string): SystemConfig | undefined => {
    return configs.find(c => c.config_key === key)
  }

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const config = getConfig(key)
      if (!config) throw new Error('配置不存在')
      setLoadingKeys(prev => new Set(prev).add(key))
      await updateConfig(config.id, { config_value: value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfigs'] })
      setSuccessMessage('保存成功')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setSuccessMessage(`保存失败: ${error.message}`)
      setTimeout(() => setSuccessMessage(''), 5000)
    },
    onSettled: () => {
      setLoadingKeys(new Set())
    }
  })

  const passwordPolicyMutation = useMutation({
    mutationFn: async (data: PasswordPolicy) => {
      await updatePasswordPolicy(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwordPolicy'] })
      setSuccessMessage('密码策略保存成功')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setSuccessMessage(`密码策略保存失败: ${error.message}`)
      setTimeout(() => setSuccessMessage(''), 5000)
    }
  })

  const refreshCacheMutation = useMutation({
    mutationFn: refreshConfigCache,
    onSuccess: () => {
      setSuccessMessage('缓存刷新成功')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  })

  const handleSave = (key: string, value: string) => {
    updateConfigMutation.mutate({ key, value })
  }

  const handlePasswordPolicyChange = (key: keyof PasswordPolicy, value: any) => {
    setPasswordPolicy(prev => ({ ...prev, [key]: value }))
  }

  const handleSavePasswordPolicy = () => {
    passwordPolicyMutation.mutate(passwordPolicy)
  }

  const tabs = [
    { id: 'basic', label: '基本信息', icon: Globe },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'notification', label: '通知设置', icon: Bell },
    { id: 'sso', label: 'SSO 登录', icon: Link },
    { id: 'advanced', label: '高级设置', icon: Lock },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-1">配置系统运行参数和功能选项</p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Save className="w-5 h-5 mr-2" />
          {successMessage}
        </div>
      )}

      <div className="flex space-x-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-700">设置分类</span>
              </div>
            </div>
            <nav className="py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full px-4 py-3 flex items-center text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'basic' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">基本信息</h2>
                <p className="text-sm text-gray-500 mt-1">配置系统基本显示信息</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    系统名称
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      id="sys.index.sitename"
                      defaultValue={getConfigValue('sys.index.sitename', 'Admin System')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="请输入系统名称"
                    />
                    <button
                      onClick={() => handleSave(
                        'sys.index.sitename',
                        (document.getElementById('sys.index.sitename') as HTMLInputElement).value
                      )}
                      disabled={loadingKeys.has('sys.index.sitename')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                    >
                      {loadingKeys.has('sys.index.sitename') ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-2">保存</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">系统标题，将显示在浏览器标签页和登录页面</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    系统Logo
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      id="sys.index.logo"
                      defaultValue={getConfigValue('sys.index.logo', '')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="请输入Logo URL"
                    />
                    <button
                      onClick={() => handleSave(
                        'sys.index.logo',
                        (document.getElementById('sys.index.logo') as HTMLInputElement).value
                      )}
                      disabled={loadingKeys.has('sys.index.logo')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                    >
                      {loadingKeys.has('sys.index.logo') ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-2">保存</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">系统Logo图片URL，建议尺寸 200x60 像素</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    版权信息
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      id="sys.index.copyright"
                      defaultValue={getConfigValue('sys.index.copyright', '© 2024 Admin System')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="请输入版权信息"
                    />
                    <button
                      onClick={() => handleSave(
                        'sys.index.copyright',
                        (document.getElementById('sys.index.copyright') as HTMLInputElement).value
                      )}
                      disabled={loadingKeys.has('sys.index.copyright')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                    >
                      {loadingKeys.has('sys.index.copyright') ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-2">保存</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">页面底部显示的版权信息</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">账户安全</h2>
                  <p className="text-sm text-gray-500 mt-1">配置账户和访问安全策略</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">登录验证码</h3>
                      <p className="text-sm text-gray-500 mt-1">启用后登录时需要输入图形验证码</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="sys.account.captchaEnabled"
                        defaultChecked={getConfigValue('sys.account.captchaEnabled', 'true') === 'true'}
                        className="sr-only peer"
                        onChange={(e) => handleSave('sys.account.captchaEnabled', e.target.checked.toString())}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">记住登录</h3>
                      <p className="text-sm text-gray-500 mt-1">登录页面显示"记住登录"选项</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="sys.account.rememberMe"
                        defaultChecked={getConfigValue('sys.account.rememberMe', 'true') === 'true'}
                        className="sr-only peer"
                        onChange={(e) => handleSave('sys.account.rememberMe', e.target.checked.toString())}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">用户注册</h3>
                      <p className="text-sm text-gray-500 mt-1">允许新用户自主注册账户</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="sys.account.registerEnabled"
                        defaultChecked={getConfigValue('sys.account.registerEnabled', 'false') === 'true'}
                        className="sr-only peer"
                        onChange={(e) => handleSave('sys.account.registerEnabled', e.target.checked.toString())}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会话超时时间（分钟）
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        id="sys.expire.time"
                        defaultValue={getConfigValue('sys.expire.time', '30')}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min="5"
                        max="1440"
                      />
                      <button
                        onClick={() => handleSave(
                          'sys.expire.time',
                          (document.getElementById('sys.expire.time') as HTMLInputElement).value
                        )}
                        disabled={loadingKeys.has('sys.expire.time')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                      >
                        {loadingKeys.has('sys.expire.time') ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="ml-2">保存</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">无操作后自动退出登录的时间，建议设置为 30-120 分钟</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-primary-500" />
                      密码策略
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">配置密码强度和安全要求</p>
                  </div>
                  <button
                    onClick={handleSavePasswordPolicy}
                    disabled={passwordPolicyMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                  >
                    {passwordPolicyMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="ml-2">保存策略</span>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        密码最小长度
                      </label>
                      <input
                        type="number"
                        value={passwordPolicy.min_length}
                        onChange={(e) => handlePasswordPolicyChange('min_length', parseInt(e.target.value) || 6)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={4}
                        max={32}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        密码最大长度
                      </label>
                      <input
                        type="number"
                        value={passwordPolicy.max_length}
                        onChange={(e) => handlePasswordPolicyChange('max_length', parseInt(e.target.value) || 20)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={8}
                        max={64}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordPolicy.require_uppercase}
                        onChange={(e) => handlePasswordPolicyChange('require_uppercase', e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">必须包含大写字母 (A-Z)</span>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordPolicy.require_lowercase}
                        onChange={(e) => handlePasswordPolicyChange('require_lowercase', e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">必须包含小写字母 (a-z)</span>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordPolicy.require_digit}
                        onChange={(e) => handlePasswordPolicyChange('require_digit', e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">必须包含数字 (0-9)</span>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordPolicy.require_special}
                        onChange={(e) => handlePasswordPolicyChange('require_special', e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">必须包含特殊字符 (!@#$...)</span>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordPolicy.same_as_username}
                        onChange={(e) => handlePasswordPolicyChange('same_as_username', e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">禁止与用户名相同</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        密码历史记录
                      </label>
                      <input
                        type="number"
                        value={passwordPolicy.history_count}
                        onChange={(e) => handlePasswordPolicyChange('history_count', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={0}
                        max={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">不能重复使用最近N次密码，0表示不限制</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        密码有效期（天）
                      </label>
                      <input
                        type="number"
                        value={passwordPolicy.expiration_days}
                        onChange={(e) => handlePasswordPolicyChange('expiration_days', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={0}
                        max={365}
                      />
                      <p className="text-xs text-gray-500 mt-1">0表示不限制，建议设置为90天</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="font-medium text-amber-800">密码强度建议</h4>
                        <ul className="text-sm text-amber-700 mt-2 space-y-1">
                          <li>• 密码长度至少8位，推荐12位以上</li>
                          <li>• 同时包含大小写字母、数字和特殊字符</li>
                          <li>• 开启密码历史记录，防止频繁使用相同密码</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notification' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">通知设置</h2>
                <p className="text-sm text-gray-500 mt-1">配置系统通知和提醒功能</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">操作日志</h3>
                    <p className="text-sm text-gray-500 mt-1">记录用户的重要操作行为</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="sys.operLog.enabled"
                      defaultChecked={getConfigValue('sys.operLog.enabled', 'true') === 'true'}
                      className="sr-only peer"
                      onChange={(e) => handleSave('sys.operLog.enabled', e.target.checked.toString())}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">登录日志</h3>
                    <p className="text-sm text-gray-500 mt-1">记录用户登录和退出行为</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="sys.loginLog.enabled"
                      defaultChecked={getConfigValue('sys.loginLog.enabled', 'true') === 'true'}
                      className="sr-only peer"
                      onChange={(e) => handleSave('sys.loginLog.enabled', e.target.checked.toString())}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sso' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">SSO 单点登录</h2>
                <p className="text-sm text-gray-500 mt-1">配置第三方 OAuth 登录，用户可使用 GitHub/Gitee 等账号登录系统</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm mb-4">
                  配置说明：需要在对应 OAuth 提供商处创建 OAuth App，回调 URL 设为 <code className="bg-blue-100 px-1 rounded">http://localhost:8000/api/v1/sso/callback/&#123;provider&#125;</code>
                </div>

                {ssoConfigs
                  .filter(c => c.key.startsWith('sso.github') || c.key.startsWith('sso.gitee') || c.key === 'sso.enabled')
                  .reduce((groups: any[], config) => {
                    const prefix = config.key.split('.').slice(0, 2).join('.')
                    const group = groups.find(g => g.prefix === prefix)
                    if (group) group.configs.push(config)
                    else groups.push({ prefix, label: prefix === 'sso.github' ? 'GitHub 登录' : prefix === 'sso.gitee' ? 'Gitee 登录' : '全局设置', configs: [config] })
                    return groups
                  }, [])
                  .map((group) => (
                    <div key={group.prefix} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">{group.label}</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {group.configs.map((config: SSOConfig) => {
                          const isSecret = config.key.includes('secret')
                          const isToggle = config.value === 'true' || config.value === 'false'
                          return (
                            <div key={config.id}>
                              {isToggle ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">{config.description}</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={ssoConfigs.find(c => c.id === config.id)?.value === 'true'}
                                      className="sr-only peer"
                                      onChange={() => {
                                        const newVal = ssoConfigs.find(c => c.id === config.id)?.value === 'true' ? 'false' : 'true'
                                        setSsoConfigs(prev => prev.map(c => c.id === config.id ? { ...c, value: newVal } : c))
                                        setSsoConfigDirty(true)
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                  </label>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{config.description}</label>
                                  <input
                                    type={isSecret ? 'password' : 'text'}
                                    value={ssoConfigs.find(c => c.id === config.id)?.value || ''}
                                    onChange={(e) => {
                                      setSsoConfigs(prev => prev.map(c => c.id === config.id ? { ...c, value: e.target.value } : c))
                                      setSsoConfigDirty(true)
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder={`请输入${config.description}`}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                {ssoConfigDirty && (
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          for (const config of ssoConfigs) {
                            const original = (await getSSOConfigs()).find((c: SSOConfig) => c.id === config.id)
                            if (original && original.value !== config.value) {
                              await updateSSOConfig(config.id, config.value)
                            }
                          }
                          setSsoConfigDirty(false)
                          queryClient.invalidateQueries({ queryKey: ['ssoConfigs'] })
                          toast.success('SSO 配置保存成功')
                        } catch {
                          toast.error('保存失败')
                        }
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存 SSO 配置
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">高级设置</h2>
                <p className="text-sm text-gray-500 mt-1">系统高级配置和运维选项</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新用户初始密码
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      id="sys.user.initPassword"
                      defaultValue={getConfigValue('sys.user.initPassword', '123456')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="请输入初始密码"
                    />
                    <button
                      onClick={() => handleSave(
                        'sys.user.initPassword',
                        (document.getElementById('sys.user.initPassword') as HTMLInputElement).value
                      )}
                      disabled={loadingKeys.has('sys.user.initPassword')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                    >
                      {loadingKeys.has('sys.user.initPassword') ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-2">保存</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">新增用户时的默认密码，请及时通知用户修改</p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">配置管理</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">系统配置缓存</h4>
                        <p className="text-sm text-blue-600 mt-1">刷新配置缓存使最新设置生效</p>
                      </div>
                      <button
                        onClick={() => refreshCacheMutation.mutate()}
                        disabled={refreshCacheMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                      >
                        {refreshCacheMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span className="ml-2">刷新缓存</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">配置列表</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">配置名称</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">配置键名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">配置值</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {configs.map((config) => (
                          <tr key={config.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{config.config_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 font-mono">{config.config_key}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {config.config_type === 'boolean' ? (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  config.config_value === 'true' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {config.config_value === 'true' ? '启用' : '停用'}
                                </span>
                              ) : (
                                <span className="truncate max-w-xs inline-block">{config.config_value}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                {config.config_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemSettings
