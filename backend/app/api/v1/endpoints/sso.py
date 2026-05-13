from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.session import get_db
from app.core.security import create_access_token
from app.models.user import User, Role, user_role_table
from app.services.sso import (
    load_provider_config, generate_state, generate_nonce,
    get_providers, SSO_STATES, get_sso_configs, init_sso_configs
)
from app.services.oper_log import OperLogService
from app.api.v1.deps import get_current_user, check_permissions
from app.schemas.user import ResponseModel

router = APIRouter()


@router.get("/sso/providers", response_model=ResponseModel)
async def get_sso_providers(
    db: AsyncSession = Depends(get_db),
):
    """获取已启用的 SSO 提供商列表"""
    providers = []
    for name, provider in get_providers().items():
        p = await load_provider_config(db, name)
        if p and p.enabled:
            providers.append({
                "name": p.name,
                "label": "GitHub" if p.name == "github" else "Gitee",
                "icon": p.name,
            })
    return {"code": 200, "message": "操作成功", "data": providers}


@router.get("/sso/login/{provider}")
async def sso_login(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """发起 SSO 登录"""
    p = await load_provider_config(db, provider)
    if not p or not p.enabled:
        raise HTTPException(status_code=400, detail="该 SSO 提供商未启用")

    state = generate_state()
    SSO_STATES[state] = provider

    redirect_uri = str(request.base_url).rstrip("/") + f"/api/v1/sso/callback/{provider}"
    authorize_url = p.get_authorize_url(redirect_uri, state)

    return {"code": 200, "message": "操作成功", "data": {"authorize_url": authorize_url, "state": state}}


@router.get("/sso/callback/{provider}")
async def sso_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """SSO 回调处理"""
    p = await load_provider_config(db, provider)
    if not p:
        raise HTTPException(status_code=400, detail="不支持的 SSO 提供商")

    expected_provider = SSO_STATES.pop(state, None)
    if expected_provider != provider:
        raise HTTPException(status_code=400, detail="无效的 state 参数")

    redirect_uri = str(request.base_url).rstrip("/") + f"/api/v1/sso/callback/{provider}"
    token_data = await p.exchange_code(code, redirect_uri)
    if not token_data:
        raise HTTPException(status_code=400, detail="获取访问令牌失败")

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="访问令牌不存在")

    user_info = await p.get_userinfo(access_token)
    if not user_info:
        raise HTTPException(status_code=400, detail="获取用户信息失败")

    if provider == "github":
        sso_id = str(user_info.get("id"))
        username = user_info.get("login")
        email = user_info.get("email")
        avatar = user_info.get("avatar_url")
        nickname = user_info.get("name") or username
    elif provider == "gitee":
        sso_id = str(user_info.get("id"))
        username = user_info.get("login")
        email = user_info.get("email")
        avatar = user_info.get("avatar_url")
        nickname = user_info.get("name") or username
    else:
        raise HTTPException(status_code=400, detail="不支持的 SSO 提供商")

    existing = await db.execute(
        select(User).where(
            or_(User.sso_id == sso_id, User.email == email) if email else User.sso_id == sso_id
        )
    )
    user = existing.scalar_one_or_none()

    if not user:
        guest_role = await db.execute(select(Role).where(Role.role_key == "guest"))
        guest_role = guest_role.scalar_one_or_none()

        user = User(
            username=username,
            nickname=nickname or username,
            email=email,
            avatar=avatar or "",
            status=1,
            sso_id=sso_id,
            sso_provider=provider,
        )
        db.add(user)
        await db.flush()

        if guest_role:
            from sqlalchemy import insert
            await db.execute(
                insert(user_role_table).values(user_id=user.id, role_id=guest_role.id)
            )
    else:
        if avatar:
            user.avatar = avatar
        user.sso_id = sso_id
        user.sso_provider = provider

    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(data={"sub": str(user.id)})

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent") if request else None
    await OperLogService.create_log(
        db=db, user=user, method="SSO", url=f"/sso/callback/{provider}",
        ip_address=client_ip, status=1, duration=0,
    )

    frontend_url = "http://localhost:5173"
    return f"""
    <!DOCTYPE html>
    <html>
    <head><title>登录成功</title></head>
    <body>
        <script>
            localStorage.setItem('token', '{jwt_token}');
            window.location.href = '{frontend_url}';
        </script>
    </body>
    </html>
    """


@router.get("/sso/configs", response_model=ResponseModel)
async def get_sso_configs_api(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:config:list")),
):
    """获取 SSO 配置"""
    configs = await get_sso_configs(db)
    return {"code": 200, "message": "操作成功", "data": configs}


@router.put("/sso/config/{config_id}", response_model=ResponseModel)
async def update_sso_config(
    config_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_permissions("system:config:edit")),
):
    """更新 SSO 配置"""
    from app.models.system_config import SystemConfig
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    config.value = data.get("value", config.value)
    await db.commit()
    return {"code": 200, "message": "保存成功"}
