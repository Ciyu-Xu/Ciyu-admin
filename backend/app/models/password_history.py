from datetime import datetime, timezone
from sqlalchemy import String, BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PasswordHistory(Base):
    """密码历史记录表"""
    __tablename__ = "sys_password_history"
    __table_args__ = {"comment": "密码历史记录表"}

    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, comment="用户ID")
    password: Mapped[str] = mapped_column(String(255), nullable=False, comment="加密后的密码")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")

    def __repr__(self) -> str:
        return f"<PasswordHistory(id={self.id}, user_id={self.user_id})>"