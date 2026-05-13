from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.core.password_policy import password_policy_service

router = APIRouter()


class PasswordPolicyUpdate(BaseModel):
    min_length: int = 6
    max_length: int = 20
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special: bool = False
    history_count: int = 3
    expiration_days: int = 0
    same_as_username: bool = True


@router.get("/password-policy")
async def get_password_policy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取密码策略"""
    policy = await password_policy_service.get_policy(db)
    return {
        "code": 200,
        "message": "操作成功",
        "data": policy
    }


@router.put("/password-policy")
async def update_password_policy(
    policy_data: PasswordPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新密码策略"""
    for role in current_user.roles:
        if role.role_key == "admin":
            break
    else:
        return {"code": 403, "message": "权限不足", "data": None}
    
    await password_policy_service.save_policy(db, policy_data.model_dump())
    return {
        "code": 200,
        "message": "密码策略更新成功",
        "data": None
    }


@router.post("/validate-password")
async def validate_password(
    password: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """验证密码是否符合策略"""
    policy = await password_policy_service.get_policy(db)
    
    is_valid, error_msg, strength = password_policy_service.validate_password_strength(
        password, policy
    )
    
    is_same_as_username, username_error = await password_policy_service.validate_same_as_username(
        password, current_user.username, policy
    )
    
    if not is_same_as_username:
        is_valid = False
        error_msg = username_error
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "valid": is_valid,
            "error": error_msg,
            "strength": strength
        }
    }
