import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-600">404</h1>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gray-900">页面未找到</h2>
            <p className="mt-2 text-gray-600">抱歉，您访问的页面不存在或已被移除</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回上一页
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
