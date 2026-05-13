from fastapi import APIRouter
from app.api.v1.endpoints import auth, sso
from app.api.v1.endpoints.system import user, role, monitor, message, dict, log, config, public_config, captcha, dept, post, dashboard, notice, task, password_policy, menu

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证管理"])
api_router.include_router(user.router, prefix="/system", tags=["系统管理"])
api_router.include_router(role.router, prefix="/system", tags=["角色管理"])
api_router.include_router(dept.router, prefix="/system", tags=["部门管理"])
api_router.include_router(post.router, prefix="/system", tags=["岗位管理"])
api_router.include_router(menu.router, prefix="/system", tags=["菜单管理"])

api_router.include_router(monitor.router, prefix="/system/monitor", tags=["系统监控"])
api_router.include_router(message.router, prefix="/system/message", tags=["消息管理"])
api_router.include_router(dict.router, prefix="/system", tags=["字典管理"])
api_router.include_router(log.router, prefix="/system", tags=["日志管理"])
api_router.include_router(config.router, prefix="/system", tags=["系统配置"])
api_router.include_router(public_config.router, prefix="/system", tags=["公开配置"])
api_router.include_router(captcha.router, prefix="/system", tags=["验证码"])
api_router.include_router(dashboard.router, prefix="/system", tags=["仪表盘"])
api_router.include_router(notice.router, prefix="/system", tags=["公告管理"])
api_router.include_router(task.router, prefix="/system/task", tags=["定时任务"])
api_router.include_router(password_policy.router, prefix="/system", tags=["密码策略"])
api_router.include_router(sso.router, prefix="", tags=["SSO 单点登录"])
