import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.db.session import get_db
from app.utils.ip import get_client_ip
from app.models.user import Menu
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user, check_permissions
from app.services.oper_log import OperLogService

router = APIRouter()


class MenuFormData(BaseModel):
    menu_name: str
    path: Optional[str] = None
    component: Optional[str] = None
    icon: Optional[str] = None
    parent_id: int = 0
    sort_order: int = 0
    menu_type: str = 'C'
    permission: Optional[str] = None
    status: int = 1
    visible: int = 1
    is_frame: int = 0
    is_cache: int = 0


@router.get("/menu", response_model=ResponseModel)
async def get_menus(
    menu_name: Optional[str] = None,
    status: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:list"))
):
    """获取菜单列表"""
    conditions = []
    if menu_name:
        conditions.append(Menu.menu_name.ilike(f"%{menu_name}%"))
    if status is not None:
        conditions.append(Menu.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    result = await db.execute(
        select(Menu).where(where_clause).order_by(Menu.sort_order.asc())
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
                    "status": menu.status,
                    "visible": menu.visible,
                    "is_frame": menu.is_frame,
                    "is_cache": menu.is_cache,
                    "children": build_tree(menu.id)
                }
                children.append(child)
        return children
    
    tree = build_tree(0)
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": tree
    }


@router.get("/menu/{menu_id}", response_model=ResponseModel)
async def get_menu(
    menu_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:list"))
):
    """获取菜单详情"""
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存�?)
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": menu.id,
            "menu_name": menu.menu_name,
            "path": menu.path,
            "component": menu.component,
            "icon": menu.icon,
            "parent_id": menu.parent_id,
            "sort_order": menu.sort_order,
            "menu_type": menu.menu_type,
            "permission": menu.permission,
            "status": menu.status,
            "visible": menu.visible,
            "is_frame": menu.is_frame,
            "is_cache": menu.is_cache,
        }
    }


@router.post("/menu", response_model=ResponseModel)
async def create_menu(
    data: MenuFormData,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:add"))
):
    """创建菜单"""
    start = time.time()
    
    menu = Menu(
        menu_name=data.menu_name,
        path=data.path,
        component=data.component,
        icon=data.icon,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
        menu_type=data.menu_type,
        permission=data.permission,
        status=data.status,
        visible=data.visible,
        is_frame=data.is_frame,
        is_cache=data.is_cache,
    )
    db.add(menu)
    await db.commit()
    await db.refresh(menu)
    
    duration = int((time.time() - start) * 1000)
    
    await OperLogService.create_log(
        db=db,
        user=current_user,
        method=request.method,
        url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=str(data.model_dump()),
        status=1,
        duration=duration,
    )
    
    return {"code": 200, "message": "创建成功", "data": {"id": menu.id}}


@router.put("/menu/{menu_id}", response_model=ResponseModel)
async def update_menu(
    menu_id: int,
    data: MenuFormData,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:edit"))
):
    """更新菜单"""
    start = time.time()
    
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存�?)
    
    menu.menu_name = data.menu_name
    menu.path = data.path
    menu.component = data.component
    menu.icon = data.icon
    menu.parent_id = data.parent_id
    menu.sort_order = data.sort_order
    menu.menu_type = data.menu_type
    menu.permission = data.permission
    menu.status = data.status
    menu.visible = data.visible
    menu.is_frame = data.is_frame
    menu.is_cache = data.is_cache
    
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    
    await OperLogService.create_log(
        db=db,
        user=current_user,
        method=request.method,
        url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=str(data.model_dump()),
        status=1,
        duration=duration,
    )
    
    return {"code": 200, "message": "更新成功", "data": {"id": menu.id}}


@router.delete("/menu/{menu_id}", response_model=ResponseModel)
async def delete_menu(
    menu_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:remove"))
):
    """删除菜单"""
    start = time.time()
    
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存�?)
    
    child_result = await db.execute(select(Menu).where(Menu.parent_id == menu_id))
    children = child_result.scalars().all()
    if children:
        raise HTTPException(status_code=400, detail="请先删除子菜�?)
    
    await db.delete(menu)
    await db.commit()
    
    duration = int((time.time() - start) * 1000)
    
    await OperLogService.create_log(
        db=db,
        user=current_user,
        method=request.method,
        url=str(request.url),
        ip_address=get_client_ip(request),
        body_params=f'{{"menu_id": {menu_id}}}',
        status=1,
        duration=duration,
    )
    
    return {"code": 200, "message": "删除成功"}


@router.get("/menu/all/select", response_model=ResponseModel)
async def get_menu_select(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:menu:list"))
):
    """获取菜单选择列表（用于权限分配）"""
    result = await db.execute(
        select(Menu).where(Menu.status == 1).order_by(Menu.sort_order.asc())
    )
    menus = result.scalars().all()
    
    options = []
    for menu in menus:
        options.append({
            "value": menu.id,
            "label": menu.menu_name,
            "parent_id": menu.parent_id,
        })
    
    return {"code": 200, "message": "操作成功", "data": options}