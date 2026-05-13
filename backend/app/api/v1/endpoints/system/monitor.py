from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from datetime import datetime
import psutil
import platform
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user
from app.core.online_user import online_user_service
from app.core.security import add_token_blacklist
from app.schemas.user import ResponseModel

router = APIRouter()


@router.post("/online/heartbeat", response_model=ResponseModel)
async def update_heartbeat(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新会话心跳（用于保持在线状态）"""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    
    await online_user_service.update_activity(db, token)
    
    return {"code": 200, "message": "心跳更新成功"}


@router.get("/online", response_model=ResponseModel)
async def get_online_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取在线用户列表"""
    result = await online_user_service.get_online_users(db, page, page_size)
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": result
    }


@router.delete("/online/{session_id}", response_model=ResponseModel)
async def force_logout(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """强制下线用户"""
    success = await online_user_service.force_logout(db, session_id=session_id)
    
    if success:
        return {"code": 200, "message": "强制下线成功"}
    return {"code": 200, "message": "用户不在线"}


@router.post("/online/force-logout-all", response_model=ResponseModel)
async def force_logout_all(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """强制下线除当前用户外的所有用户"""
    auth_header = request.headers.get("Authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header else ""
    
    count = await online_user_service.force_logout_all_except_current(db, current_token)
    
    return {"code": 200, "message": f"已强制下线 {count} 个用户"}


@router.post("/online/cleanup", response_model=ResponseModel)
async def cleanup_inactive_sessions(
    minutes: int = Query(30, ge=1, le=1440),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """清理不活跃的会话"""
    count = await online_user_service.cleanup_inactive_sessions(db, minutes)
    
    return {"code": 200, "message": f"已清理 {count} 个不活跃会话"}


@router.get("/status", response_model=ResponseModel)
async def get_system_status(
    current_user: User = Depends(get_current_user)
):
    """获取系统状态"""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    
    net_io = psutil.net_io_counters()
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "cpu": {
                "usage": cpu_percent,
                "count": cpu_count,
                "frequency": cpu_freq.current if cpu_freq else 0,
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent,
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
            },
            "platform": {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
            },
            "timestamp": datetime.now().isoformat()
        }
    }


@router.get("/server/info", response_model=ResponseModel)
async def get_server_info(
    current_user: User = Depends(get_current_user)
):
    """获取服务器信息"""
    boot_time = psutil.boot_time()
    uptime = datetime.now().timestamp() - boot_time
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "boot_time": datetime.fromtimestamp(boot_time).isoformat(),
            "uptime_seconds": int(uptime),
            "uptime_formatted": format_uptime(uptime),
            "cpu_count": {
                "physical": psutil.cpu_count(logical=False),
                "logical": psutil.cpu_count(logical=True),
            },
            "memory_total": psutil.virtual_memory().total,
            "disk_total": psutil.disk_usage('/').total,
        }
    }


def format_uptime(seconds: float) -> str:
    """格式化运行时间"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{days}天 {hours}小时 {minutes}分钟"
