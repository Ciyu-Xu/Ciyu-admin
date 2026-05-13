import secrets
import hashlib
import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system_config import SystemConfig
from app.core.config import settings

SSO_STATES: dict = {}


class SSOProvider:
    def __init__(self, name: str, authorize_url: str, token_url: str, userinfo_url: str,
                 client_id: str, client_secret: str, scope: str = "openid email profile",
                 enabled: bool = False):
        self.name = name
        self.authorize_url = authorize_url
        self.token_url = token_url
        self.userinfo_url = userinfo_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.scope = scope
        self.enabled = enabled

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        return (
            f"{self.authorize_url}?"
            f"client_id={self.client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={self.scope}&"
            f"state={state}"
        )

    async def exchange_code(self, code: str, redirect_uri: str) -> Optional[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.token_url, data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })
            if resp.status_code != 200:
                return None
            return resp.json()

    async def get_userinfo(self, access_token: str) -> Optional[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(self.userinfo_url, headers={
                "Authorization": f"Bearer {access_token}"
            })
            if resp.status_code != 200:
                return None
            return resp.json()


GITHUB_PROVIDER = SSOProvider(
    name="github",
    authorize_url="https://github.com/login/oauth/authorize",
    token_url="https://github.com/login/oauth/access_token",
    userinfo_url="https://api.github.com/user",
    client_id="",
    client_secret="",
    scope="read:user user:email",
    enabled=False,
)

GITEE_PROVIDER = SSOProvider(
    name="gitee",
    authorize_url="https://gitee.com/oauth/authorize",
    token_url="https://gitee.com/oauth/token",
    userinfo_url="https://gitee.com/api/v5/user",
    client_id="",
    client_secret="",
    scope="user_info",
    enabled=False,
)


def get_providers() -> dict[str, SSOProvider]:
    return {
        "github": GITHUB_PROVIDER,
        "gitee": GITEE_PROVIDER,
    }


def get_provider(name: str) -> Optional[SSOProvider]:
    return get_providers().get(name)


def generate_state() -> str:
    return secrets.token_hex(16)


def generate_nonce() -> str:
    return secrets.token_hex(32)


async def load_provider_config(db: AsyncSession, provider_name: str) -> SSOProvider:
    provider = get_provider(provider_name)
    if not provider:
        return None

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == f"sso.{provider_name}.client_id")
    )
    config = result.scalar_one_or_none()
    if config and config.value:
        provider.client_id = config.value

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == f"sso.{provider_name}.client_secret")
    )
    config = result.scalar_one_or_none()
    if config and config.value:
        provider.client_secret = config.value

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == f"sso.{provider_name}.enabled")
    )
    config = result.scalar_one_or_none()
    if config:
        provider.enabled = config.value == "true"

    return provider


async def get_sso_configs(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key.like("sso.%"))
    )
    configs = result.scalars().all()
    return [{"id": c.id, "key": c.key, "value": c.value, "description": c.description} for c in configs]


async def init_sso_configs(db: AsyncSession):
    defaults = [
        ("sso.github.client_id", "", "GitHub OAuth Client ID"),
        ("sso.github.client_secret", "", "GitHub OAuth Client Secret"),
        ("sso.github.enabled", "false", "启用 GitHub 登录"),
        ("sso.gitee.client_id", "", "Gitee OAuth Client ID"),
        ("sso.gitee.client_secret", "", "Gitee OAuth Client Secret"),
        ("sso.gitee.enabled", "false", "启用 Gitee 登录"),
        ("sso.enabled", "false", "启用 SSO 单点登录"),
    ]
    for key, value, desc in defaults:
        existing = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        if not existing.scalar_one_or_none():
            db.add(SystemConfig(key=key, value=value, description=desc, type="string"))
    await db.commit()


async def get_sso_enabled(db: AsyncSession) -> bool:
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "sso.enabled")
    )
    config = result.scalar_one_or_none()
    return config is not None and config.value == "true"
