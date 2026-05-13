from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, BigInteger, Column, DateTime, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class OperationLog(Base):
    """操作日志模型"""
    __tablename__ = "sys_operation_log"
    __table_args__ = {"comment": "操作日志表"}

    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, comment="操作用户ID")
    username: Mapped[Optional[str]] = mapped_column(String(50), comment="用户名")
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), comment="IP地址")
    method: Mapped[Optional[str]] = mapped_column(String(10), comment="请求方式")
    url: Mapped[Optional[str]] = mapped_column(String(255), comment="请求URL")
    query_params: Mapped[Optional[str]] = mapped_column(Text, comment="查询参数")
    body_params: Mapped[Optional[str]] = mapped_column(Text, comment="请求参数")
    response: Mapped[Optional[str]] = mapped_column(Text, comment="返回结果")
    status: Mapped[Optional[int]] = mapped_column(SmallInteger, comment="操作状态")
    error_message: Mapped[Optional[str]] = mapped_column(Text, comment="错误消息")
    duration: Mapped[Optional[int]] = mapped_column(default=0, comment="耗时(毫秒)")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="操作时间")

    def __repr__(self) -> str:
        return f"<OperationLog(id={self.id}, username={self.username})>"


class LoginLog(Base):
    """登录日志模型"""
    __tablename__ = "sys_login_log"
    __table_args__ = {"comment": "登录日志表"}

    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, comment="用户ID")
    username: Mapped[Optional[str]] = mapped_column(String(50), comment="用户名")
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), comment="IP地址")
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), comment="用户代理")
    status: Mapped[int] = mapped_column(SmallInteger, nullable=False, comment="登录状态 0-失败 1-成功")
    message: Mapped[Optional[str]] = mapped_column(String(255), comment="提示消息")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="登录时间")

    def __repr__(self) -> str:
        return f"<LoginLog(id={self.id}, username={self.username})>"