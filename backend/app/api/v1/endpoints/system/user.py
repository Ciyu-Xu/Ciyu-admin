import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.utils.ip import get_client_ip
from app.core.security import get_password_hash, verify_password
from app.core.data_scope import get_user_data_scope_filter
from app.core.config_loader import get_config_value
from app.models.user import User, Role, Post, Dept, user_role_table, user_post_table
from app.models.log import OperationLog
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse, UserQuery,
    PasswordUpdate, PasswordReset, ResponseModel
)
from app.api.v1.deps import get_current_user, check_permissions
from app.services.oper_log import OperLogService
from fastapi.responses import StreamingResponse
from app.utils.excel import create_template, export_to_excel, parse_import_file
from openpyxl import load_workbook
from io import BytesIO

router = APIRouter()


@router.get("/user", response_model=ResponseModel)
async def get_users(
    query: UserQuery = Depends(),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:list"))
):
    """获取用户列表"""
    conditions = []
    
    data_scope_filter = await get_user_data_scope_filter(db, current_user)
    if data_scope_filter:
        conditions.append(data_scope_filter)
    
    if query.username:
        conditions.append(User.username.ilike(f"%{query.username}%"))
    if query.nickname:
        conditions.append(User.nickname.ilike(f"%{query.nickname}%"))
    if query.phone:
        conditions.append(User.phone.ilike(f"%{query.phone}%"))
    if query.status is not None:
        conditions.append(User.status == query.status)
    if query.dept_id:
        conditions.append(User.dept_id == query.dept_id)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).where(where_clause).select_from(User)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(where_clause).offset(offset).limit(page_size).order_by(User.id.desc())
    )
    users = result.scalars().all()
    
    rows = []
    for user in users:
        rows.append({
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "email": user.email,
            "phone": user.phone,
            "avatar": user.avatar,
            "status": user.status,
            "dept_id": user.dept_id,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "roles": [{"id": role.id, "name": role.name} for role in user.roles],
            "role_ids": [role.id for role in user.roles],
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


@router.get("/user/export")
async def export_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:user:list")),
):
    """导出用户数据"""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()

    headers = ["用户名", "昵称", "邮箱", "手机号", "状态", "部门ID"]
    rows = []
    for u in users:
        rows.append([
            u.username, u.nickname or "", u.email or "", u.phone or "",
            "启用" if u.status == 1 else "禁用", str(u.dept_id or ""),
        ])

    output = export_to_excel(headers, rows, "用户数据")
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=users.xlsx"},
    )


@router.get("/user/export/template")
async def export_user_template():
    """导出用户导入模板"""
    columns = [
        {"key": "username", "label": "用户名", "required": True, "note": "必填，3-50个字符"},
        {"key": "nickname", "label": "昵称", "required": False, "note": "选填"},
        {"key": "email", "label": "邮箱", "required": False, "note": "选填，需为有效邮箱格式"},
        {"key": "phone", "label": "手机号", "required": False, "note": "选填，11位手机号"},
        {"key": "password", "label": "密码", "required": True, "note": "必填，至少6位"},
        {"key": "status", "label": "状态", "required": False, "note": "启用/禁用，默认启用"},
    ]
    output = create_template(columns)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=user_import_template.xlsx"},
    )


@router.post("/user/import")
async def import_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:user:add")),
):
    """导入用户"""
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="请上传文件")

    content = await file.read()
    expected = ["用户名", "昵称", "邮箱", "手机号", "密码", "状态"]
    records = parse_import_file(content, expected)

    imported = 0
    errors = []
    for idx, record in enumerate(records, 2):
        username = record.get("用户名", "").strip()
        password = record.get("密码", "").strip()

        if not username or len(username) < 3:
            errors.append(f"第{idx}行: 用户名无效")
            continue
        if not password or len(password) < 6:
            errors.append(f"第{idx}行: 密码至少6位")
            continue

        existing = await db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            errors.append(f"第{idx}行: 用户名 '{username}' 已存在")
            continue

        nickname = record.get("昵称", "") or username
        email = record.get("邮箱", "")
        phone = record.get("手机号", "")
        status_text = record.get("状态", "启用")
        status = 1 if status_text in ("启用", "1", "是") else 0

        user = User(
            username=username,
            nickname=nickname,
            email=email if email else None,
            phone=phone if phone else None,
            hashed_password=get_password_hash(password),
            status=status,
        )
        db.add(user)
        imported += 1

    if imported > 0:
        await db.commit()

    return {
        "code": 200,
        "message": f"成功导入 {imported} 个用户",
        "data": {"imported": imported, "errors": errors},
    }
