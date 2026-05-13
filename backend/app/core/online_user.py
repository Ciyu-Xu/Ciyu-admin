from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.models.session import UserSession
from app.core.security import add_token_blacklist


class OnlineUserService:
    
    @staticmethod
    async def create_session(
        db: AsyncSession,
        user_id: int,
        username: str,
        token: str,
        ip_address: str = "127.0.0.1",
        user_agent: str = None,
        session_id: str = None,
        single_login: bool = True
    ) -> UserSession:
        """创建新会话"""
        if single_login:
            result = await db.execute(
                select(UserSession).where(
                    and_(
                        UserSession.user_id == user_id,
                        UserSession.is_online == True
                    )
                )
            )
            existing_sessions = result.scalars().all()
            for old_session in existing_sessions:
                old_session.is_online = False
                await add_token_blacklist(old_session.token)
        
        result = await db.execute(
            select(UserSession).where(UserSession.token == token)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.is_online = True
            existing.last_active_time = datetime.now()
            existing.ip_address = ip_address
            await db.commit()
            return existing
        
        session = UserSession(
            user_id=user_id,
            username=username,
            token=token,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            is_online=True,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session
    
    @staticmethod
    async def get_online_users(db: AsyncSession, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """获取在线用户列表"""
        offset = (page - 1) * page_size
        
        total_result = await db.execute(
            select(UserSession).where(UserSession.is_online == True)
        )
        total = len(total_result.scalars().all())
        
        result = await db.execute(
            select(UserSession)
            .where(UserSession.is_online == True)
            .order_by(UserSession.last_active_time.desc())
            .offset(offset)
            .limit(page_size)
        )
        sessions = result.scalars().all()
        
        rows = []
        for session in sessions:
            rows.append({
                "id": session.id,
                "user_id": session.user_id,
                "username": session.username,
                "ip_address": session.ip_address,
                "login_time": session.login_time.isoformat() if session.login_time else None,
                "last_active_time": session.last_active_time.isoformat() if session.last_active_time else None,
                "user_agent": session.user_agent or "-",
                "session_id": session.session_id,
            })
        
        return {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    
    @staticmethod
    async def get_user_sessions(db: AsyncSession, user_id: int) -> List[UserSession]:
        """获取用户的所有会话"""
        result = await db.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_online == True)
            .order_by(UserSession.login_time.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def force_logout(
        db: AsyncSession,
        token: str = None,
        session_id: str = None,
        user_id: int = None
    ) -> bool:
        """强制下线用户"""
        if token:
            result = await db.execute(
                select(UserSession).where(UserSession.token == token)
            )
            session = result.scalar_one_or_none()
            if session:
                session.is_online = False
                await add_token_blacklist(token)
                await db.commit()
                return True
        elif session_id:
            result = await db.execute(
                select(UserSession).where(UserSession.session_id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                session.is_online = False
                await add_token_blacklist(session.token)
                await db.commit()
                return True
        elif user_id:
            result = await db.execute(
                select(UserSession).where(UserSession.user_id == user_id, UserSession.is_online == True)
            )
            sessions = result.scalars().all()
            for session in sessions:
                session.is_online = False
                await add_token_blacklist(session.token)
            await db.commit()
            return True
        return False
    
    @staticmethod
    async def force_logout_all_except_current(
        db: AsyncSession,
        exclude_token: str
    ) -> int:
        """强制下线除当前用户外的所有用户"""
        result = await db.execute(
            select(UserSession).where(
                and_(
                    UserSession.token != exclude_token,
                    UserSession.is_online == True
                )
            )
        )
        sessions = result.scalars().all()
        count = 0
        for session in sessions:
            session.is_online = False
            await add_token_blacklist(session.token)
            count += 1
        await db.commit()
        return count
    
    @staticmethod
    async def update_activity(db: AsyncSession, token: str):
        """更新用户活跃时间"""
        result = await db.execute(
            select(UserSession).where(UserSession.token == token)
        )
        session = result.scalar_one_or_none()
        if session:
            session.last_active_time = datetime.now()
            await db.commit()
    
    @staticmethod
    async def cleanup_inactive_sessions(db: AsyncSession, minutes: int = 30):
        """清理不活跃的会话"""
        from datetime import timedelta
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        result = await db.execute(
            select(UserSession).where(
                and_(
                    UserSession.is_online == True,
                    UserSession.last_active_time < cutoff_time
                )
            )
        )
        sessions = result.scalars().all()
        count = 0
        for session in sessions:
            session.is_online = False
            count += 1
        await db.commit()
        return count
    
    @staticmethod
    async def logout(db: AsyncSession, token: str):
        """用户登出"""
        result = await db.execute(
            select(UserSession).where(UserSession.token == token)
        )
        session = result.scalar_one_or_none()
        if session:
            session.is_online = False
            await add_token_blacklist(token)
            await db.commit()


online_user_service = OnlineUserService()
