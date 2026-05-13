from app.api.v1.endpoints.system.user import router as user_router
from app.api.v1.endpoints.system.role import router as role_router
from app.api.v1.endpoints.system.monitor import router as monitor_router
from app.api.v1.endpoints.system.message import router as message_router
from app.api.v1.endpoints.system.config import router as config_router
from app.api.v1.endpoints.system.dashboard import router as dashboard_router
from app.api.v1.endpoints.system.dept import router as dept_router
from app.api.v1.endpoints.system.post import router as post_router
from app.api.v1.endpoints.system.notice import router as notice_router

__all__ = ["user_router", "role_router", "monitor_router", "message_router", "config_router", "dashboard_router", "dept_router", "post_router", "notice_router"]