@router.get("/user/{user_id}", response_model=ResponseModel)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:list"))
):
    """获取单个用户信息"""
    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "email": user.email,
            "phone": user.phone,
            "avatar": user.avatar,
            "status": user.status,
            "dept_id": user.dept_id,
            "roles": [{"id": role.id, "name": role.name} for role in user.roles],
            "role_ids": [role.id for role in user.roles],
        }
    }


@router.get("/users", response_model=ResponseModel)
async def get_simple_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取简化的用户列表（用于消息发送等场景）"""
    result = await db.execute(
        select(User).where(User.status == 1).order_by(User.id.desc())
    )
    users = result.scalars().all()
    
    rows = []
    for user in users:
        rows.append({
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "status": user.status,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": len(rows)
        }
    }


@router.post("/user", response_model=ResponseModel)
async def create_user(
    user_in: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:add"))
):
    """创建用户"""
    start = time.time()
    
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    password = user_in.password
    if not password:
        password = await get_config_value(db, "sys.user.initPassword", "123456")
    
    user = User(
        username=user_in.username,
        nickname=user_in.nickname or user_in.username,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=get_password_hash(password),
        avatar=user_in.avatar or "",
        status=user_in.status if user_in.status is not None else 1,
        dept_id=user_in.dept_id,
    )
    db.add(user)
    await db.flush()
    
    if user_in.role_ids:
        for role_id in user_in.role_ids:
            await db.execute(
                user_role_table.insert().values(user_id=user.id, role_id=role_id)
            )
    
    await db.commit()
    await db.refresh(user)
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"username": "{user_in.username}"}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "创建成功", "data": {"id": user.id}}


@router.put("/user/{user_id}", response_model=ResponseModel)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:edit"))
):
    """更新用户"""
    start = time.time()
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if user_in.nickname is not None:
        user.nickname = user_in.nickname
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.avatar is not None:
        user.avatar = user_in.avatar
    if user_in.status is not None:
        user.status = user_in.status
    if user_in.dept_id is not None:
        user.dept_id = user_in.dept_id
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
    
    if user_in.role_ids is not None:
        await db.execute(user_role_table.delete().where(user_role_table.c.user_id == user_id))
        for role_id in user_in.role_ids:
            await db.execute(
                user_role_table.insert().values(user_id=user_id, role_id=role_id)
            )
    
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"user_id": {user_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "更新成功", "data": {"id": user.id}}


@router.delete("/user/{user_id}", response_model=ResponseModel)
async def delete_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:remove"))
):
    """删除用户"""
    start = time.time()
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    await db.execute(user_role_table.delete().where(user_role_table.c.user_id == user_id))
    await db.execute(user_post_table.delete().where(user_post_table.c.user_id == user_id))
    await db.delete(user)
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"user_id": {user_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "删除成功"}


@router.put("/user/{user_id}/status", response_model=ResponseModel)
async def change_user_status(
    user_id: int,
    status: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:edit"))
):
    """修改用户状态"""
    start = time.time()
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.status = status
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"user_id": {user_id}, "status": {status}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "状态更新成功"}


@router.post("/user/{user_id}/reset-password", response_model=ResponseModel)
async def reset_user_password(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:edit"))
):
    """重置用户密码"""
    start = time.time()
    from datetime import datetime
    from app.core.password_policy import password_policy_service
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    new_password = "123456"
    await password_policy_service.add_password_history(db, user_id, new_password)
    
    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"user_id": {user_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": f"密码已重置为 {new_password}"}


