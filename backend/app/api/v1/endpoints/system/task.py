from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, and_

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.task import TaskJob, TaskLog
from app.core.task_scheduler import task_scheduler
from app.schemas.user import ResponseModel

def serialize_model(obj):
    """将SQLAlchemy模型转换为字典，排除内部属性"""
    if obj is None:
        return None
    result = {}
    for key, value in obj.__dict__.items():
        if not key.startswith('_'):
            if hasattr(value, '__dict__'):
                result[key] = serialize_model(value)
            else:
                result[key] = value
    return result

router = APIRouter()


@router.get("/job", response_model=ResponseModel)
async def get_task_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取定时任务列表"""
    conditions = []
    
    if name:
        conditions.append(TaskJob.name.ilike(f"%{name}%"))
    if status:
        conditions.append(TaskJob.status == status)
    if task_type:
        conditions.append(TaskJob.task_type == task_type)
    
    count_query = select(func.count()).select_from(TaskJob)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    query = select(TaskJob).offset(offset).limit(page_size).order_by(TaskJob.id.desc())
    if conditions:
        query = query.where(and_(*conditions))
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": [serialize_model(job) for job in jobs],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/job/{job_id}", response_model=ResponseModel)
async def get_task_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个任务详情"""
    result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        return {"code": 404, "message": "任务不存在", "data": None}
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": serialize_model(job)
    }


@router.post("/job", response_model=ResponseModel)
async def create_task_job(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建定时任务"""
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()
    
    if not name or not code:
        return {"code": 400, "message": "任务名称和编码不能为空", "data": None}
    
    result = await db.execute(select(TaskJob).where(TaskJob.code == code))
    if result.scalar_one_or_none():
        return {"code": 400, "message": "任务编码已存在", "data": None}
    
    new_job = TaskJob(
        name=name,
        code=code,
        task_type=data.get("task_type", "http"),
        cron_expression=data.get("cron_expression"),
        interval_seconds=data.get("interval_seconds"),
        target=data.get("target", ""),
        method=data.get("method", "GET"),
        headers=data.get("headers"),
        params=data.get("params"),
        body=data.get("body"),
        timeout=data.get("timeout", 30),
        retry_count=data.get("retry_count", 0),
        retry_interval=data.get("retry_interval", 60),
        status=data.get("status", "1"),
        is_async=data.get("is_async", True),
        remark=data.get("remark"),
        create_user=current_user.id
    )
    
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    
    if new_job.status == "1":
        await task_scheduler.add_job(db, new_job)
    
    return {
        "code": 200,
        "message": "创建成功",
        "data": {"id": new_job.id}
    }


@router.put("/job/{job_id}", response_model=ResponseModel)
async def update_task_job(
    job_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新定时任务"""
    result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        return {"code": 404, "message": "任务不存在", "data": None}
    
    update_data = {}
    for key in ["name", "task_type", "cron_expression", "interval_seconds", "target",
                "method", "headers", "params", "body", "timeout", "retry_count",
                "retry_interval", "status", "is_async", "remark"]:
        if key in data:
            update_data[key] = data[key]
    
    update_data["update_user"] = current_user.id
    update_data["updated_at"] = datetime.now()
    
    await db.execute(update(TaskJob).where(TaskJob.id == job_id).values(**update_data))
    await db.commit()
    
    await task_scheduler.remove_job(job_id)
    if data.get("status") == "1" or (data.get("status") is None and job.status == "1"):
        result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
        updated_job = result.scalar_one()
        await task_scheduler.add_job(db, updated_job)
    
    return {"code": 200, "message": "更新成功"}


@router.delete("/job/{job_id}", response_model=ResponseModel)
async def delete_task_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除定时任务"""
    result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        return {"code": 404, "message": "任务不存在", "data": None}
    
    await task_scheduler.remove_job(job_id)
    await db.execute(delete(TaskLog).where(TaskLog.job_id == job_id))
    await db.execute(delete(TaskJob).where(TaskJob.id == job_id))
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}


@router.post("/job/{job_id}/run", response_model=ResponseModel)
async def run_task_now(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """立即执行任务"""
    result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        return {"code": 404, "message": "任务不存在", "data": None}
    
    try:
        await task_scheduler.run_job_now(db, job_id, user_id=current_user.id)
        return {"code": 200, "message": "任务已开始执行"}
    except Exception as e:
        return {"code": 500, "message": f"执行失败: {str(e)}", "data": None}


@router.post("/job/{job_id}/change-status", response_model=ResponseModel)
async def change_job_status(
    job_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改任务状态"""
    result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        return {"code": 404, "message": "任务不存在", "data": None}
    
    await db.execute(update(TaskJob).where(TaskJob.id == job_id).values(status=status, update_user=current_user.id, update_time=datetime.now()))
    await db.commit()
    
    if status == "1":
        result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
        await task_scheduler.add_job(db, result.scalar_one())
    else:
        await task_scheduler.remove_job(job_id)
    
    status_text = "启用" if status == "1" else "禁用" if status == "0" else "暂停"
    return {"code": 200, "message": f"任务已{status_text}"}


@router.get("/log", response_model=ResponseModel)
async def get_task_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    job_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取任务执行日志"""
    conditions = []
    
    if job_id:
        conditions.append(TaskLog.job_id == job_id)
    if status:
        conditions.append(TaskLog.status == status)
    if job_code:
        conditions.append(TaskLog.job_code == job_code)
    
    count_query = select(func.count()).select_from(TaskLog)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    query = select(TaskLog).offset(offset).limit(page_size).order_by(TaskLog.id.desc())
    if conditions:
        query = query.where(and_(*conditions))
    result = await db.execute(query)
    logs = result.scalars().all()

    rows = []
    for log in logs:
        rows.append({
            "id": log.id,
            "job_id": log.job_id or log.task_id,
            "job_name": log.job_name or log.task_name or "",
            "job_code": log.job_code or "",
            "status": str(log.status),
            "start_time": log.start_time.isoformat() if log.start_time else None,
            "end_time": log.end_time.isoformat() if log.end_time else None,
            "execution_time": log.execution_time,
            "request_data": log.request_data,
            "response_data": log.response_data or log.result,
            "error_msg": log.error_msg or log.error_message,
            "trigger_type": log.trigger_type or "cron",
            "ip_address": getattr(log, "ip_address", None),
            "create_time": log.create_time.isoformat() if log.create_time else None,
        })

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.delete("/log/clean", response_model=ResponseModel)
async def clean_task_logs(
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """清理指定天数之前的日志"""
    from datetime import timedelta
    cutoff_date = datetime.now() - timedelta(days=days)
    
    result = await db.execute(delete(TaskLog).where(TaskLog.create_time < cutoff_date))
    await db.commit()
    
    return {"code": 200, "message": f"已清理 {result.rowcount} 条日志"}


@router.delete("/log/{log_id}", response_model=ResponseModel)
async def delete_task_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除任务日志"""
    result = await db.execute(select(TaskLog).where(TaskLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        return {"code": 404, "message": "日志不存在", "data": None}
    
    await db.execute(delete(TaskLog).where(TaskLog.id == log_id))
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}
