import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, User, Lock, Shield, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { getPublicConfig } from '@/api/system/publicConfig'
import { getCaptcha } from '@/api/system/captcha'
import { getSSOProviders, getSSOLoginUrl, type SSOProvider } from '@/api/system/sso'

const Login = () => {
  const navigate = useNavigate()
  const { login, rememberedUsername } = useAuthStore()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    captcha: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // 配置项
  const [siteName, setSiteName] = useState('Admin System')
  const [copyright, setCopyright] = useState('© 2024 Admin System')
  const [captchaEnabled, setCaptchaEnabled] = useState(true)
  const [rememberMeEnabled, setRememberMeEnabled] = useState(true)

  // 验证码
  const [captchaImage, setCaptchaImage] = useState('')
  const [sessionId, setSessionId] = useState('')

  // SSO
  const [ssoProviders, setSsoProviders] = useState<SSOProvider[]>([])

  // 从 store 恢复记住的用户名
  useEffect(() => {
    if (rememberedUsername) {
      setFormData(prev => ({ ...prev, username: rememberedUsername }))
      setRememberMe(true)
    }
  }, [rememberedUsername])

  // 加载公开配置
  useEffect(() => {
    const loadPublicConfig = async () => {
      try {
        const res = await getPublicConfig()
        if (res) {
          if (res['sys.index.sitename']) {
            setSiteName(res['sys.index.sitename'])
            document.title = res['sys.index.sitename']
          }
          if (res['sys.index.copyright']) {
            setCopyright(res['sys.index.copyright'])
          }
          if (res['sys.account.captchaEnabled']) {
            setCaptchaEnabled(res['sys.account.captchaEnabled'] === 'true')
          }
          if (res['sys.account.rememberMe']) {
            setRememberMeEnabled(res['sys.account.rememberMe'] === 'true')
          }
          if (res['sys.account.captchaEnabled'] === 'true') {
            loadCaptcha()
          }
        }
      } catch (err) {
        console.error('加载配置失败:', err)
      }
    }
    loadPublicConfig()
    loadSSOProviders()
  }, [])

  const loadSSOProviders = async () => {
    try {
      const providers = await getSSOProviders()
      setSsoProviders(providers)
    } catch {} // SSO 未配置时静默失败
  }

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      setCaptchaLoading(true)
      const res = await getCaptcha()
      if (res) {
        setCaptchaImage(res.image)
        setSessionId(res.session_id)
      }
    } catch (err) {
      console.error('加载验证码失败:', err)
    } finally {
      setCaptchaLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData.username, formData.password, formData.captcha, sessionId, rememberMe)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || '登录失败')
      if (captchaEnabled) {
        loadCaptcha()
        setFormData(prev => ({ ...prev, captcha: '' }))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSSOLogin = async (provider: string) => {
    try {
      const res = await getSSOLoginUrl(provider)
      window.location.href = res.authorize_url
    } catch (err: any) {
      setError(err.message || 'SSO 登录失败')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10 text-center text-white px-8">
          <h1 className="text-5xl font-bold mb-6">{siteName}</h1>
          <p className="text-xl opacity-90">现代化管理后台系统</p>
          <p className="mt-4 text-sm opacity-75">基于 Python + React 的高性能架构</p>

          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">Fast</div>
              <div className="text-sm opacity-75">极速响应</div>
            </div>
            <div>
              <div className="text-3xl font-bold">Safe</div>
              <div className="text-sm opacity-75">安全可靠</div>
            </div>
            <div>
              <div className="text-3xl font-bold">Modern</div>
              <div className="text-sm opacity-75">现代技术</div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">欢迎登录</h2>
              <p className="mt-2 text-gray-600">请使用您的账号密码登录系统</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    placeholder="请输入用户名"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* 验证码 - 根据配置显示/隐藏 */}
              {captchaEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <div className="flex space-x-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="captcha"
                        value={formData.captcha}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                        placeholder="请输入验证码"
                        maxLength={4}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      disabled={captchaLoading}
                      className="w-28 h-12 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden"
                    >
                      {captchaLoading ? (
                        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : captchaImage ? (
                        <img 
                          src={captchaImage} 
                          alt="验证码" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">点击加载</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 记住密码 - 根据配置显示/隐藏 */}
              {rememberMeEnabled && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                      记住登录
                    </label>
                  </div>
                  <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
                    忘记密码？
                  </a>
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/register" className="text-sm text-primary-600 hover:text-primary-500">
                没有账号？立即注册
              </Link>
            </div>

            {/* SSO 单点登录 */}
            {ssoProviders.length > 0 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">第三方登录</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center space-x-6">
                  {ssoProviders.map((provider) => (
                    <button
                      key={provider.name}
                      onClick={() => handleSSOLogin(provider.name)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      title={provider.label}
                    >
                      {provider.icon === 'github' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#333">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                      )}
                      {provider.icon === 'gitee' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#C71D23">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 11.5h-11c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5h11c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            {copyright}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
