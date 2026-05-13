import re
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.user import User
from app.models.password_history import PasswordHistory
from app.models.password_policy import PasswordPolicy
from app.core.security import verify_password, get_password_hash
from app.core.config_loader import get_config_value


class PasswordPolicyService:
    """密码策略服务"""
    
    _default_policy = {
        "min_length": 6,
        "max_length": 20,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_digit": True,
        "require_special": False,
        "history_count": 3,
        "expiration_days": 0,
        "same_as_username": True
    }
    
    @classmethod
    async def get_policy(cls, db: AsyncSession) -> dict:
        """获取密码策略"""
        result = await db.execute(select(PasswordPolicy).limit(1))
        policy = result.scalar_one_or_none()
        
        if not policy:
            return cls._default_policy.copy()
        
        return {
            "min_length": policy.min_length,
            "max_length": policy.max_length,
            "require_uppercase": bool(policy.require_uppercase),
            "require_lowercase": bool(policy.require_lowercase),
            "require_digit": bool(policy.require_digit),
            "require_special": bool(policy.require_special),
            "history_count": policy.history_count,
            "expiration_days": policy.expiration_days,
            "same_as_username": bool(policy.same_as_username)
        }
    
    @classmethod
    async def save_policy(cls, db: AsyncSession, policy_data: dict) -> bool:
        """保存密码策略"""
        result = await db.execute(select(PasswordPolicy).limit(1))
        policy = result.scalar_one_or_none()
        
        if policy:
            for key, value in policy_data.items():
                if hasattr(policy, key):
                    setattr(policy, key, int(value) if isinstance(value, bool) else value)
            policy.update_time = datetime.now()
        else:
            policy_data['update_time'] = datetime.now()
            policy = PasswordPolicy(**policy_data)
            db.add(policy)
        
        await db.commit()
        return True
    
    @classmethod
    def validate_password_strength(cls, password: str, policy: dict = None) -> Tuple[bool, str, str]:
        """
        验证密码强度
        返回: (是否通过, 错误消息, 密码强度等级)
        """
        if policy is None:
            policy = cls._default_policy
        
        errors = []
        strength = "weak"
        
        if len(password) < policy["min_length"]:
            errors.append(f"密码长度不能少于{policy['min_length']}位")
        elif len(password) > policy["max_length"]:
            errors.append(f"密码长度不能超过{policy['max_length']}位")
        
        if policy["require_uppercase"] and not re.search(r"[A-Z]", password):
            errors.append("必须包含大写字母")
        
        if policy["require_lowercase"] and not re.search(r"[a-z]", password):
            errors.append("必须包含小写字母")
        
        if policy["require_digit"] and not re.search(r"\d", password):
            errors.append("必须包含数字")
        
        if policy["require_special"] and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("必须包含特殊字符")
        
        score = 0
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if re.search(r"[A-Z]", password):
            score += 1
        if re.search(r"[a-z]", password):
            score += 1
        if re.search(r"\d", password):
            score += 1
        if re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            score += 1
        
        if score >= 5:
            strength = "strong"
        elif score >= 3:
            strength = "medium"
        else:
            strength = "weak"
        
        if errors:
            return False, "; ".join(errors), strength
        
        return True, "", strength
    
    @classmethod
    async def validate_password_history(
        cls, 
        db: AsyncSession, 
        user_id: int, 
        password: str,
        policy: dict = None
    ) -> Tuple[bool, str]:
        """验证密码历史（不能重复使用最近N次密码）"""
        if policy is None:
            policy = cls._default_policy
        
        history_count = policy.get("history_count", 0)
        if history_count <= 0:
            return True, ""
        
        result = await db.execute(
            select(PasswordHistory)
            .where(PasswordHistory.user_id == user_id)
            .order_by(PasswordHistory.create_time.desc())
            .limit(history_count)
        )
        histories = result.scalars().all()
        
        for history in histories:
            if verify_password(password, history.password):
                return False, f"不能使用最近使用过的密码，请使用新的密码"
        
        return True, ""
    
    @classmethod
    async def validate_same_as_username(
        cls, 
        password: str, 
        username: str,
        policy: dict = None
    ) -> Tuple[bool, str]:
        """验证密码不能与用户名相同"""
        if policy is None:
            policy = cls._default_policy
        
        if policy.get("same_as_username") and password.lower() == username.lower():
            return False, "密码不能与用户名相同"
        
        if policy.get("same_as_username") and password.lower() in username.lower():
            return False, "密码不能包含用户名"
        
        return True, ""
    
    @classmethod
    async def check_password_expiration(
        cls, 
        db: AsyncSession, 
        user_id: int,
        policy: dict = None
    ) -> Tuple[bool, int]:
        """
        检查密码是否过期
        返回: (是否过期, 剩余天数)
        """
        if policy is None:
            policy = cls._default_policy
        
        expiration_days = policy.get("expiration_days", 0)
        if expiration_days <= 0:
            return False, 0
        
        result = await db.execute(
            select(PasswordHistory)
            .where(PasswordHistory.user_id == user_id)
            .order_by(PasswordHistory.create_time.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        
        if not latest:
            return True, 0
        
        days_since_change = (datetime.now() - latest.create_time).days
        remaining_days = expiration_days - days_since_change
        
        if remaining_days <= 0:
            return True, 0
        
        return False, remaining_days
    
    @classmethod
    async def add_password_history(cls, db: AsyncSession, user_id: int, password: str):
        """添加密码历史记录"""
        history = PasswordHistory(
            user_id=user_id,
            password=get_password_hash(password)
        )
        db.add(history)
        await db.commit()
    
    @classmethod
    async def clean_old_history(cls, db: AsyncSession, user_id: int, keep_count: int = 10):
        """清理过期的密码历史记录"""
        result = await db.execute(
            select(PasswordHistory)
            .where(PasswordHistory.user_id == user_id)
            .order_by(PasswordHistory.create_time.desc())
        )
        histories = result.scalars().all()
        
        if len(histories) > keep_count:
            for history in histories[keep_count:]:
                await db.execute(
                    delete(PasswordHistory).where(PasswordHistory.id == history.id)
                )
            await db.commit()


password_policy_service = PasswordPolicyService()
