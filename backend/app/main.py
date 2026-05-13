from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 导入所有模型以确保它们被注册到 Base.metadata
    from app.models.user import User, Role, Menu
    from app.models.notice import Notice, NoticeRead
    from app.models.message import Message
    from app.models.log import LoginLog, OperationLog
    from app.models.session import UserSession
    from app.models.task import TaskJob, TaskLog
    from app.models.system_config import SystemConfig
    
    # 启动时执行 - 创建数据库表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 自动补齐缺失列
    from app.db.auto_migrate import auto_migrate
    await auto_migrate(engine)
    
    # 初始化基础数据
    from app.db.init_db import init_data
    from app.db.session import async_session
    from app.services.sso import init_sso_configs
    async with async_session() as session:
        await init_data(session)
        await init_sso_configs(session)
        await session.commit()
    
    # 启动任务调度器
    from app.core.task_scheduler import task_scheduler
    from app.db.session import async_session as db_session
    task_scheduler.start()
    async with db_session() as session:
        await task_scheduler.reload_all_jobs(session)
    
    # 初始化Redis连接
    from app.core.redis_client import init_redis
    try:
        await init_redis()
        print("✅ Redis 已连接")
    except Exception as e:
        print(f"⚠️ Redis 连接失败（不影响运行）: {e}")
    
    yield
    
    # 关闭任务调度器
    task_scheduler.stop()
    
    # 关闭Redis连接
    from app.core.redis_client import close_redis
    try:
        await close_redis()
    except Exception:
        pass
    
    # 关闭时执行
    await engine.dispose()


# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="现代管理后台系统API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")

# 挂载静态文件服务（头像上传目录）
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Welcome to Admin System API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
