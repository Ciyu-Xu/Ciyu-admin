import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete

from app.db.session import get_db
from app.models.user import User
from app.models.system_config import SystemConfig
from app.api.v1.deps import get_current_user
from app.services.oper_log import OperLogService

router = APIRouter()


def config_to_dict(config: SystemConfig) -> dict:
    return {
        "id": config.id,
        "config_name": config.description,
        "config_key": config.key,
        "config_value": config.value,
        "config_type": config.type,
        "is_system": config.is_public,
        "create_time": config.created_at.isoformat() if config.created_at else None,
    }


@router.get("/config/list")
async def get_config_list(
    config_name: Optional[str] = None,
    config_key: Optional[str] = None,
    config_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conditions = []
    if config_name:
        conditions.append(SystemConfig.description.ilike(f"%{config_name}%"))
    if config_key:
        conditions.append(SystemConfig.key.ilike(f"%{config_key}%"))
    if config_type:
        conditions.append(SystemConfig.type == config_type)

    where_clause = and_(*conditions) if conditions else True

    count_query = select(func.count()).where(where_clause).select_from(SystemConfig)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(SystemConfig).where(where_clause).offset(offset).limit(page_size).order_by(SystemConfig.id.desc())
    )
    configs = result.scalars().all()

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": [config_to_dict(c) for c in configs],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/config/{config_id}")
async def get_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    return {
        "code": 200,
        "message": "操作成功",
        "data": config_to_dict(config)
    }


@router.post("/config")
async def create_config(
    config_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start = time.time()
    config_key = config_data.get("config_key") or config_data.get("key")
    config_value = config_data.get("config_value") or config_data.get("value")
    config_type = config_data.get("config_type") or config_data.get("type", "string")
    config_name = config_data.get("config_name") or config_data.get("description")

    if not config_key:
        raise HTTPException(status_code=400, detail="配置键名不能为空")

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="配置键名已存在")

    new_config = SystemConfig(
        key=config_key,
        value=config_value,
        type=config_type,
        description=config_name
    )
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=request.client.host if request.client else None,
        body_params=f'{{"config_key": "{config_key}", "config_name": "{config_name}"}}',
        status=1, duration=duration,
    )

    return {"code": 200, "message": "创建成功", "data": {"id": new_config.id}}


@router.put("/config/{config_id}")
async def update_config(
    config_id: int,
    config_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start = time.time()
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    if "config_value" in config_data or "value" in config_data:
        config.value = config_data.get("config_value") or config_data.get("value")
    if "config_type" in config_data or "type" in config_data:
        config.type = config_data.get("config_type") or config_data.get("type")
    if "config_name" in config_data or "description" in config_data:
        config.description = config_data.get("config_name") or config_data.get("description")

    await db.commit()
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=request.client.host if request.client else None,
        body_params=f'{{"config_id": {config_id}}}',
        status=1, duration=duration,
    )

    return {"code": 200, "message": "更新成功"}


@router.delete("/config/{config_id}")
async def delete_config(
    config_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start = time.time()
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    if config.is_public == 1:
        raise HTTPException(status_code=400, detail="系统内置配置不能删除")

    await db.delete(config)
    await db.commit()
    duration = int((time.time() - start) * 1000)
    await OperLogService.create_log(
        db=db, user=current_user, method=request.method, url=str(request.url),
        ip_address=request.client.host if request.client else None,
        body_params=f'{{"config_id": {config_id}}}',
        status=1, duration=duration,
    )

    return {"code": 200, "message": "删除成功"}


@router.get("/config/keys/{config_key}")
async def get_config_by_key(
    config_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "config_key": config.key,
            "config_value": config.value,
            "config_type": config.type,
        }
    }


@router.post("/config/refresh")
async def refresh_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {"code": 200, "message": "刷新成功"}


@router.get("/config/batch/{config_keys}")
async def get_configs_batch(
    config_keys: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    keys = config_keys.split(",")
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key.in_(keys))
    )
    configs = result.scalars().all()

    config_dict = {}
    for config in configs:
        config_dict[config.key] = config.value

    return {
        "code": 200,
        "message": "操作成功",
        "data": config_dict
    }
