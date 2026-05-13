from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, BigInteger, Integer, Text, Boolean, DateTime, SmallInteger, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TaskJob(Base):
    """定时任务模型"""
    __tablename__ = "sys_task"
    __table_args__ = {"comment": "定时任务表"}

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="任务名称")
    task_group: Mapped[Optional[str]] = mapped_column(String(50), comment="任务分组")
    code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="任务编码")
    function_name: Mapped[Optional[str]] = mapped_column(String(100), comment="函数名")
    function_args: Mapped[Optional[str]] = mapped_column(Text, comment="函数参数")
    cron_expression: Mapped[Optional[str]] = mapped_column(String(100), comment="Cron表达式")
    interval_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="间隔秒数")
    task_type: Mapped[Optional[str]] = mapped_column(String(20), default="http", comment="任务类型 http/function")
    target: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="HTTP目标地址")
    method: Mapped[Optional[str]] = mapped_column(String(10), default="GET", comment="HTTP请求方法")
    headers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="HTTP请求头")
    params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="HTTP查询参数")
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="HTTP请求体")
    timeout: Mapped[Optional[int]] = mapped_column(Integer, default=30, comment="超时时间(秒)")
    retry_count: Mapped[int] = mapped_column(Integer, default=0, comment="重试次数")
    retry_interval: Mapped[int] = mapped_column(Integer, default=60, comment="重试间隔(秒)")
    status: Mapped[str] = mapped_column(String(10), default="1", comment="状态 0-禁用 1-启用")
    is_async: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否异步执行")
    remark: Mapped[Optional[str]] = mapped_column(Text, comment="备注")
    create_user: Mapped[Optional[int]] = mapped_column(BigInteger, comment="创建人ID")
    update_user: Mapped[Optional[int]] = mapped_column(BigInteger, comment="更新人ID")
    total_runs: Mapped[int] = mapped_column(Integer, default=0, comment="总执行次数")
    success_runs: Mapped[int] = mapped_column(Integer, default=0, comment="成功次数")
    fail_runs: Mapped[int] = mapped_column(Integer, default=0, comment="失败次数")
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), comment="上次执行时间(旧)")
    last_run_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment="上次执行时间")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment="更新时间")

    def __repr__(self) -> str:
        return f"<TaskJob(id={self.id}, name={self.name})>"


class TaskLog(Base):
    """任务执行日志模型"""
    __tablename__ = "sys_task_log"
    __table_args__ = {"comment": "任务执行日志表"}

    task_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, comment="任务ID(旧)")
    task_name: Mapped[Optional[str]] = mapped_column(String(100), comment="任务名称(旧)")
    task_group: Mapped[Optional[str]] = mapped_column(String(50), comment="任务分组")
    status: Mapped[int] = mapped_column(SmallInteger, default=0, comment="执行状态 0-失败 1-成功")
    result: Mapped[Optional[str]] = mapped_column(Text, comment="执行结果(旧)")
    error_message: Mapped[Optional[str]] = mapped_column(Text, comment="错误信息(旧)")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), comment="开始时间")
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), comment="结束时间")

    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, comment="任务ID")
    job_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="任务名称")
    job_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="任务编码")
    trigger_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment="触发方式 cron/manual/retry")
    execution_time: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="执行耗时(毫秒)")
    response_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="响应数据")
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="错误信息")
    request_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="请求参数")

    def __repr__(self) -> str:
        return f"<TaskLog(id={self.id}, job_name={self.job_name})>"