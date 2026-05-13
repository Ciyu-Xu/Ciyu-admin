from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.models.system_config import SystemConfig

_config_cache: dict = {}
_cache_loaded = False


async def load_config_from_db(db: AsyncSession):
    """从数据库加载所有配置到缓存"""
    global _config_cache, _cache_loaded
    
    result = await db.execute(select(SystemConfig))
    configs = result.scalars().all()
    
    for config in configs:
        _config_cache[config.key] = config.value
    
    _cache_loaded = True


def get_config(key: str, default: str = None) -> Optional[str]:
    """从缓存获取配置"""
    return _config_cache.get(key, default)


def get_config_int(key: str, default: int = None) -> int:
    """获取整型配置"""
    value = _config_cache.get(key)
    if value is not None:
        try:
            return int(value)
        except ValueError:
            pass
    return default


def get_config_bool(key: str, default: bool = False) -> bool:
    """获取布尔型配置"""
    value = _config_cache.get(key)
    if value is not None:
        return value.lower() in ('true', '1', 'yes', 'on')
    return default


def clear_config_cache():
    """清除配置缓存"""
    global _config_cache, _cache_loaded
    _config_cache = {}
    _cache_loaded = False


async def get_config_value(db: AsyncSession, key: str, default: str = None) -> Optional[str]:
    """直接从数据库获取单个配置"""
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    return config.value if config else default


async def get_token_expire_minutes(db: AsyncSession) -> int:
    """获取Token过期时间（分钟）"""
    value = await get_config_value(db, "sys.expire.time")
    if value:
        try:
            return int(value)
        except ValueError:
            pass
    return 30


async def get_captcha_enabled(db: AsyncSession) -> bool:
    """检查是否启用验证码"""
    value = await get_config_value(db, "sys.account.captchaEnabled")
    return value == "true" if value else False
