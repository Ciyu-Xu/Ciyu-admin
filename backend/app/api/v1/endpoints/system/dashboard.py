from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import logging

from app.db.session import get_db
from app.models.user import User, Role, Dept
from app.models.log import OperationLog
from app.models.notice import Notice
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user
from app.core.cache import cache_key
from app.core.redis_client import get_cache, set_cache

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard/stats", response_model=ResponseModel)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取仪表盘统计数据"""
    import json
    key = cache_key("dashboard:stats")
    cached = await get_cache(key)
    if cached:
        return json.loads(cached)

    logger.info(f"[Dashboard] 当前用户: {current_user.username}")

    today = datetime.now()
    first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_day_of_last_month = (first_day_of_month - timedelta(days=1)).replace(day=1)

    total_users_result = await db.execute(select(func.count()).select_from(User))
    total_users = total_users_result.scalar() or 0

    total_users_last_month_result = await db.execute(
        select(func.count()).select_from(User).where(User.created_at < first_day_of_month)
    )
    total_users_last_month = total_users_last_month_result.scalar() or 0

    total_roles_result = await db.execute(select(func.count()).select_from(Role))
    total_roles = total_roles_result.scalar() or 0

    total_depts_result = await db.execute(select(func.count()).select_from(Dept))
    total_depts = total_depts_result.scalar() or 0

    online_users_result = await db.execute(
        select(func.count()).select_from(User).where(User.status == 1)
    )
    online_users = online_users_result.scalar() or 0

    result = {
        "code": 200,
        "message": "操作成功",
        "data": {
            "totalUsers": total_users,
            "totalUsersLastMonth": total_users_last_month,
            "onlineUsers": online_users,
            "totalRoles": total_roles,
            "totalDepts": total_depts,
        }
    }

    await set_cache(key, json.dumps(result, default=str), ttl=60)
    return result


@router.get("/dashboard/recent-activities", response_model=ResponseModel)
async def get_recent_activities(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取最近操作日志"""
    logger.info(f"[Dashboard] 查询最近操作日志, limit={limit}")
    
    result = await db.execute(
        select(OperationLog)
        .order_by(OperationLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    logger.info(f"[Dashboard] 获取到 {len(logs)} 条操作日志")
    
    rows = []
    for log in logs:
        rows.append({
            "id": log.id,
            "username": log.username,
            "ip_address": log.ip_address,
            "method": log.method,
            "url": log.url,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": len(rows)
        }
    }


@router.get("/dashboard/notices", response_model=ResponseModel)
async def get_notices(
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取系统公告"""
    logger.info(f"[Dashboard] 查询系统公告, limit={limit}")
    
    result = await db.execute(
        select(Notice)
        .where(Notice.status == 1)
        .order_by(Notice.created_at.desc())
        .limit(limit)
    )
    notices = result.scalars().all()
    logger.info(f"[Dashboard] 获取到 {len(notices)} 条公告")
    
    rows = []
    for notice in notices:
        rows.append({
            "id": notice.id,
            "notice_title": notice.title,
            "notice_content": notice.content,
            "notice_type": notice.type,
            "is_popup": notice.is_popup,
            "create_time": notice.created_at.isoformat() if notice.created_at else None,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": len(rows)
        }
    }
