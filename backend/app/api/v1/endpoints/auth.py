from datetime import timedelta, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, insert

from app.db.session import get_db
from app.core.security import (
    verify_password, 
    create_access_token, 
    create_refresh_token,
    get_password_hash
)
from app.core.config import settings
from app.core.captcha import captcha_manager
from app.core.rate_limit import rate_limiter
from app.core.config_loader import get_token_expire_minutes, get_captcha_enabled, get_config_value
from app.core.file_upload import save_base64_image
from app.core.password_policy import password_policy_service
from app.models.user import User, Role, Menu, user_role_table
from app.models.system_config import SystemConfig
from app.models.log import LoginLog
from app.schemas.user import (
    LoginRequest, 
    LoginResponse, 
    UserInfoResponse,
    ResponseModel,
    ProfileUpdateRequest,
    PasswordUpdateRequest,
    RegisterRequest
)
from app.api.v1.deps import (
    get_current_user, 
    get_user_permissions, 
    get_user_menus,
    oauth2_scheme
)
from app.core.online_user import online_user_service
from app.utils.ip import get_client_ip
import uuid

router = APIRouter()


@router.post("/login", response_model=ResponseModel)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """用户登录"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "Unknown")
    
    is_blocked, status_info = rate_limiter.record_attempt(client_ip)
    if not is_blocked and "剩余尝试次数" not in status_info and "登录失败" not in status_info:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=status_info
        )
    
    captcha_enabled = await get_captcha_enabled(db)
    
    if captcha_enabled:
        if not login_data.captcha or not login_data.captcha_session_id:
            login_log = LoginLog(
                username=login_data.username,
                status=0,
                message="验证码不能为空",
                ip_address=client_ip,
                user_agent=user_agent
            )
            db.add(login_log)
            await db.commit()
            rate_limiter.record_attempt(client_ip)
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码不能为空"
            )
        
        if not captcha_manager.verify(login_data.captcha_session_id, login_data.captcha):
            login_log = LoginLog(
                username=login_data.username,
                status=0,
                message="验证码错误",
                ip_address=client_ip,
                user_agent=user_agent
            )
            db.add(login_log)
            await db.commit()
            rate_limiter.record_attempt(client_ip)
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误"
            )
    
    result = await db.execute(
        select(User).where(User.username == login_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        login_log = LoginLog(
            username=login_data.username,
            status=0,
            message="用户名不存在",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(login_log)
        await db.commit()
        rate_limiter.record_attempt(client_ip)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    if not verify_password(login_data.password, user.hashed_password):
        login_log = LoginLog(
            username=login_data.username,
            status=0,
            message="密码错误",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(login_log)
        await db.commit()
        rate_limiter.record_attempt(client_ip)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    if user.status == 0:
        login_log = LoginLog(
            username=login_data.username,
            status=0,
            message="账号待审核",
            ip_address=client_ip,
            user_agent=user_agent,
            user_id=user.id
        )
        db.add(login_log)
        await db.commit()
        rate_limiter.record_attempt(client_ip)
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您的账号待管理员审核，请耐心等待"
        )
    
    login_log = LoginLog(
        username=login_data.username,
        status=1,
        message="登录成功",
        ip_address=client_ip,
        user_agent=user_agent,
        user_id=user.id
    )
    db.add(login_log)
    await db.commit()
    
    rate_limiter.record_attempt(client_ip, success=True)
    
    expire_minutes = await get_token_expire_minutes(db)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    session_id = str(uuid.uuid4())
    
    await online_user_service.create_session(
        db=db,
        user_id=user.id,
        username=user.username,
        token=access_token,
        ip_address=client_ip,
        user_agent=user_agent,
        session_id=session_id
    )
    
    return ResponseModel(
        code=200,
        message="登录成功",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": expire_minutes * 60,
            "session_id": session_id
        }
    )


@router.post("/register", response_model=ResponseModel)
async def register(
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """用户注册"""
    register_enabled = await get_config_value(db, "sys.account.registerEnabled")
    if register_enabled != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="系统未开放注册"
        )
    
    if not register_data.username or len(register_data.username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名至少需要3个字符"
        )
    
    if not register_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码不能为空"
        )
    
    policy = await password_policy_service.get_policy(db)
    
    is_valid, error_msg, strength = password_policy_service.validate_password_strength(
        register_data.password, policy
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"密码不符合要求：{error_msg}"
        )
    
    is_valid, error_msg = await password_policy_service.validate_same_as_username(
        register_data.password, register_data.username, policy
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    result = await db.execute(select(User).where(User.username == register_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    if register_data.email:
        result = await db.execute(select(User).where(User.email == register_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被使用"
            )
    
    if register_data.phone:
        result = await db.execute(select(User).where(User.phone == register_data.phone))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号已被使用"
            )
    
    new_user = User(
        username=register_data.username,
        hashed_password=get_password_hash(register_data.password),
        nickname=register_data.nickname or register_data.username,
        email=register_data.email,
        phone=register_data.phone,
        status=0,
    )
    db.add(new_user)
    await db.flush()
    
    guest_role_result = await db.execute(select(Role).where(Role.role_key == "guest"))
    guest_role = guest_role_result.scalar_one_or_none()
    if guest_role:
        await db.execute(
            insert(user_role_table).values(user_id=new_user.id, role_id=guest_role.id)
        )
    
    await db.commit()
    await db.refresh(new_user)
    
    return {
        "code": 200,
        "message": "注册成功！您的账号已创建，待管理员审核后即可登录。",
        "data": {
            "user_id": new_user.id,
            "username": new_user.username,
            "status": 0
        }
    }


@router.put("/profile", response_model=ResponseModel)
async def update_user_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """修改个人信息"""
    if profile_data.nickname is not None and not profile_data.nickname.strip():
        raise HTTPException(status_code=400, detail="昵称不能为空")
    
    if profile_data.nickname is not None:
        current_user.nickname = profile_data.nickname.strip()
    if profile_data.email is not None:
        current_user.email = profile_data.email
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone
    if profile_data.avatar is not None:
        if profile_data.avatar.startswith("data:image"):
            current_user.avatar = save_base64_image(profile_data.avatar)
        else:
            current_user.avatar = profile_data.avatar
    
    await db.commit()
    await db.refresh(current_user)
    
    return ResponseModel(
        code=200,
        message="个人信息更新成功",
        data={
            "id": current_user.id,
            "username": current_user.username,
            "nickname": current_user.nickname,
            "email": current_user.email,
            "phone": current_user.phone,
            "avatar": current_user.avatar,
        }
    )


@router.put("/password", response_model=ResponseModel)
async def update_user_password(
    password_data: PasswordUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """修改密码"""
    from app.core.security import verify_password, get_password_hash
    from app.core.password_policy import password_policy_service
    from datetime import datetime
    
    if not password_data.oldPassword:
        raise HTTPException(status_code=400, detail="请输入原密码")
    
    if not password_data.newPassword:
        raise HTTPException(status_code=400, detail="请输入新密码")
    
    if not verify_password(password_data.oldPassword, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="原密码错误")
    
    policy = await password_policy_service.get_policy(db)
    
    is_valid, error_msg, strength = password_policy_service.validate_password_strength(
        password_data.newPassword, policy
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"新密码不符合要求: {error_msg}")
    
    is_same_as_username, username_error = await password_policy_service.validate_same_as_username(
        password_data.newPassword, current_user.username, policy
    )
    if not is_same_as_username:
        raise HTTPException(status_code=400, detail=username_error)
    
    is_valid_history, history_error = await password_policy_service.validate_password_history(
        db, current_user.id, password_data.newPassword, policy
    )
    if not is_valid_history:
        raise HTTPException(status_code=400, detail=history_error)
    
    await password_policy_service.add_password_history(db, current_user.id, password_data.newPassword)
    await password_policy_service.clean_old_history(db, current_user.id, policy.get("history_count", 10))
    
    current_user.hashed_password = get_password_hash(password_data.newPassword)
    await db.commit()
    
    return ResponseModel(
        code=200,
        message="密码修改成功"
    )


@router.post("/logout", response_model=ResponseModel)
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """用户登出"""
    await online_user_service.logout(db, token)
    return ResponseModel(
        code=200,
        message="登出成功"
    )


@router.get("/info", response_model=ResponseModel)
async def get_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户信息"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    
    permissions = await get_user_permissions(current_user, db)
    
    user_info = {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "email": user.email,
        "phone": user.phone,
        "avatar": user.avatar,
        "roles": [role.role_key for role in user.roles],
        "permissions": permissions
    }
    
    return ResponseModel(
        code=200,
        message="操作成功",
        data=user_info
    )


@router.get("/menus", response_model=ResponseModel)
async def get_user_menus_api(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户菜单"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[菜单] 用户 {current_user.username} 的角色: {[r.role_key for r in current_user.roles]}")
    
    menus = await get_user_menus(current_user, db)
    logger.info(f"[菜单] 查询到的菜单数量: {len(menus)}")
    logger.info(f"[菜单] 菜单列表: {[m.menu_name for m in menus]}")
    
    def convert_menu(menu: Menu) -> dict:
        return {
            "id": menu.id,
            "menu_name": menu.menu_name,
            "path": menu.path,
            "component": menu.component,
            "icon": menu.icon,
            "parent_id": menu.parent_id,
            "sort_order": menu.sort_order,
            "menu_type": menu.menu_type,
            "permission": menu.permission,
            "status": menu.status,
        }
    
    menu_tree = []
    menu_dict = {}
    menu_ids = {menu.id for menu in menus}
    
    for menu in menus:
        menu_dict[menu.id] = convert_menu(menu)
        menu_dict[menu.id]["children"] = []
    
    for menu in menus:
        if menu.parent_id == 0:
            menu_tree.append(menu_dict[menu.id])
        else:
            if menu.parent_id in menu_ids:
                parent = menu_dict.get(menu.parent_id)
                if parent:
                    parent["children"].append(menu_dict[menu.id])
            else:
                logger.info(f"[菜单] 父菜单 {menu.parent_id} 不在用户菜单列表中，为子菜单创建虚拟父菜单")
                parent_result = await db.execute(
                    select(Menu).where(Menu.id == menu.parent_id)
                )
                parent_menu = parent_result.scalar_one_or_none()
                if parent_menu and parent_menu.status == 1 and parent_menu.visible == 1:
                    menu_dict[parent_menu.id] = convert_menu(parent_menu)
                    menu_dict[parent_menu.id]["children"] = [menu_dict[menu.id]]
                    menu_tree.append(menu_dict[parent_menu.id])
                    menu_ids.add(parent_menu.id)
                else:
                    logger.warning(f"[菜单] 父菜单 {menu.parent_id} 状态或可见性不满足，跳过")
    
    return ResponseModel(
        code=200,
        message="操作成功",
        data=menu_tree
    )


@router.post("/refresh", response_model=ResponseModel)
async def refresh_token(
    request_body: dict
):
    """刷新令牌"""
    from app.core.security import get_token_payload, create_access_token
    
    refresh_token = request_body.get("refresh_token", "")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 refresh_token"
        )
    
    payload = get_token_payload(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌"
        )
    
    user_id = payload.get("sub")
    new_access_token = create_access_token(data={"sub": user_id})
    
    return ResponseModel(
        code=200,
        message="操作成功",
        data={
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    )