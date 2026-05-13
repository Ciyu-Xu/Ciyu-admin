import json
import hashlib
from functools import wraps
from typing import Optional, Callable

from app.core.redis_client import get_cache, set_cache


def cache_key(prefix: str, *args, **kwargs) -> str:
    """生成缓存键"""
    raw = f"{prefix}:{args}:{sorted(kwargs.items())}"
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


def cached(ttl: int = 60):
    """Response缓存装饰器
    
    用法:
        @router.get("/stats")
        @cached(ttl=120)
        async def get_stats():
            return {"data": "..."}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = cache_key(func.__name__, *args, **kwargs)
            cached = await get_cache(key)
            if cached is not None:
                return json.loads(cached)
            result = await func(*args, **kwargs)
            await set_cache(key, json.dumps(result, ensure_ascii=False, default=str), ttl)
            return result
        return wrapper
    return decorator
