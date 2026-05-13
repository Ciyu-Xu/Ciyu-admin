from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, and_
from app.models.user import User, Role, Menu, Dept, Post, DictType, DictData, role_menu_table, user_role_table, user_post_table
from app.models.message import Message
from app.models.log import OperationLog, LoginLog
from app.models.system_config import SystemConfig
from app.models.notice import Notice
from app.models.session import UserSession
from app.core.security import get_password_hash


async def init_data(session: AsyncSession):
    """初始化基础数据"""
    
    result = await session.execute(select(User).where(User.username == "admin"))
    if result.scalar_one_or_none():
        print("基础数据已存在，跳过初始化")
        return
    
    dept = Dept(
        dept_name="总公司",
        parent_id=0,
        sort_order=1,
        leader="管理员",
        phone="010-12345678",
        email="admin@example.com",
        status=1
    )
    session.add(dept)
    await session.flush()
    
    posts = [
        Post(post_name="总经理", post_code="GM", sort_order=1, status=1),
        Post(post_name="技术总监", post_code="CTO", sort_order=2, status=1),
        Post(post_name="高级工程师", post_code="SE", sort_order=3, status=1),
    ]
    for post in posts:
        session.add(post)
    await session.flush()
    
    menus_data = [
        {"menu_name": "首页", "path": "/dashboard", "component": "Dashboard", "icon": "home", "parent_id": 0, "sort_order": 1, "menu_type": "C", "permission": "system:dashboard:list", "status": 1},
        {"menu_name": "系统管理", "path": "", "component": "", "icon": "settings", "parent_id": 0, "sort_order": 2, "menu_type": "M", "status": 1},
        {"menu_name": "用户管理", "path": "/system/user", "component": "system/UserList", "icon": "user", "parent_id": 2, "sort_order": 1, "menu_type": "C", "permission": "system:user:list", "status": 1},
        {"menu_name": "角色管理", "path": "/system/role", "component": "system/RoleList", "icon": "shield", "parent_id": 2, "sort_order": 2, "menu_type": "C", "permission": "system:role:list", "status": 1},
        {"menu_name": "菜单管理", "path": "/system/menu", "component": "system/MenuList", "icon": "folder-tree", "parent_id": 2, "sort_order": 3, "menu_type": "C", "permission": "system:menu:list", "status": 1},
        {"menu_name": "部门管理", "path": "/system/dept", "component": "system/DeptList", "icon": "building", "parent_id": 2, "sort_order": 4, "menu_type": "C", "permission": "system:dept:list", "status": 1},
        {"menu_name": "岗位管理", "path": "/system/post", "component": "system/PostList", "icon": "briefcase", "parent_id": 2, "sort_order": 5, "menu_type": "C", "permission": "system:post:list", "status": 1},
        {"menu_name": "公告管理", "path": "/system/notice", "component": "system/NoticeList", "icon": "volume-2", "parent_id": 2, "sort_order": 6, "menu_type": "C", "permission": "system:notice:list", "status": 1},
        {"menu_name": "消息通知", "path": "/system/message", "component": "system/MessageList", "icon": "bell", "parent_id": 2, "sort_order": 7, "menu_type": "C", "permission": "system:message:list", "status": 1},
        {"menu_name": "字典管理", "path": "/system/dict", "component": "system/DictManagement", "icon": "book", "parent_id": 2, "sort_order": 8, "menu_type": "C", "permission": "system:dict:list", "status": 1},
        {"menu_name": "系统监控", "path": "", "component": "", "icon": "monitor", "parent_id": 0, "sort_order": 3, "menu_type": "M", "status": 1},
        {"menu_name": "在线用户", "path": "/monitor/online", "component": "monitor/OnlineUser", "icon": "users", "parent_id": 11, "sort_order": 1, "menu_type": "C", "permission": "monitor:online:list", "status": 1},
        {"menu_name": "系统状态", "path": "/monitor/status", "component": "monitor/SystemStatus", "icon": "activity", "parent_id": 11, "sort_order": 2, "menu_type": "C", "permission": "monitor:status:list", "status": 1},
        {"menu_name": "定时任务", "path": "/monitor/task", "component": "monitor/TaskList", "icon": "clock", "parent_id": 11, "sort_order": 3, "menu_type": "C", "permission": "monitor:task:list", "status": 1},
        {"menu_name": "任务日志", "path": "/monitor/task-log", "component": "monitor/TaskLogList", "icon": "list", "parent_id": 11, "sort_order": 4, "menu_type": "C", "permission": "monitor:task-log:list", "status": 1},
        {"menu_name": "操作日志", "path": "/monitor/operlog", "component": "monitor/OperationLogList", "icon": "file-text", "parent_id": 11, "sort_order": 5, "menu_type": "C", "permission": "monitor:operlog:list", "status": 1},
        {"menu_name": "登录日志", "path": "/monitor/loginlog", "component": "monitor/LoginLogList", "icon": "log-in", "parent_id": 11, "sort_order": 6, "menu_type": "C", "permission": "monitor:loginlog:list", "status": 1},
    ]
    
    created_menus = []
    for menu_data in menus_data:
        menu = Menu(**menu_data)
        session.add(menu)
        created_menus.append(menu)
    await session.flush()
    
    result = await session.execute(select(Menu))
    all_menus = list(result.scalars().all())
    
    admin_role = Role(
        name="超级管理员",
        role_key="admin",
        sort_order=1,
        status=1
    )
    session.add(admin_role)
    await session.flush()

    guest_role = Role(
        name="访客",
        role_key="guest",
        sort_order=99,
        status=1
    )
    session.add(guest_role)
    await session.flush()
    
    for menu in all_menus:
        await session.execute(
            insert(role_menu_table).values(role_id=admin_role.id, menu_id=menu.id)
        )
    
    dashboard_result = await session.execute(select(Menu).where(Menu.path == "/dashboard"))
    dashboard_menu = dashboard_result.scalar_one_or_none()
    if dashboard_menu:
        await session.execute(
            insert(role_menu_table).values(role_id=guest_role.id, menu_id=dashboard_menu.id)
        )
    
    admin_user = User(
        username="admin",
        nickname="超级管理员",
        email="admin@example.com",
        phone="13800138000",
        hashed_password=get_password_hash("admin123"),
        avatar="",
        status=1,
        dept_id=dept.id
    )
    session.add(admin_user)
    await session.flush()
    
    await session.execute(
        insert(user_role_table).values(user_id=admin_user.id, role_id=admin_role.id)
    )
    
    await session.execute(
        insert(user_post_table).values(user_id=admin_user.id, post_id=posts[0].id)
    )
    
    dict_types_data = [
        {"dict_name": "用户性别", "dict_type": "sys_user_sex", "status": 1},
        {"dict_name": "系统状态", "dict_type": "sys_common_status", "status": 1},
        {"dict_name": "菜单状态", "dict_type": "sys_show_hide", "status": 1},
    ]
    
    dict_types = []
    for dict_type_data in dict_types_data:
        dict_type = DictType(**dict_type_data)
        session.add(dict_type)
        dict_types.append(dict_type)
    await session.flush()
    
    dict_datas_data = [
        {"dict_id": dict_types[0].id, "dict_label": "男", "dict_value": "0", "sort_order": 1, "status": 1},
        {"dict_id": dict_types[0].id, "dict_label": "女", "dict_value": "1", "sort_order": 2, "status": 1},
        {"dict_id": dict_types[0].id, "dict_label": "未知", "dict_value": "2", "sort_order": 3, "status": 1},
        {"dict_id": dict_types[1].id, "dict_label": "正常", "dict_value": "0", "sort_order": 1, "status": 1},
        {"dict_id": dict_types[1].id, "dict_label": "停用", "dict_value": "1", "sort_order": 2, "status": 1},
        {"dict_id": dict_types[2].id, "dict_label": "显示", "dict_value": "0", "sort_order": 1, "status": 1},
        {"dict_id": dict_types[2].id, "dict_label": "隐藏", "dict_value": "1", "sort_order": 2, "status": 1},
    ]
    
    for dict_data_data in dict_datas_data:
        dict_data = DictData(**dict_data_data)
        session.add(dict_data)
    
    config_data = [
        {"key": "sys.index.sitename", "value": "Admin System", "type": "string", "description": "系统显示名称"},
        {"key": "sys.index.logo", "value": "", "type": "string", "description": "系统Logo图片URL"},
        {"key": "sys.index.copyright", "value": "© 2024 Admin System", "type": "string", "description": "页面底部版权信息"},
        {"key": "sys.user.initPassword", "value": "123456", "type": "string", "description": "新增用户时的初始密码"},
        {"key": "sys.account.captchaEnabled", "value": "true", "type": "boolean", "description": "是否启用登录验证码"},
        {"key": "sys.account.rememberMe", "value": "true", "type": "boolean", "description": "登录页是否显示记住登录选项"},
        {"key": "sys.account.registerEnabled", "value": "false", "type": "boolean", "description": "是否允许用户注册"},
        {"key": "sys.expire.time", "value": "30", "type": "number", "description": "会话超时时间（分钟）"},
        {"key": "sys.password.minLength", "value": "6", "type": "number", "description": "密码最小长度"},
        {"key": "sys.operLog.enabled", "value": "true", "type": "boolean", "description": "是否启用操作日志"},
        {"key": "sys.loginLog.enabled", "value": "true", "type": "boolean", "description": "是否启用登录日志"},
    ]
    
    for config_item in config_data:
        config = SystemConfig(**config_item)
        session.add(config)
    
    notices_data = [
        {"title": "系统升级通知", "content": "系统将于本周日凌晨2点进行升级维护，届时服务将暂停约1小时。", "type": 1, "status": 1},
        {"title": "安全提醒", "content": "请定期修改密码以保证账号安全，密码长度建议不少于8位。", "type": 2, "status": 1},
        {"title": "新功能上线", "content": "仪表盘数据已对接真实数据，欢迎体验！", "type": 1, "status": 1},
    ]
    
    for notice_data in notices_data:
        notice = Notice(**notice_data)
        session.add(notice)
    
    print("=" * 50)
    print("基础数据初始化完成！")
    print("默认管理员账号: admin")
    print("默认管理员密码: admin123")
    print("=" * 50)
