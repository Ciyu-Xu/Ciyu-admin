from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, DateTime, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PasswordPolicy(Base):
    """密码策略配置表"""
    __tablename__ = "sys_password_policy"
    __table_args__ = {"comment": "密码策略配置表"}

    min_length: Mapped[int] = mapped_column(Integer, default=6, comment="最小长度")
    max_length: Mapped[int] = mapped_column(Integer, default=20, comment="最大长度")
    require_uppercase: Mapped[int] = mapped_column(SmallInteger, default=1, comment="必须包含大写字母 0-否 1-是")
    require_lowercase: Mapped[int] = mapped_column(SmallInteger, default=1, comment="必须包含小写字母 0-否 1-是")
    require_digit: Mapped[int] = mapped_column(SmallInteger, default=1, comment="必须包含数字 0-否 1-是")
    require_special: Mapped[int] = mapped_column(SmallInteger, default=0, comment="必须包含特殊字符 0-否 1-是")
    history_count: Mapped[int] = mapped_column(Integer, default=0, comment="密码历史记录数量")
    expiration_days: Mapped[int] = mapped_column(Integer, default=0, comment="密码有效期(天)")
    same_as_username: Mapped[int] = mapped_column(SmallInteger, default=0, comment="禁止与用户名相同")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment="更新时间")

    def __repr__(self) -> str:
        return f"<PasswordPolicy(id={self.id}, min_length={self.min_length})>"