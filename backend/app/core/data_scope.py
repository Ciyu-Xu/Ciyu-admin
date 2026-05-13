from typing import Optional, List
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, Dept


async def get_user_dept_ids(db: AsyncSession, dept_id: int) -> List[int]:
    """获取部门及所有子部门的ID列表"""
    if not dept_id:
        return []
    
    dept_ids = [dept_id]
    
    async def get_sub_depts(parent_id: int):
        result = await db.execute(
            select(Dept.id).where(Dept.parent_id == parent_id)
        )
        sub_depts = [row[0] for row in result.fetchall()]
        for sub_dept_id in sub_depts:
            dept_ids.append(sub_dept_id)
            await get_sub_depts(sub_dept_id)
    
    await get_sub_depts(dept_id)
    return dept_ids


async def get_data_scope_filter(
    db: AsyncSession,
    current_user: User,
    target_model,
    user_id_field: Optional[str] = None,
    dept_id_field: Optional[str] = None
):
    """
    根据当前用户的数据范围权限生成过滤条件
    
    Args:
        db: 数据库会话
        current_user: 当前用户
        target_model: 目标模型类（如 User, OperationLog 等）
        user_id_field: 用户ID字段名（如 "user_id"）
        dept_id_field: 部门ID字段名（如 "dept_id"）
    
    Returns:
        SQLAlchemy 过滤条件
    """
    if not current_user:
        return None
    
    if hasattr(current_user, 'roles'):
        for role in current_user.roles:
            if role.role_key == "admin":
                return None
    
    for role in current_user.roles:
        if role.data_scope == "1":
            return None
    
    user_dept_id = getattr(current_user, 'dept_id', None)
    
    conditions = []
    
    for role in current_user.roles:
        if role.data_scope == "4":
            if user_id_field and hasattr(target_model, user_id_field):
                conditions.append(getattr(target_model, user_id_field) == current_user.id)
        
        elif role.data_scope in ["2", "3"]:
            if dept_id_field and user_dept_id:
                if hasattr(target_model, dept_id_field):
                    if role.data_scope == "2":
                        conditions.append(getattr(target_model, dept_id_field) == user_dept_id)
                    elif role.data_scope == "3":
                        sub_dept_ids = await get_user_dept_ids(db, user_dept_id)
                        if sub_dept_ids:
                            conditions.append(getattr(target_model, dept_id_field).in_(sub_dept_ids))
    
    if conditions:
        return or_(*conditions)
    
    return None


async def get_user_data_scope_filter(
    db: AsyncSession,
    current_user: User
):
    """
    获取用户列表的数据范围过滤条件
    直接过滤 User 模型
    """
    if not current_user:
        return None
    
    if hasattr(current_user, 'roles'):
        for role in current_user.roles:
            if role.role_key == "admin":
                return None
    
    for role in current_user.roles:
        if role.data_scope == "1":
            return None
    
    user_dept_id = getattr(current_user, 'dept_id', None)
    
    conditions = []
    
    for role in current_user.roles:
        if role.data_scope == "4":
            conditions.append(User.id == current_user.id)
        
        elif role.data_scope in ["2", "3"]:
            if user_dept_id:
                if role.data_scope == "2":
                    conditions.append(User.dept_id == user_dept_id)
                elif role.data_scope == "3":
                    sub_dept_ids = await get_user_dept_ids(db, user_dept_id)
                    if sub_dept_ids:
                        conditions.append(User.dept_id.in_(sub_dept_ids))
    
    if conditions:
        return or_(*conditions)
    
    return None


async def get_dept_data_scope_filter(
    db: AsyncSession,
    current_user: User
):
    """
    获取部门列表的数据范围过滤条件
    管理员：所有部门
    本部门及以下：当前部门及子部门
    仅本人/本部门：当前部门
    """
    if not current_user:
        return None
    
    if hasattr(current_user, 'roles'):
        for role in current_user.roles:
            if role.role_key == "admin":
                return None
    
    user_dept_id = getattr(current_user, 'dept_id', None)
    
    for role in current_user.roles:
        if role.data_scope == "1":
            return None
    
    if not user_dept_id:
        return Dept.id == 0
    
    conditions = []
    
    for role in current_user.roles:
        if role.data_scope in ["2", "3", "4"]:
            if role.data_scope == "2":
                conditions.append(Dept.id == user_dept_id)
            elif role.data_scope == "3":
                sub_dept_ids = await get_user_dept_ids(db, user_dept_id)
                if sub_dept_ids:
                    conditions.append(Dept.id.in_(sub_dept_ids))
            elif role.data_scope == "4":
                conditions.append(Dept.id == user_dept_id)
    
    if conditions:
        return or_(*conditions)
    
    return None
