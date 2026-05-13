import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete as sa_delete

from app.db.session import get_db
from app.utils.ip import get_client_ip
from app.models.user import Role, Menu, role_menu_table
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user, check_permissions
from app.services.oper_log import OperLogService

router = APIRouter()


class RoleFormData(BaseModel):
    name: str = Field(alias="role_name")
    role_key: str
    sort_order: int = 0
    status: int = 1
    description: Optional[str] = Field(default=None, alias="data_scope")
    menu_ids: Optional[List[int]] = None


@router.get("/role", response_model=ResponseModel)
async def get_roles(
    role_name: Optional[str] = None,
    role_key: Optional[str] = None,
    status: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:list"))
):
    """获取角色列表"""
    conditions = []
    if role_name:
        conditions.append(Role.name.ilike(f"%{role_name}%"))
    if role_key:
        conditions.append(Role.role_key.ilike(f"%{role_key}%"))
    if status is not None:
        conditions.append(Role.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).where(where_clause).select_from(Role)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Role).where(where_clause).offset(offset).limit(page_size).order_by(Role.sort_order.asc(), Role.id.asc())
    )
    roles = result.scalars().all()
    
    rows = []
    for role in roles:
        rows.append({
            "id": role.id,
            "role_name": role.name,
            "role_key": role.role_key,
            "data_scope": role.description,
            "sort_order": role.sort_order,
            "status": role.status,
            "create_time": role.created_at.isoformat() if role.created_at else None,
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


@router.get("/role/{role_id}", response_model=ResponseModel)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:list"))
):
    """获取角色详情"""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存�?)
    
    menu_result = await db.execute(
        select(Menu.id).join(role_menu_table, role_menu_table.c.menu_id == Menu.id).where(role_menu_table.c.role_id == role_id)
    )
    menu_ids = [row[0] for row in menu_result.fetchall()]
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": role.id,
            "role_name": role.name,
            "role_key": role.role_key,
            "data_scope": role.description,
            "sort_order": role.sort_order,
            "status": role.status,
            "menu_ids": menu_ids,
        }
    }


@router.post("/role", response_model=ResponseModel)
async def create_role(
    data: RoleFormData,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:add"))
):
    """创建角色"""
    start = time.time()
    
    result = await db.execute(select(Role).where(Role.role_key == data.role_key))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="角色标识已存�?)
    
    role = Role(
        name=data.name,
        role_key=data.role_key,
        sort_order=data.sort_order,
        status=data.status,
        description=data.description,
    )
    db.add(role)
    await db.flush()
    
    if data.menu_ids:
        for menu_id in data.menu_ids:
            await db.execute(
                role_menu_table.insert().values(role_id=role.id, menu_id=menu_id)
            )
    
    await db.commit()
    await db.refresh(role)
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"name": "{data.name}"}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "创建成功", "data": {"id": role.id}}


@router.put("/role/{role_id}", response_model=ResponseModel)
async def update_role(
    role_id: int,
    data: RoleFormData,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:edit"))
):
    """更新角色"""
    start = time.time()
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存�?)
    
    result = await db.execute(select(Role).where(Role.role_key == data.role_key, Role.id != role_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="角色标识已存�?)
    
    role.name = data.name
    role.role_key = data.role_key
    role.sort_order = data.sort_order
    role.status = data.status
    role.description = data.description
    
    if data.menu_ids is not None:
        await db.execute(role_menu_table.delete().where(role_menu_table.c.role_id == role_id))
        for menu_id in data.menu_ids:
            await db.execute(
                role_menu_table.insert().values(role_id=role_id, menu_id=menu_id)
            )
    
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"role_id": {role_id}, "name": "{data.name}"}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "更新成功", "data": {"id": role.id}}


@router.delete("/role/{role_id}", response_model=ResponseModel)
async def delete_role(
    role_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:remove"))
):
    """删除角色"""
    start = time.time()
    
    if role_id == 1:
        raise HTTPException(status_code=400, detail="不能删除超级管理员角�?)
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存�?)
    
    await db.execute(role_menu_table.delete().where(role_menu_table.c.role_id == role_id))
    await db.delete(role)
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"role_id": {role_id}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "删除成功"}


@router.put("/role/{role_id}/status", response_model=ResponseModel)
async def change_role_status(
    role_id: int,
    status: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:edit"))
):
    """修改角色状�?""
    start = time.time()
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存�?)
    
    role.status = status
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"role_id": {role_id}, "status": {status}}}',
        status=1, duration=duration,
    )
    
    return {"code": 200, "message": "状态修改成�?}


@router.get("/role/all/menu", response_model=ResponseModel)
async def get_all_menus(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:role:list"))
):
    """获取所有菜单（用于权限分配�?""
    result = await db.execute(
        select(Menu).where(Menu.status == 1).order_by(Menu.sort_order.asc())
    )
    menus = result.scalars().all()
    
    def build_tree(parent_id: int) -> List:
        children = []
        for menu in menus:
            if menu.parent_id == parent_id:
                child = {
                    "id": menu.id,
                    "menu_name": menu.menu_name,
                    "path": menu.path,
                    "component": menu.component,
                    "icon": menu.icon,
                    "parent_id": menu.parent_id,
                    "sort_order": menu.sort_order,
                    "menu_type": menu.menu_type,
                    "permission": menu.permission,
                    "children": build_tree(menu.id)
                }
                children.append(child)
        return children
    
    tree = build_tree(0)
    
    return {"code": 200, "message": "操作成功", "data": tree}
