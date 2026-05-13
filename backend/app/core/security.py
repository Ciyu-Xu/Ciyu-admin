from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import settings

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token黑名单，用于强制下线（优先 Redis 回退内存）
_token_blacklist: set = set()


async def is_token_blacklisted(token: str) -> bool:
    from app.core.redis_client import get_redis
    r = get_redis()
    if r:
        return await r.sismember("token:blacklist", token)
    return token in _token_blacklist


async def add_token_blacklist(token: str):
    from app.core.redis_client import get_redis
    from app.core.config import settings
    ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    r = get_redis()
    if r:
        await r.sadd("token:blacklist", token)
        await r.expire("token:blacklist", ttl)
    else:
        _token_blacklist.add(token)


token_blacklist: set = _token_blacklist


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    # bcrypt限制密码最长72字节，超过则截断
    password_bytes = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(password_bytes, hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    # bcrypt限制密码最长72字节，超过则截断
    password_bytes = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """创建刷新令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """解码令牌"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """验证令牌"""
    payload = decode_token(token)
    if payload is None:
        return None
    
    if payload.get("type") != token_type:
        return None
    
    return payload


def get_token_payload(token: str) -> dict:
    """获取令牌载荷，验证失败抛出异常"""
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
