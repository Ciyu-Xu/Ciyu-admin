from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.db.session import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User, Role, Post, Dept
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse, UserQuery,
    PasswordUpdate, PasswordReset, ResponseModel
)
from app.api.v1.deps import get_current_user, check_permissions

router = APIRouter()


@router.get("", response_model=ResponseModel)
async def get_users(
    query: UserQuery = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:list"))
):
    """获取用户列表"""
    # 构建查询条件
    conditions = []
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
    
    # 查询总数
    count_query = select(func.count(User.id)).where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 查询数据
    offset = (query.page - 1) * query.size
    query_stmt = (
        select(User)
        .where(and_(*conditions))
        .order_by(User.create_time.desc())
        .offset(offset)
        .limit(query.size)
    )
    result = await db.execute(query_stmt)
    users = result.scalars().all()
    
    # 构建响应数据
    user_list = []
    for user in users:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "email": user.email,
            "phone": user.phone,
            "avatar": user.avatar,
            "status": user.status,
            "dept_id": user.dept_id,
            "create_time": user.create_time,
            "update_time": user.update_time,
            "role_ids": [role.id for role in user.roles],
            "post_ids": [post.id for post in user.posts]
        }
        user_list.append(user_dict)
    
    return ResponseModel(
        code=200,
        message="success",
        data={
            "items": user_list,
            "total": total,
            "page": query.page,
            "size": query.size
        }
    )


@router.get("/{user_id}", response_model=ResponseModel)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:query"))
):
    """获取用户详情"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "email": user.email,
        "phone": user.phone,
        "avatar": user.avatar,
        "status": user.status,
        "dept_id": user.dept_id,
        "create_time": user.create_time,
        "update_time": user.update_time,
        "role_ids": [role.id for role in user.roles],
        "post_ids": [post.id for post in user.posts]
    }
    
    return ResponseModel(
        code=200,
        message="success",
        data=user_dict
    )


@router.post("", response_model=ResponseModel)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:add"))
):
    """创建用户"""
    # 检查用户名是否已存在
    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 创建用户
    user = User(
        username=user_data.username,
        nickname=user_data.nickname,
        email=user_data.email,
        phone=user_data.phone,
        avatar=user_data.avatar,
        password=get_password_hash(user_data.password),
        status=user_data.status,
        dept_id=user_data.dept_id
    )
    
    # 添加角色
    if user_data.role_ids:
        roles_result = await db.execute(
            select(Role).where(Role.id.in_(user_data.role_ids))
        )
        roles = roles_result.scalars().all()
        user.roles = list(roles)
    
    # 添加岗位
    if user_data.post_ids:
        posts_result = await db.execute(
            select(Post).where(Post.id.in_(user_data.post_ids))
        )
        posts = posts_result.scalars().all()
        user.posts = list(posts)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return ResponseModel(
        code=200,
        message="创建成功",
        data={"id": user.id}
    )


@router.put("/{user_id}", response_model=ResponseModel)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:edit"))
):
    """更新用户"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新基本信息
    update_data = user_data.model_dump(exclude_unset=True)
    
    # 处理角色关联
    if "role_ids" in update_data:
        role_ids = update_data.pop("role_ids")
        if role_ids is not None:
            roles_result = await db.execute(
                select(Role).where(Role.id.in_(role_ids))
            )
            user.roles = list(roles_result.scalars().all())
    
    # 处理岗位关联
    if "post_ids" in update_data:
        post_ids = update_data.pop("post_ids")
        if post_ids is not None:
            posts_result = await db.execute(
                select(Post).where(Post.id.in_(post_ids))
            )
            user.posts = list(posts_result.scalars().all())
    
    # 更新其他字段
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return ResponseModel(
        code=200,
        message="更新成功"
    )


@router.delete("/{user_id}", response_model=ResponseModel)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:remove"))
):
    """删除用户"""
    # 不能删除自己
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除当前登录用户"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    await db.delete(user)
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="删除成功"
    )


@router.put("/{user_id}/reset-password", response_model=ResponseModel)
async def reset_password(
    user_id: int,
    password_data: PasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:user:resetPwd"))
):
    """重置密码"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user.password = get_password_hash(password_data.new_password)
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="密码重置成功"
    )


@router.put("/profile/password", response_model=ResponseModel)
async def update_password(
    password_data: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改当前用户密码"""
    # 验证旧密码
    if not verify_password(password_data.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误"
        )
    
    current_user.password = get_password_hash(password_data.new_password)
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="密码修改成功"
    )


@router.get("/profile/info", response_model=ResponseModel)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """获取个人资料"""
    return ResponseModel(
        code=200,
        message="success",
        data={
            "id": current_user.id,
            "username": current_user.username,
            "nickname": current_user.nickname,
            "email": current_user.email,
            "phone": current_user.phone,
            "avatar": current_user.avatar,
        }
    )


@router.put("/profile/update", response_model=ResponseModel)
async def update_profile(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新个人资料"""
    update_data = user_data.model_dump(exclude_unset=True)
    
    # 不允许修改的字段
    exclude_fields = ["status", "dept_id", "role_ids", "post_ids"]
    for field in exclude_fields:
        update_data.pop(field, None)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return ResponseModel(
        code=200,
        message="更新成功"
    )
