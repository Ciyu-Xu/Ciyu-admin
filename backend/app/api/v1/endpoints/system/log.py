from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc

from app.db.session import get_db
from app.models.user import User
from app.models.log import OperationLog, LoginLog
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user, check_permissions

router = APIRouter()

# 前端操作类型枚举值 → HTTP 方法映射
_OPER_TYPE_TO_METHOD = {
    "CREATE": "POST",
    "UPDATE": "PUT",
    "DELETE": "DELETE",
    "QUERY": "GET",
}


def _get_oper_type(method: str) -> str:
    mapping = {"POST": "CREATE", "PUT": "UPDATE", "DELETE": "DELETE", "GET": "QUERY"}
    return mapping.get(method.upper(), "其他")


def _get_oper_desc(url: str) -> str:
    path = url.split("?")[0].rstrip("/")
    parts = path.split("/")
    resource = parts[-1] if parts else ""
    # 如果最后一段是数字（ID），取倒数第二段
    if resource.isdigit() and len(parts) > 1:
        resource = parts[-2]
    resource_map = {
        "menu": "菜单",
        "user": "用户",
        "role": "角色",
        "dept": "部门",
        "notice": "公告",
        "config": "系统配置",
        "operlog": "操作日志",
        "loginlog": "登录日志",
    }
    return resource_map.get(resource, resource)


def _parse_user_agent(ua: str) -> tuple:
    """从 User-Agent 中解析浏览器和操作系统信息"""
    browser = "未知"
    os_name = "未知"

    if not ua:
        return browser, os_name

    # 解析浏览器
    if "Edg" in ua or "Edge" in ua:
        browser = "Edge"
    elif "OPR" in ua or "Opera" in ua:
        browser = "Opera"
    elif "Chrome" in ua and "Edg" not in ua:
        browser = "Chrome"
    elif "Firefox" in ua:
        browser = "Firefox"
    elif "Safari" in ua and "Chrome" not in ua:
        browser = "Safari"

    # 解析操作系统
    if "Windows NT" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Linux" in ua and "Android" not in ua:
        os_name = "Linux"

    return browser, os_name


