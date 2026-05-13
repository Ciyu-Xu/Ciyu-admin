from typing import Optional
from redis.asyncio import Redis

from app.core.config import settings

redis_client: Optional[Redis] = None


async def init_redis():
    global redis_client
    if redis_client is None:
        redis_client = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def get_redis() -> Redis:
    return redis_client


async def set_cache(key: str, value: str, ttl: int = 300):
    r = get_redis()
    if r:
        await r.setex(key, ttl, value)


async def get_cache(key: str) -> Optional[str]:
    r = get_redis()
    if r:
        return await r.get(key)
    return None


async def delete_cache(pattern: str):
    """按模式删除缓存，如 delete_cache('dashboard:*')"""
    r = get_redis()
    if r:
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)


async def delete_cache_by_key(key: str):
    r = get_redis()
    if r:
        await r.delete(key)
