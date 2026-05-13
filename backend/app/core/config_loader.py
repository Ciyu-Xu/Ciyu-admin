import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.models.system_config import SystemConfig
from app.core.redis_client import get_cache, set_cache, delete_cache_by_key

_in_memory_cache: dict = {}
_cache_loaded = False

CONFIG_CACHE_KEY = "sys_config:all"
CONFIG_CACHE_TTL = 300


async def load_config_from_db(db: AsyncSession):
    """从数据库加载所有配置到缓存"""
    global _in_memory_cache, _cache_loaded

    result = await db.execute(select(SystemConfig))
    configs = result.scalars().all()

    config_dict = {}
    for config in configs:
        config_dict[config.key] = config.value

    _in_memory_cache = config_dict
    _cache_loaded = True

    await set_cache(CONFIG_CACHE_KEY, json.dumps(config_dict, ensure_ascii=False), CONFIG_CACHE_TTL)


def get_config(key: str, default: str = None) -> Optional[str]:
    return _in_memory_cache.get(key, default)


def get_config_int(key: str, default: int = None) -> int:
    value = _in_memory_cache.get(key)
    if value is not None:
        try:
            return int(value)
        except ValueError:
            pass
    return default


def get_config_bool(key: str, default: bool = False) -> bool:
    value = _in_memory_cache.get(key)
    if value is not None:
        return value.lower() in ('true', '1', 'yes', 'on')
    return default


def clear_config_cache():
    global _in_memory_cache, _cache_loaded
    _in_memory_cache = {}
    _cache_loaded = False


async def get_config_value(db: AsyncSession, key: str, default: str = None) -> Optional[str]:
    """从 Redis 缓存获取配置，miss 时回源 DB"""
    from app.core.redis_client import get_redis
    r = get_redis()
    if r:
        cached = await r.hget(CONFIG_CACHE_KEY, key)
        if cached is not None:
            return cached

    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    return config.value if config else default


async def get_token_expire_minutes(db: AsyncSession) -> int:
    cached = await get_config_value(db, "sys.expire.time")
    if cached:
        try:
            return int(cached)
        except ValueError:
            pass
    return 30


async def get_captcha_enabled(db: AsyncSession) -> bool:
    value = await get_config_value(db, "sys.account.captchaEnabled")
    return value == "true" if value else False
