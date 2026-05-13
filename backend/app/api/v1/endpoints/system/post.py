from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, field_validator

from app.db.session import get_db
from app.models.user import Post, User, Dept
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user, check_permissions

router = APIRouter()


class PostCreate(BaseModel):
    post_name: str
    post_code: str
    dept_id: Optional[int] = None
    sort_order: int = 0
    status: int = 1

    @field_validator('post_name', mode='before')
    @classmethod
    def strip_post_name(cls, v):
        return v.strip() if v else v

    @field_validator('post_code', mode='before')
    @classmethod
    def strip_post_code(cls, v):
        return v.strip().upper() if v else v


class PostUpdate(PostCreate):
    pass


@router.get("/post", response_model=ResponseModel)
async def get_posts(
    post_name: Optional[str] = None,
    post_code: Optional[str] = None,
    dept_id: Optional[int] = None,
    status: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:list"))
):
    """获取岗位列表"""
    conditions = []
    if post_name:
        conditions.append(Post.post_name.ilike(f"%{post_name}%"))
    if post_code:
        conditions.append(Post.post_code.ilike(f"%{post_code}%"))
    if dept_id is not None:
        conditions.append(Post.dept_id == dept_id)
    if status is not None:
        conditions.append(Post.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).where(where_clause).select_from(Post)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.dept))
        .where(where_clause)
        .offset(offset)
        .limit(page_size)
        .order_by(Post.sort_order.asc(), Post.id.asc())
    )
    posts = result.scalars().all()
    
    rows = []
    for post in posts:
        rows.append({
            "id": post.id,
            "post_name": post.post_name,
            "post_code": post.post_code,
            "dept_id": post.dept_id,
            "dept_name": post.dept.dept_name if post.dept else None,
            "sort_order": post.sort_order,
            "status": post.status,
            "create_time": post.create_time.isoformat() if post.create_time else None,
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


@router.get("/post/all", response_model=ResponseModel)
async def get_all_posts(
    dept_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:list"))
):
    """获取所有岗位（不分页，用于下拉选择）"""
    conditions = [Post.status == 1]
    
    if dept_id is not None:
        conditions.append(Post.dept_id == dept_id)
    
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.dept))
        .where(and_(*conditions))
        .order_by(Post.sort_order.asc(), Post.id.asc())
    )
    posts = result.scalars().all()
    
    rows = []
    for post in posts:
        rows.append({
            "id": post.id,
            "post_name": post.post_name,
            "post_code": post.post_code,
            "dept_name": post.dept.dept_name if post.dept else None,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": rows
    }


@router.get("/post/{post_id}", response_model=ResponseModel)
async def get_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:list"))
):
    """获取岗位详情"""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.dept))
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": post.id,
            "post_name": post.post_name,
            "post_code": post.post_code,
            "dept_id": post.dept_id,
            "dept_name": post.dept.dept_name if post.dept else None,
            "sort_order": post.sort_order,
            "status": post.status,
        }
    }


@router.post("/post", response_model=ResponseModel)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:add"))
):
    """创建岗位"""
    if data.dept_id:
        dept_result = await db.execute(select(Dept).where(Dept.id == data.dept_id))
        if not dept_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="指定的部门不存在")
    
    post_code_result = await db.execute(select(Post).where(Post.post_code == data.post_code))
    if post_code_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="岗位编码已存在")
    
    post = Post(**data.model_dump())
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    return ResponseModel(
        code=200,
        message="创建成功",
        data={"id": post.id}
    )


@router.put("/post/{post_id}", response_model=ResponseModel)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:edit"))
):
    """更新岗位"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    if data.dept_id:
        dept_result = await db.execute(select(Dept).where(Dept.id == data.dept_id))
        if not dept_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="指定的部门不存在")
    
    code_result = await db.execute(select(Post).where(Post.post_code == data.post_code, Post.id != post_id))
    if code_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="岗位编码已存在")
    
    for key, value in data.model_dump().items():
        setattr(post, key, value)
    
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="更新成功"
    )


@router.delete("/post/{post_id}", response_model=ResponseModel)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:remove"))
):
    """删除岗位"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    await db.delete(post)
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="删除成功"
    )


@router.put("/post/{post_id}/status", response_model=ResponseModel)
async def change_post_status(
    post_id: int,
    status: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:post:edit"))
):
    """修改岗位状态"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    post.status = status
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="状态修改成功"
    )
