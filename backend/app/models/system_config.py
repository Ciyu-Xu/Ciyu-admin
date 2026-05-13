from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, SmallInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class SystemConfig(Base):
    """系统配置模型"""
    __tablename__ = "sys_config"
    __table_args__ = {"comment": "系统配置表"}

    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="配置键名")
    value: Mapped[Optional[str]] = mapped_column(Text, comment="配置值")
    description: Mapped[Optional[str]] = mapped_column(String(255), comment="描述")
    type: Mapped[str] = mapped_column(String(20), default="string", comment="配置类型")
    is_public: Mapped[int] = mapped_column(SmallInteger, default=0, comment="是否公开 0-否 1-是")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment="更新时间")

    def __repr__(self) -> str:
        return f"<SystemConfig(id={self.id}, key={self.key})>"