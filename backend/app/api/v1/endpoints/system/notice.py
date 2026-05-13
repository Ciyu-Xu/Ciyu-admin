import time
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional, List, Any

from app.db.session import get_db
from app.utils.ip import get_client_ip
from app.models.notice import Notice, NoticeRead
from app.models.user import User
from app.api.v1.deps import get_current_user, check_permissions
from app.services.oper_log import OperLogService

router = APIRouter()

NOTICE_TYPE_MAP = {
    "info": 1,
    "warning": 2,
    "success": 3,
    "error": 4,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
}


def get_notice_type(type_str: str) -> int:
    return NOTICE_TYPE_MAP.get(type_str, 1)


class NoticeResponse(BaseModel):
    id: int
    title: str
    content: str
    type: int
    status: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ResponseModel(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None


@router.get("/notice", response_model=ResponseModel)
async def get_notice_list(
    title: Optional[str] = None,
    type: Optional[int] = None,
    status: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:list"))
):
    """获取公告列表"""
    conditions = []
    
    if title:
        conditions.append(Notice.title.ilike(f"%{title}%"))
    if type:
        conditions.append(Notice.type == type)
    if status is not None:
        conditions.append(Notice.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).select_from(Notice).where(where_clause)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Notice).where(where_clause).offset(offset).limit(page_size).order_by(Notice.id.desc())
    )
    notices = result.scalars().all()
    
    rows = []
    for notice in notices:
        read_count_result = await db.execute(
            select(func.count()).select_from(NoticeRead).where(NoticeRead.notice_id == notice.id)
        )
        read_count = read_count_result.scalar() or 0
        
        is_read = False
        if current_user:
            read_result = await db.execute(
                select(NoticeRead).where(
                    NoticeRead.notice_id == notice.id,
                    NoticeRead.user_id == current_user.id
                )
            )
            is_read = read_result.scalar_one_or_none() is not None
        
        rows.append({
            "id": notice.id,
            "notice_title": notice.title,
            "notice_content": notice.content,
            "notice_type": notice.type,
            "is_popup": notice.is_popup,
            "status": notice.status,
            "read_count": read_count,
            "is_read": is_read,
            "create_time": notice.created_at.isoformat() if notice.created_at else None,
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


@router.get("/notice/popup", response_model=ResponseModel)
async def get_popup_notices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取弹窗公告列表（仅返回未读的弹窗公告）"""
    result = await db.execute(
        select(Notice)
        .where(Notice.status == 1, Notice.is_popup == 1)
        .order_by(Notice.id.desc())
    )
    notices = result.scalars().all()
    
    rows = []
    for notice in notices:
        read_result = await db.execute(
            select(NoticeRead).where(
                NoticeRead.notice_id == notice.id,
                NoticeRead.user_id == current_user.id
            )
        )
        is_read = read_result.scalar_one_or_none() is not None
        
        if not is_read:
            rows.append({
                "id": notice.id,
                "notice_title": notice.title,
                "notice_content": notice.content,
                "notice_type": notice.type,
                "is_popup": notice.is_popup,
                "status": notice.status,
                "create_time": notice.created_at.isoformat() if notice.created_at else None,
            })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": len(rows)
        }
    }


@router.get("/notice/{notice_id}", response_model=ResponseModel)
async def get_notice(
    notice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:list"))
):
    """获取单个公告"""
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": notice.id,
            "notice_title": notice.title,
            "notice_content": notice.content,
            "notice_type": notice.type,
            "status": notice.status,
            "create_time": notice.created_at.isoformat() if notice.created_at else None,
        }
    }


class NoticeCreate(BaseModel):
    notice_title: str
    notice_content: str
    notice_type: str = "1"
    status: int = 1
    is_popup: int = 0


class NoticeUpdate(BaseModel):
    notice_title: Optional[str] = None
    notice_content: Optional[str] = None
    notice_type: Optional[str] = None
    status: Optional[int] = None
    is_popup: Optional[int] = None


@router.post("/notice", response_model=ResponseModel)
async def create_notice(
    notice_in: NoticeCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:add"))
):
    """创建公告"""
    start = time.time()

    notice = Notice(
        title=notice_in.notice_title,
        content=notice_in.notice_content,
        type=get_notice_type(notice_in.notice_type),
        status=notice_in.status,
        is_popup=notice_in.is_popup,
    )
    db.add(notice)
    await db.commit()
    await db.refresh(notice)

    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"title": "{notice_in.notice_title}"}}',
        status=1, duration=duration,
    )

    return {"code": 200, "message": "创建成功", "data": {"id": notice.id}}


@router.put("/notice/{notice_id}", response_model=ResponseModel)
async def update_notice(
    notice_id: int,
    notice_in: NoticeUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:edit"))
):
    """更新公告"""
    start = time.time()

    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    if notice_in.notice_title is not None:
        notice.title = notice_in.notice_title
    if notice_in.notice_content is not None:
        notice.content = notice_in.notice_content
    if notice_in.notice_type is not None:
        notice.type = get_notice_type(notice_in.notice_type)
    if notice_in.status is not None:
        notice.status = notice_in.status
    if notice_in.is_popup is not None:
        notice.is_popup = notice_in.is_popup
    
    await db.commit()

    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"notice_id": {notice_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "更新成功", "data": {"id": notice.id}}


@router.delete("/notice/{notice_id}", response_model=ResponseModel)
async def delete_notice(
    notice_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:remove"))
):
    """删除公告"""
    start = time.time()

    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    await db.delete(notice)
    await db.commit()

    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"notice_id": {notice_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "删除成功"}


@router.put("/notice/{notice_id}/status", response_model=ResponseModel)
async def change_notice_status(
    notice_id: int,
    status: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:edit"))
):
    """修改公告状态"""
    start = time.time()

    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    notice.status = status
    await db.commit()

    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"notice_id": {notice_id}, "status": {status}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "状态修改成功"}


@router.post("/notice/{notice_id}/read", response_model=ResponseModel)
async def mark_notice_read(
    notice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """标记公告为已读"""
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    existing = await db.execute(
        select(NoticeRead).where(
            NoticeRead.notice_id == notice_id,
            NoticeRead.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        return {"code": 200, "message": "已读", "data": {"already_read": True}}
    
    read_record = NoticeRead(
        notice_id=notice_id,
        user_id=current_user.id,
        username=current_user.username,
    )
    db.add(read_record)
    await db.commit()
    
    return {"code": 200, "message": "标记已读成功", "data": {"read_id": read_record.id}}


@router.get("/notice/{notice_id}/read-records", response_model=ResponseModel)
async def get_notice_read_records(
    notice_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:notice:list"))
):
    """获取公告阅读记录"""
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    count_result = await db.execute(
        select(func.count()).select_from(NoticeRead).where(NoticeRead.notice_id == notice_id)
    )
    total = count_result.scalar() or 0
    
    offset = (page - 1) * page_size
    records_result = await db.execute(
        select(NoticeRead)
        .where(NoticeRead.notice_id == notice_id)
        .offset(offset).limit(page_size)
        .order_by(NoticeRead.read_time.desc())
    )
    records = records_result.scalars().all()
    
    rows = []
    for record in records:
        rows.append({
            "id": record.id,
            "user_id": record.user_id,
            "username": record.username,
            "read_time": record.read_time.isoformat() if record.read_time else None,
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
