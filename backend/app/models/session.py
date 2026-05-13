from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class UserSession(Base):
    """用户会话模型"""
    __tablename__ = "sys_user_session"
    __table_args__ = {"comment": "用户会话表"}

    user_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="用户ID")
    username: Mapped[str] = mapped_column(String(50), nullable=False, comment="用户名")
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, comment="Token")
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), default="127.0.0.1", comment="登录IP")
    user_agent: Mapped[Optional[str]] = mapped_column(Text, comment="浏览器UserAgent")
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="登录时间")
    last_active_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="最后活跃时间")
    is_online: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否在线")
    session_id: Mapped[Optional[str]] = mapped_column(String(100), comment="会话ID")

    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, username={self.username})>"
