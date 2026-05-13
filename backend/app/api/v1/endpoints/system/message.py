from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func

from app.db.session import get_db
from app.models.user import User
from app.models.message import Message
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("/list", response_model=ResponseModel)
async def get_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    direction: str = Query("inbox", description="inbox-收件箱 sent-发件箱"),
    status: Optional[int] = Query(None, description="消息状态 0-未读 1-已读"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    """获取消息列表"""
    if direction == "sent":
        query = select(Message).where(Message.from_user_id == current_user.id)
    else:
        query = select(Message).where(Message.to_user_id == current_user.id)

    if status is not None:
        query = query.where(Message.status == status)

    query = query.order_by(Message.created_at.desc())

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    offset = (page - 1) * size
    result = await db.execute(query.offset(offset).limit(size))
    messages = result.scalars().all()

    message_list = []
    for msg in messages:
        other_user_id = msg.from_user_id if direction == "inbox" else msg.to_user_id
        other_username = None
        if other_user_id:
            user_result = await db.execute(select(User).where(User.id == other_user_id))
            other_user = user_result.scalar_one_or_none()
            other_username = other_user.nickname or other_user.username if other_user else "已删除"

        message_list.append({
            "id": msg.id,
            "title": msg.title,
            "content": msg.content,
            "msg_type": int(msg.type) if msg.type and msg.type.isdigit() else 1,
            "status": msg.status,
            "from_user_id": msg.from_user_id,
            "to_user_id": msg.to_user_id,
            "other_username": other_username,
            "create_time": msg.created_at.isoformat() if msg.created_at else None,
        })

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": message_list,
            "total": total
        }
    }


@router.get("/unread/count", response_model=ResponseModel)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取未读消息数量"""
    result = await db.execute(
        select(func.count()).where(
            Message.to_user_id == current_user.id,
            Message.status == 0
        )
    )
    count = result.scalar_one()

    return {
        "code": 200,
        "message": "操作成功",
        "data": count
    }


@router.put("/read/{msg_id}", response_model=ResponseModel)
async def mark_message_read(
    msg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """标记消息已读"""
    result = await db.execute(
        select(Message).where(Message.id == msg_id)
    )
    msg = result.scalar_one_or_none()

    if not msg or msg.to_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="消息不存在")

    msg.status = 1
    await db.commit()

    return {"code": 200, "message": "标记已读成功"}


@router.put("/read-all", response_model=ResponseModel)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """全部标记已读"""
    await db.execute(
        update(Message).where(
            Message.to_user_id == current_user.id,
            Message.status == 0
        ).values(status=1)
    )
    await db.commit()

    return {"code": 200, "message": "全部标记已读成功"}


@router.delete("/{msg_id}", response_model=ResponseModel)
async def delete_message(
    msg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除消息"""
    result = await db.execute(
        select(Message).where(Message.id == msg_id)
    )
    msg = result.scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")

    if msg.to_user_id != current_user.id and msg.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限删除此消息")

    await db.delete(msg)
    await db.commit()

    return {"code": 200, "message": "删除成功"}


@router.delete("/batch", response_model=ResponseModel)
async def batch_delete_messages(
    msg_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """批量删除消息"""
    if not msg_ids:
        return {"code": 400, "message": "请选择要删除的消息"}

    for msg_id in msg_ids:
        result = await db.execute(
            select(Message).where(Message.id == msg_id)
        )
        msg = result.scalar_one_or_none()
        if msg and (msg.to_user_id == current_user.id or msg.from_user_id == current_user.id):
            await db.delete(msg)

    await db.commit()
    return {"code": 200, "message": f"成功删除 {len(msg_ids)} 条消息"}


@router.post("/send", response_model=ResponseModel)
async def send_message(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """发送消息（支持群发）"""
    user_ids = data.get("user_ids", [])
    title = data.get("title", "").strip()
    content = data.get("content", "")
    msg_type = data.get("msg_type", 1)

    if not title:
        raise HTTPException(status_code=400, detail="消息标题不能为空")

    if not user_ids:
        raise HTTPException(status_code=400, detail="请选择至少一个接收用户")

    sent_count = 0
    for user_id in user_ids:
        result = await db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if target_user:
            new_message = Message(
                title=title,
                content=content,
                type=str(msg_type),
                to_user_id=user_id,
                from_user_id=current_user.id
            )
            db.add(new_message)
            sent_count += 1

    await db.commit()

    return {"code": 200, "message": f"消息发送成功，共发送给 {sent_count} 个用户"}
