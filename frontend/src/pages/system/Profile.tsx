import { useState, useEffect } from 'react'
import { User, Lock, History, Upload, Clock, LogIn, Monitor, Globe, Smartphone, CheckCircle2, AlertCircle, X, Eye, EyeOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateProfile, updatePassword } from '@/api/system/profile'
import { getLoginLogs, type LoginLog } from '@/api/log'
import { profileSchema, changePasswordSchema, type ProfileForm, type ChangePasswordForm } from '@/utils/validation'
import { InputField } from '@/components/FormField'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator'
import { useToast } from '@/hooks/useToast'

const Profile = () => {
  const queryClient = useQueryClient()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)
  const userInfo = useAuthStore(s => s.userInfo)
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'history'>('profile')
  const [historyPage, setHistoryPage] = useState(1)

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [avatar, setAvatar] = useState('')

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: '', email: '', phone: '', avatar: '' },
  })

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  })

  const { data: remoteInfo, isLoading } = useQuery({
    queryKey: ['userInfo'],
    queryFn: getUserProfile,
  })

  const actualUserInfo = remoteInfo?.data || remoteInfo

  const { data: loginLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ['loginHistory', historyPage],
    queryFn: () => getLoginLogs({
      username: userInfo?.username,
      page: historyPage,
      page_size: 10,
    }),
    enabled: activeTab === 'history',
  })

  const loginLogs = loginLogsData?.rows || []
  const loginLogsTotal = loginLogsData?.total || 0

  useEffect(() => {
    if (actualUserInfo) {
      setAvatar(actualUserInfo.avatar || '')
      profileForm.reset({
        nickname: actualUserInfo.nickname || '',
        email: actualUserInfo.email || '',
        phone: actualUserInfo.phone || '',
        avatar: actualUserInfo.avatar || '',
      })
    }
  }, [actualUserInfo])

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => updateProfile(data),
    onSuccess: () => {
      toast.success('个人信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['userInfo'] })
      updateUserInfo({
        nickname: profileForm.getValues('nickname'),
        email: profileForm.getValues('email'),
        phone: profileForm.getValues('phone'),
        avatar: profileForm.getValues('avatar'),
      })
    },
    onError: (error: any) => {
      toast.error('更新失败', error?.response?.data?.detail)
    }
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) => updatePassword(data),
    onSuccess: () => {
      toast.success('密码修改成功')
      passwordForm.reset()
    },
    onError: (error: any) => {
      toast.error('密码修改失败', error?.response?.data?.detail)
    }
  })

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('头像文件不能超过2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const url = event.target?.result as string
      setAvatar(url)
      profileForm.setValue('avatar', url)
    }
    reader.readAsDataURL(file)
  }

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: ChangePasswordForm) => {
    updatePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    })
  }

  const formatTime = (t: string) => new Date(t).toLocaleString()

  const getStatusBadge = (status: number) => {
    return status === 1
      ? <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded"><CheckCircle2 size={12} className="mr-1" />成功</span>
      : <span className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded"><AlertCircle size={12} className="mr-1" />失败</span>
  }

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
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
        <p className="text-gray-600 mt-1">管理您的个人信息和账户设置</p>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden ring-4 ring-primary-50">
              {avatar || actualUserInfo?.avatar ? (
                <img src={avatar || actualUserInfo?.avatar} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{actualUserInfo?.username}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{actualUserInfo?.nickname}</p>
            <div className="flex items-center space-x-2 mt-2">
              {actualUserInfo?.roles?.map((role: string) => (
                <span key={role} className="px-2 py-0.5 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>ID: {actualUserInfo?.id}</p>
            <p className="mt-1">邮箱: {actualUserInfo?.email || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {([
              { key: 'profile' as const, label: '基本信息', icon: User },
              { key: 'password' as const, label: '修改密码', icon: Lock },
              { key: 'history' as const, label: '登录历史', icon: History },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key ? 'text-primary-600 border-primary-600' : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="max-w-2xl space-y-6">
              {profileForm.formState.errors.root && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {profileForm.formState.errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="用户名"
                  value={actualUserInfo?.username || ''}
                  disabled
                  className="bg-gray-100 text-gray-500"
                  readOnly
                />
                <InputField
                  label="昵称"
                  required
                  error={profileForm.formState.errors.nickname?.message}
                  {...profileForm.register('nickname')}
                />
                <InputField
                  label="邮箱"
                  error={profileForm.formState.errors.email?.message}
                  {...profileForm.register('email')}
                />
                <InputField
                  label="手机号"
                  error={profileForm.formState.errors.phone?.message}
                  {...profileForm.register('phone')}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="max-w-md space-y-6">
              {passwordForm.formState.errors.root && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {passwordForm.formState.errors.root.message}
                </div>
              )}

              <div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">原密码 <span className="text-red-500">*</span></label>
                  <input
                    type={showOld ? 'text' : 'password'}
                    {...passwordForm.register('oldPassword')}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      passwordForm.formState.errors.oldPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="请输入原密码"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600">
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.formState.errors.oldPassword && (
                  <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.oldPassword.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">新密码 <span className="text-red-500">*</span></label>
                  <input
                    type={showNew ? 'text' : 'password'}
                    {...passwordForm.register('newPassword')}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      passwordForm.formState.errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="请输入新密码（至少6位）"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                )}
                {passwordForm.watch('newPassword') && (
                  <div className="mt-2"><PasswordStrengthIndicator password={passwordForm.watch('newPassword')} /></div>
                )}
              </div>

              <div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">确认密码 <span className="text-red-500">*</span></label>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    {...passwordForm.register('confirmPassword')}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      passwordForm.formState.errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="请再次输入新密码"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
                {passwordForm.watch('confirmPassword') && !passwordForm.formState.errors.confirmPassword && (
                  <p className={`mt-1 text-xs ${
                    passwordForm.watch('newPassword') === passwordForm.watch('confirmPassword')
                      ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {passwordForm.watch('newPassword') === passwordForm.watch('confirmPassword')
                      ? '✓ 密码一致' : '✗ 两次输入的密码不一致'}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button type="submit" disabled={updatePasswordMutation.isPending}
                  className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  <Lock className="w-4 h-4 mr-2" />
                  {updatePasswordMutation.isPending ? '修改中...' : '修改密码'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {logsLoading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>暂无登录记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {loginLogs.map((log: LoginLog) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.status === 1 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {log.status === 1 ? <LogIn className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{log.username}</span>
                            {getStatusBadge(log.status)}
                          </div>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center"><Globe size={12} className="mr-1" />{log.ip_address || '-'}</span>
                            <span className="flex items-center"><Monitor size={12} className="mr-1" />{log.browser || '未知'}</span>
                            <span className="flex items-center"><Smartphone size={12} className="mr-1" />{log.os || '未知'}</span>
                          </div>
                          {log.msg && log.status === 0 && <p className="text-xs text-red-500 mt-0.5">{log.msg}</p>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center flex-shrink-0">
                        <Clock size={12} className="mr-1" />{formatTime(log.create_time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loginLogsTotal > 10 && (
                <div className="flex justify-center space-x-2 pt-2">
                  <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">上一页</button>
                  <span className="px-4 py-2 text-sm text-gray-500">第 {historyPage} / {Math.ceil(loginLogsTotal / 10)} 页</span>
                  <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage >= Math.ceil(loginLogsTotal / 10)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