@router.get("/operlog", response_model=ResponseModel)
async def get_operation_logs(
    oper_name: Optional[str] = None,
    oper_type: Optional[str] = None,
    status: Optional[int] = None,
    begin_time: Optional[str] = None,
    end_time: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:operlog:list"))
):
    """获取操作日志列表"""
    conditions = []

    if oper_name:
        conditions.append(OperationLog.username.ilike(f"%{oper_name}%"))
    if oper_type:
        http_method = _OPER_TYPE_TO_METHOD.get(oper_type.upper())
        if http_method:
            conditions.append(OperationLog.method == http_method)
    if status is not None:
        conditions.append(OperationLog.status == status)

    count_query = select(func.count()).select_from(OperationLog)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    query = select(OperationLog).offset(offset).limit(page_size).order_by(desc(OperationLog.created_at))
    if conditions:
        query = query.where(and_(*conditions))
    result = await db.execute(query)
    logs = result.scalars().all()

    rows = []
    for log in logs:
        rows.append({
            "id": log.id,
            "oper_name": log.username,
            "oper_type": _get_oper_type(log.method),
            "oper_desc": _get_oper_desc(log.url) if log.url else "",
            "request_method": log.method,
            "request_url": log.url,
            "ip_address": log.ip_address,
            "status": log.status,
            "error_msg": log.error_message,
            "execution_time": log.duration,
            "user_id": log.user_id,
            "request_params": log.body_params or log.query_params,
            "response_data": log.response,
            "user_agent": None,
            "create_time": log.created_at.isoformat() if log.created_at else None,
        })

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/operlog/{log_id}", response_model=ResponseModel)
async def get_operation_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个操作日志详情"""
    result = await db.execute(select(OperationLog).where(OperationLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        return {"code": 404, "message": "日志不存在", "data": None}
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": log.id,
            "oper_name": log.username,
            "oper_type": _get_oper_type(log.method),
            "oper_desc": _get_oper_desc(log.url) if log.url else "",
            "request_method": log.method,
            "request_url": log.url,
            "ip_address": log.ip_address,
            "status": log.status,
            "error_msg": log.error_message,
            "execution_time": log.duration,
            "user_id": log.user_id,
            "request_params": log.body_params or log.query_params,
            "response_data": log.response,
            "create_time": log.created_at.isoformat() if log.created_at else None,
        }
    }


@router.delete("/operlog/{log_id}", response_model=ResponseModel)
async def delete_operation_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:operlog:remove"))
):
    """删除操作日志"""
    result = await db.execute(select(OperationLog).where(OperationLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        return {"code": 404, "message": "日志不存在", "data": None}
    
    await db.delete(log)
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}


@router.delete("/operlog", response_model=ResponseModel)
async def batch_delete_operation_logs(
    log_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:operlog:remove"))
):
    """批量删除操作日志"""
    if not log_ids:
        return {"code": 400, "message": "请选择要删除的日志", "data": None}
    
    for log_id in log_ids:
        result = await db.execute(select(OperationLog).where(OperationLog.id == log_id))
        log = result.scalar_one_or_none()
        if log:
            await db.delete(log)
    
    await db.commit()
    
    return {"code": 200, "message": f"成功删除 {len(log_ids)} 条日志"}


@router.get("/loginlog", response_model=ResponseModel)
async def get_login_logs(
    username: Optional[str] = None,
    status: Optional[int] = None,
    begin_time: Optional[str] = None,
    end_time: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:loginlog:list"))
):
    """获取登录日志列表"""
    conditions = []
    
    if username:
        conditions.append(LoginLog.username.ilike(f"%{username}%"))
    if status is not None:
        conditions.append(LoginLog.status == status)
    
    count_query = select(func.count()).select_from(LoginLog)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    query = select(LoginLog).offset(offset).limit(page_size).order_by(desc(LoginLog.created_at))
    if conditions:
        query = query.where(and_(*conditions))
    result = await db.execute(query)
    logs = result.scalars().all()
    
    rows = []
    for log in logs:
        browser, os_name = _parse_user_agent(log.user_agent) if log.user_agent else ("未知", "未知")
        rows.append({
            "id": log.id,
            "username": log.username,
            "ip_address": log.ip_address,
            "login_location": None,
            "browser": browser,
            "os": os_name,
            "status": log.status,
            "msg": log.message,
            "user_id": log.user_id,
            "create_time": log.created_at.isoformat() if log.created_at else None,
        })

    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.delete("/loginlog/{log_id}", response_model=ResponseModel)
async def delete_login_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:loginlog:remove"))
):
    """删除登录日志"""
    result = await db.execute(select(LoginLog).where(LoginLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        return {"code": 404, "message": "日志不存在", "data": None}
    
    await db.delete(log)
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}


@router.delete("/loginlog", response_model=ResponseModel)
async def batch_delete_login_logs(
    log_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permissions("monitor:loginlog:remove"))
):
    """批量删除登录日志"""
    if not log_ids:
        return {"code": 400, "message": "请选择要删除的日志", "data": None}
    
    for log_id in log_ids:
        result = await db.execute(select(LoginLog).where(LoginLog.id == log_id))
        log = result.scalar_one_or_none()
        if log:
            await db.delete(log)
    
    await db.commit()
    
    return {"code": 200, "message": f"成功删除 {len(log_ids)} 条日志"}


@router.post("/loginlog", response_model=ResponseModel)
async def create_login_log(
    username: str,
    status: int,
    message: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """创建登录日志（内部使用）"""
    new_log = LoginLog(
        username=username,
        status=status,
        message=message,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    
    return {"code": 200, "message": "操作成功", "data": {"id": new_log.id}}


@router.post("/operlog", response_model=ResponseModel)
async def create_operation_log(
    request_body: dict,
    db: AsyncSession = Depends(get_db)
):
    """创建操作日志（内部使用）"""
    new_log = OperationLog(
        username=request_body.get("username"),
        ip_address=request_body.get("ip_address"),
        method=request_body.get("method"),
        url=request_body.get("url"),
        query_params=request_body.get("query_params"),
        body_params=request_body.get("body_params"),
        response=request_body.get("response"),
        status=request_body.get("status", 1),
        error_message=request_body.get("error_message"),
        duration=request_body.get("duration", 0),
        user_id=request_body.get("user_id")
    )
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    
    return {"code": 200, "message": "操作成功", "data": {"id": new_log.id}}
