from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, BigInteger, ForeignKey, DateTime, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Message(Base):
    """消息模型"""
    __tablename__ = "sys_message"
    __table_args__ = {"comment": "消息表"}

    from_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, comment="发送用户ID")
    to_user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, comment="接收用户ID")
    title: Mapped[str] = mapped_column(String(100), nullable=False, comment="消息标题")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")
    type: Mapped[str] = mapped_column(String(20), default="system", comment="消息类型")
    status: Mapped[int] = mapped_column(SmallInteger, default=0, comment="状态 0-未读 1-已读")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, title={self.title})>"