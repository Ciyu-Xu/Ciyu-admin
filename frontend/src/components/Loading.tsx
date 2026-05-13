const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-gray-500">
      <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      <p className="mt-2">加载中...</p>
    </div>
  </div>
)

export default Loading
