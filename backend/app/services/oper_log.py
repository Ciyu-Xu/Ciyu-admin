import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.log import OperationLog
from app.models.user import User

logger = logging.getLogger(__name__)


class OperLogService:
    """操作日志服务"""

    @staticmethod
    async def create_log(
        db: AsyncSession,
        user: User,
        method: str,
        url: str,
        ip_address: Optional[str] = None,
        query_params: Optional[str] = None,
        body_params: Optional[str] = None,
        status: int = 1,
        error_message: Optional[str] = None,
        duration: int = 0,
    ) -> OperationLog:
        log = OperationLog(
            user_id=user.id if user else None,
            username=user.username if user else "系统",
            method=method,
            url=url,
            ip_address=ip_address,
            query_params=query_params,
            body_params=body_params,
            status=status,
            error_message=error_message,
            duration=duration,
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log
