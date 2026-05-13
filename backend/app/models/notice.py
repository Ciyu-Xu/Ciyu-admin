from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, SmallInteger, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Notice(Base):
    """通知公告模型"""
    __tablename__ = "sys_notice"
    __table_args__ = {"comment": "通知公告表"}

    title: Mapped[str] = mapped_column(String(100), nullable=False, comment="公告标题")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="公告内容")
    type: Mapped[int] = mapped_column(SmallInteger, default=1, comment="公告类型 1-通知 2-公告")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    is_popup: Mapped[int] = mapped_column(SmallInteger, default=0, comment="是否弹窗 0-否 1-是")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment="更新时间")

    def __repr__(self) -> str:
        return f"<Notice(id={self.id}, title={self.title})>"


class NoticeRead(Base):
    """公告阅读记录"""
    __tablename__ = "sys_notice_read"
    __table_args__ = {"comment": "公告阅读记录表"}

    notice_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_notice.id", ondelete="CASCADE"), nullable=False, comment="公告ID")
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, comment="用户ID")
    username: Mapped[str] = mapped_column(String(50), nullable=False, comment="用户名")
    read_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="阅读时间")

    def __repr__(self) -> str:
        return f"<NoticeRead(notice_id={self.notice_id}, user_id={self.user_id})>"
