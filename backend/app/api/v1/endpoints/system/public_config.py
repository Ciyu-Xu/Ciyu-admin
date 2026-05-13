from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.system_config import SystemConfig
from app.schemas.system_config import ResponseModel
from app.core.cache import cached

router = APIRouter()

_public_config_keys = [
    "sys.index.sitename",
    "sys.index.logo",
    "sys.index.copyright",
    "sys.account.captchaEnabled",
    "sys.account.rememberMe",
    "sys.account.registerEnabled",
    "sys.expire.time",
]


@router.get("/public", response_model=ResponseModel)
@cached(ttl=60)
async def get_public_config(
    db: AsyncSession = Depends(get_db)
):
    """获取公开配置（无需登录）"""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key.in_(_public_config_keys))
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


@router.get("/captcha-enabled", response_model=ResponseModel)
async def is_captcha_enabled(
    db: AsyncSession = Depends(get_db)
):
    """检查是否启用验证码"""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "sys.account.captchaEnabled")
    )
    config = result.scalar_one_or_none()
    
    enabled = config.value == "true" if config else True
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {"enabled": enabled}
    }
