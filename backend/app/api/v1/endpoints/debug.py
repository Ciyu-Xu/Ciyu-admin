from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.session import get_db
from app.models.user import User, Role, Menu
from app.api.v1.deps import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/debug-menus")
async def debug_menus(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """调试菜单接口"""
    logger.info(f"[DEBUG] 用户: {current_user.username}, ID: {current_user.id}")

    roles_info = []
    for role in current_user.roles:
        logger.info(f"[DEBUG] 角色: {role.role_key}, 菜单数: {len(role.menus)}")
        roles_info.append({
            "id": role.id,
            "role_key": role.role_key,
            "role_name": role.role_name,
            "menu_count": len(role.menus)
        })

    if current_user.roles:
        first_role = current_user.roles[0]
        logger.info(f"[DEBUG] 第一个角色 menus 详情: {[m.id for m in first_role.menus]}")

    if any(role.role_key == "admin" for role in current_user.roles):
        logger.info("[DEBUG] 用户是 admin，开始查询菜单...")
        result = await db.execute(
            select(Menu).where(
                and_(Menu.status == 1, Menu.visible == 1)
            ).order_by(Menu.sort_order)
        )
        menus = result.scalars().all()
        logger.info(f"[DEBUG] 查询到 {len(menus)} 条菜单")

        return {
            "success": True,
            "user": current_user.username,
            "is_admin": True,
            "roles": roles_info,
            "menu_count": len(menus),
            "menu_names": [m.menu_name for m in menus]
        }

    return {
        "success": True,
        "user": current_user.username,
        "is_admin": False,
        "roles": roles_info
    }
