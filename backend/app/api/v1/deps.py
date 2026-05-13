from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload, joinedload

from app.db.session import get_db
from app.core.security import get_token_payload, is_token_blacklisted
from app.models.user import User, Role, Menu, user_role_table, role_menu_table
from app.models.session import UserSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """获取当前用户"""
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌已失效，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = get_token_payload(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.roles).selectinload(Role.menus)
        )
        .where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )
    
    from datetime import datetime
    result = await db.execute(
        select(UserSession).where(UserSession.token == token)
    )
    session = result.scalar_one_or_none()
    if session:
        session.last_active_time = datetime.now()
        await db.commit()
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前活跃用户"""
    return current_user


class PermissionChecker:
    """权限检查器"""
    
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        for role in current_user.roles:
            if role.role_key == "admin":
                return current_user
        
        user_permissions = set()
        for role in current_user.roles:
            for menu in role.menus:
                if menu.permission:
                    user_permissions.add(menu.permission)
        
        for permission in self.required_permissions:
            if permission in user_permissions:
                return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足",
        )


def check_permissions(*permissions: str):
    """权限检查依赖工厂"""
    return PermissionChecker(list(permissions))


async def get_user_permissions(user: User, db: AsyncSession) -> List[str]:
    """获取用户权限列表"""
    permissions = set()
    
    for role in user.roles:
        if role.role_key == "admin":
            result = await db.execute(select(Menu).where(Menu.status == 1))
            menus = result.scalars().all()
            return [menu.permission for menu in menus if menu.permission]
        
        for menu in role.menus:
            if menu.permission and menu.status == 1:
                permissions.add(menu.permission)
    
    return list(permissions)


async def get_user_menus(user: User, db: AsyncSession) -> List[Menu]:
    """获取用户菜单列表"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[get_user_menus] 用户 {user.username} 角色数量: {len(user.roles)}")
    for role in user.roles:
        logger.info(f"[get_user_menus] 角色: {role.role_key}")
    
    is_admin = any(role.role_key == "admin" for role in user.roles)
    
    if is_admin:
        logger.info("[get_user_menus] 检测到admin角色，查询所有可见菜单")
        result = await db.execute(
            select(Menu).where(
                and_(Menu.status == 1, Menu.visible == 1)
            ).order_by(Menu.sort_order)
        )
        menus = result.scalars().all()
        logger.info(f"[get_user_menus] admin查询结果: {len(menus)} 条")
        return list(menus)
    
    menu_ids_result = await db.execute(
        select(role_menu_table.c.menu_id)
        .join(Role, Role.id == role_menu_table.c.role_id)
        .join(user_role_table, user_role_table.c.role_id == Role.id)
        .where(
            and_(
                user_role_table.c.user_id == user.id,
                Role.status == 1
            )
        )
    )
    menu_ids = [row[0] for row in menu_ids_result.fetchall()]
    logger.info(f"[get_user_menus] 直接查询到的菜单ID: {menu_ids}")
    
    if not menu_ids:
        logger.info("[get_user_menus] 没有菜单权限，返回空列表")
        return []
    
    result = await db.execute(
        select(Menu).where(
            and_(Menu.id.in_(menu_ids), Menu.status == 1, Menu.visible == 1)
        ).order_by(Menu.sort_order)
    )
    menus = list(result.scalars().all())
    logger.info(f"[get_user_menus] 最终菜单列表: {[m.menu_name for m in menus]}")
    return menus
