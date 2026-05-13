import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel, field_validator

from app.db.session import get_db
from app.utils.ip import get_client_ip
from app.core.data_scope import get_dept_data_scope_filter
from app.models.user import Dept, User
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user, check_permissions
from app.services.oper_log import OperLogService

router = APIRouter()


class DeptCreate(BaseModel):
    dept_name: str
    parent_id: int = 0
    sort_order: int = 0
    leader: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: int = 1

    @field_validator('leader', 'phone', 'email', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v


class DeptUpdate(DeptCreate):
    pass


@router.get("/dept", response_model=ResponseModel)
async def get_depts(
    dept_name: Optional[str] = None,
    status: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:list"))
):
    """获取部门列表"""
    conditions = []
    
    data_scope_filter = await get_dept_data_scope_filter(db, current_user)
    if data_scope_filter:
        conditions.append(data_scope_filter)
    
    if dept_name:
        conditions.append(Dept.dept_name.ilike(f"%{dept_name}%"))
    if status is not None:
        conditions.append(Dept.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    result = await db.execute(
        select(Dept).where(where_clause).order_by(Dept.sort_order.asc(), Dept.id.asc())
    )
    depts = result.scalars().all()
    
    rows = []
    for dept in depts:
        rows.append({
            "id": dept.id,
            "dept_name": dept.dept_name,
            "parent_id": dept.parent_id,
            "sort_order": dept.sort_order,
            "leader": dept.leader,
            "phone": dept.phone,
            "email": dept.email,
            "status": dept.status,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": rows
    }


@router.get("/dept/tree", response_model=ResponseModel)
async def get_dept_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:list"))
):
    """获取部门树形结构"""
    conditions = [Dept.status == 1]
    
    data_scope_filter = await get_dept_data_scope_filter(db, current_user)
    if data_scope_filter:
        conditions.append(data_scope_filter)
    
    result = await db.execute(
        select(Dept).where(and_(*conditions)).order_by(Dept.sort_order.asc(), Dept.id.asc())
    )
    depts = result.scalars().all()
    
    dept_list = []
    for dept in depts:
        dept_list.append({
            "id": dept.id,
            "dept_name": dept.dept_name,
            "parent_id": dept.parent_id,
            "sort_order": dept.sort_order,
            "leader": dept.leader,
            "status": dept.status,
        })
    
    def build_tree(parent_id: int) -> List[dict]:
        children = []
        for dept in dept_list:
            if dept["parent_id"] == parent_id:
                child = dept.copy()
                child["children"] = build_tree(dept["id"])
                children.append(child)
        return children
    
    tree = build_tree(0)
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": tree
    }


@router.get("/dept/{dept_id}", response_model=ResponseModel)
async def get_dept(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:list"))
):
    """获取部门详情"""
    result = await db.execute(select(Dept).where(Dept.id == dept_id))
    dept = result.scalar_one_or_none()
    
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": dept.id,
            "dept_name": dept.dept_name,
            "parent_id": dept.parent_id,
            "sort_order": dept.sort_order,
            "leader": dept.leader,
            "phone": dept.phone,
            "email": dept.email,
            "status": dept.status,
        }
    }


@router.post("/dept", response_model=ResponseModel)
async def create_dept(
    data: DeptCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:add"))
):
    """创建部门"""
    start = time.time()
    if data.parent_id > 0:
        parent_result = await db.execute(select(Dept).where(Dept.id == data.parent_id))
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="父部门不存在")
    
    dept = Dept(**data.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"dept_name": "{data.dept_name}"}}',
        status=1, duration=duration,
    )
    
    return ResponseModel(
        code=200,
        message="创建成功",
        data={"id": dept.id}
    )


@router.put("/dept/{dept_id}", response_model=ResponseModel)
async def update_dept(
    dept_id: int,
    data: DeptUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:edit"))
):
    """更新部门"""
    start = time.time()

    result = await db.execute(select(Dept).where(Dept.id == dept_id))
    dept = result.scalar_one_or_none()

    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")

    if data.parent_id == dept_id:
        raise HTTPException(status_code=400, detail="不能将自己设为父部门")

    if data.parent_id > 0:
        parent_result = await db.execute(select(Dept).where(Dept.id == data.parent_id))
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="父部门不存在")

    for key, value in data.model_dump().items():
        setattr(dept, key, value)

    await db.commit()

    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"dept_id": {dept_id}}}',
        status=1, duration=duration,
    )

    return ResponseModel(
        code=200,
        message="更新成功"
    )


@router.delete("/dept/{dept_id}", response_model=ResponseModel)
async def delete_dept(
    dept_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("system:dept:remove"))
):
    """删除部门"""
    start = time.time()

    result = await db.execute(select(Dept).where(Dept.id == dept_id))
    dept = result.scalar_one_or_none()
    
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    
    child_result = await db.execute(select(Dept).where(Dept.parent_id == dept_id))
    if child_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="存在下级部门，无法删除")
    
    user_result = await db.execute(select(User).where(User.dept_id == dept_id))
    if user_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="部门下存在用户，无法删除")
    
    await db.delete(dept)
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"dept_id": {dept_id}}}',
        status=1, duration=duration,
    )
    
    return ResponseModel(
        code=200,
        message="删除成功"
    )
