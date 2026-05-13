-- PostgreSQL 初始化脚本
-- 注意：需要先手动创建数据库，再执行此脚本
-- 创建命令: psql -U postgres -c "CREATE DATABASE admin_system;"

-- 创建用户表
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    hashed_password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    nickname VARCHAR(50),
    status SMALLINT NOT NULL DEFAULT 1,
    is_superuser SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_user IS '用户表';
COMMENT ON COLUMN sys_user.id IS '主键';
COMMENT ON COLUMN sys_user.username IS '用户名';
COMMENT ON COLUMN sys_user.email IS '邮箱';
COMMENT ON COLUMN sys_user.phone IS '手机号';
COMMENT ON COLUMN sys_user.hashed_password IS '加密密码';
COMMENT ON COLUMN sys_user.avatar IS '头像';
COMMENT ON COLUMN sys_user.nickname IS '昵称';
COMMENT ON COLUMN sys_user.status IS '状态 0-禁用 1-启用';
COMMENT ON COLUMN sys_user.is_superuser IS '是否超级管理员';
COMMENT ON COLUMN sys_user.created_at IS '创建时间';
COMMENT ON COLUMN sys_user.updated_at IS '更新时间';

-- 创建角色表
CREATE TABLE IF NOT EXISTS sys_role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    role_key VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_role IS '角色表';
COMMENT ON COLUMN sys_role.id IS '主键';
COMMENT ON COLUMN sys_role.name IS '角色名称';
COMMENT ON COLUMN sys_role.role_key IS '角色标识';
COMMENT ON COLUMN sys_role.description IS '描述';
COMMENT ON COLUMN sys_role.sort_order IS '排序';
COMMENT ON COLUMN sys_role.status IS '状态';

-- 创建菜单表
CREATE TABLE IF NOT EXISTS sys_menu (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT DEFAULT 0,
    menu_name VARCHAR(50) NOT NULL,
    path VARCHAR(200),
    component VARCHAR(200),
    icon VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    menu_type VARCHAR(20) NOT NULL DEFAULT 'menu',
    permission VARCHAR(100),
    status SMALLINT NOT NULL DEFAULT 1,
    visible SMALLINT NOT NULL DEFAULT 1,
    is_frame SMALLINT NOT NULL DEFAULT 0,
    is_cache SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_menu IS '菜单表';
COMMENT ON COLUMN sys_menu.id IS '主键';
COMMENT ON COLUMN sys_menu.parent_id IS '父菜单ID';
COMMENT ON COLUMN sys_menu.menu_name IS '菜单名称';
COMMENT ON COLUMN sys_menu.path IS '路由路径';
COMMENT ON COLUMN sys_menu.component IS '组件路径';
COMMENT ON COLUMN sys_menu.icon IS '图标';
COMMENT ON COLUMN sys_menu.sort_order IS '排序';
COMMENT ON COLUMN sys_menu.menu_type IS '菜单类型';
COMMENT ON COLUMN sys_menu.permission IS '权限标识';
COMMENT ON COLUMN sys_menu.status IS '状态';
COMMENT ON COLUMN sys_menu.visible IS '是否可见';
COMMENT ON COLUMN sys_menu.is_frame IS '是否外链';
COMMENT ON COLUMN sys_menu.is_cache IS '是否缓存';

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE sys_user_role IS '用户角色关联表';

-- 创建角色菜单关联表
CREATE TABLE IF NOT EXISTS sys_role_menu (
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, menu_id)
);
COMMENT ON TABLE sys_role_menu IS '角色菜单关联表';

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS sys_operation_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(50),
    ip_address VARCHAR(50),
    method VARCHAR(10),
    url VARCHAR(255),
    query_params TEXT,
    body_params TEXT,
    response TEXT,
    status SMALLINT,
    error_message TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_operation_log IS '操作日志表';

-- 创建登录日志表
CREATE TABLE IF NOT EXISTS sys_login_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(50),
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    status SMALLINT NOT NULL,
    message VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_login_log IS '登录日志表';

-- 创建定时任务表
CREATE TABLE IF NOT EXISTS sys_task (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    task_group VARCHAR(50),
    function_name VARCHAR(100),
    function_args TEXT,
    cron_expression VARCHAR(100),
    status SMALLINT NOT NULL DEFAULT 1,
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_task IS '定时任务表';

-- 创建任务执行日志表
CREATE TABLE IF NOT EXISTS sys_task_log (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    task_name VARCHAR(100),
    task_group VARCHAR(50),
    status SMALLINT NOT NULL DEFAULT 0,
    result TEXT,
    error_message TEXT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);
COMMENT ON TABLE sys_task_log IS '任务执行日志表';

-- 创建字典类型表
CREATE TABLE IF NOT EXISTS sys_dict_type (
    id BIGSERIAL PRIMARY KEY,
    dict_name VARCHAR(50) NOT NULL,
    dict_type VARCHAR(50) NOT NULL UNIQUE,
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_dict_type IS '字典类型表';

-- 创建字典数据表
CREATE TABLE IF NOT EXISTS sys_dict_data (
    id BIGSERIAL PRIMARY KEY,
    dict_id BIGINT NOT NULL,
    dict_label VARCHAR(50) NOT NULL,
    dict_value VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    remark VARCHAR(255),
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_dict_data IS '字典数据表';

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS sys_config (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    value TEXT,
    description VARCHAR(255),
    type VARCHAR(20) DEFAULT 'string',
    is_public SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_config IS '系统配置表';

-- 创建密码历史表
CREATE TABLE IF NOT EXISTS sys_password_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_password_history IS '密码历史表';

-- 创建密码策略表
CREATE TABLE IF NOT EXISTS sys_password_policy (
    id BIGSERIAL PRIMARY KEY,
    min_length INTEGER NOT NULL DEFAULT 6,
    max_length INTEGER NOT NULL DEFAULT 20,
    require_uppercase SMALLINT NOT NULL DEFAULT 1,
    require_lowercase SMALLINT NOT NULL DEFAULT 1,
    require_digit SMALLINT NOT NULL DEFAULT 1,
    require_special SMALLINT NOT NULL DEFAULT 0,
    history_count INTEGER NOT NULL DEFAULT 0,
    expiration_days INTEGER NOT NULL DEFAULT 0,
    same_as_username SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_password_policy IS '密码策略表';

-- 创建部门表
CREATE TABLE IF NOT EXISTS sys_dept (
    id BIGSERIAL PRIMARY KEY,
    dept_name VARCHAR(50) NOT NULL,
    parent_id BIGINT DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    leader VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    status SMALLINT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_dept IS '部门表';

-- 创建岗位表
CREATE TABLE IF NOT EXISTS sys_post (
    id BIGSERIAL PRIMARY KEY,
    post_name VARCHAR(50) NOT NULL,
    post_code VARCHAR(50) NOT NULL,
    dept_id BIGINT,
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_post IS '岗位表';

-- 创建用户岗位关联表
CREATE TABLE IF NOT EXISTS sys_user_post (
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, post_id)
);
COMMENT ON TABLE sys_user_post IS '用户岗位关联表';

-- 创建通知表
CREATE TABLE IF NOT EXISTS sys_notice (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    type SMALLINT DEFAULT 1,
    status SMALLINT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_notice IS '通知表';

-- 创建站内消息表
CREATE TABLE IF NOT EXISTS sys_message (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT,
    to_user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'system',
    status SMALLINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sys_message IS '站内消息表';

-- 初始化密码策略
INSERT INTO sys_password_policy (min_length, max_length, require_uppercase, require_lowercase, require_digit, require_special, history_count, expiration_days, same_as_username)
VALUES (6, 20, 1, 1, 1, 0, 0, 0, 0);

-- 初始化管理员用户（密码为 admin123，请在生产环境中立即修改！）
INSERT INTO sys_user (username, email, phone, hashed_password, nickname, is_superuser, status)
VALUES ('admin', 'admin@example.com', '13800138000', '$2b$12$N9q87Q5u3XKxV9LJ9JQq9u9VJ9JQq9u9VJ9JQq9u9VJ9JQq9u9VJ', '超级管理员', 1, 1);

-- 初始化角色
INSERT INTO sys_role (name, role_key, description, sort_order, status)
VALUES 
    ('超级管理员', 'admin', '系统超级管理员，拥有所有权限', 1, 1),
    ('普通用户', 'user', '普通用户角色', 2, 1);

-- 给管理员用户分配角色
INSERT INTO sys_user_role (user_id, role_id)
SELECT 1, 1 FROM sys_user WHERE id = 1;

-- 初始化系统配置
INSERT INTO sys_config (key, value, description, type, is_public)
VALUES
    ('site_name', 'Admin System', '站点名称', 'string', 1),
    ('site_description', '后台管理系统', '站点描述', 'string', 1),
    ('copyright', '© 2024 Admin System', '版权信息', 'string', 1);

-- 初始化菜单数据
INSERT INTO sys_menu (menu_name, path, component, icon, parent_id, sort_order, menu_type, permission, status, visible) VALUES
('系统管理', '/system', '', 'Layout', 0, 1, 'M', '', 1, 1),
('用户管理', '/system/user', 'system/user/UserList', 'Users', 1, 1, 'C', 'system:user:list', 1, 1),
('角色管理', '/system/role', 'system/role/RoleList', 'UserCheck', 1, 2, 'C', 'system:role:list', 1, 1),
('菜单管理', '/system/menu', 'system/menu/MenuList', 'Menu', 1, 3, 'C', 'system:menu:list', 1, 1),
('部门管理', '/system/dept', 'system/dept/DeptList', 'Building', 1, 4, 'C', 'system:dept:list', 1, 1),
('岗位管理', '/system/post', 'system/post/PostList', 'Briefcase', 1, 5, 'C', 'system:post:list', 1, 1),
('系统监控', '/monitor', '', 'Activity', 0, 2, 'M', '', 1, 1),
('在线用户', '/monitor/online', 'monitor/OnlineList', 'Users', 7, 1, 'C', 'monitor:online:list', 1, 1),
('定时任务', '/monitor/task', 'monitor/TaskList', 'Clock', 7, 2, 'C', 'monitor:task:list', 1, 1),
('日志管理', '/monitor/log', '', 'FileText', 7, 3, 'M', '', 1, 1),
('操作日志', '/monitor/log/oper', 'monitor/log/OperLogList', 'FileText', 10, 1, 'C', 'monitor:log:oper', 1, 1),
('登录日志', '/monitor/log/login', 'monitor/log/LoginLogList', 'FileKey', 10, 2, 'C', 'monitor:log:login', 1, 1),
('系统设置', '/system/config', '', 'Settings', 0, 3, 'M', '', 1, 1),
('系统配置', '/system/config/index', 'system/SystemSettings', 'Settings', 13, 1, 'C', 'system:config:list', 1, 1),
('代码生成', '/system/generator', 'system/Generator', 'Code', 13, 2, 'C', 'system:generator:list', 1, 1),
('通知管理', '/system/notice', 'system/notice/NoticeList', 'Bell', 13, 3, 'C', 'system:notice:list', 1, 1),
('字典管理', '/system/dict', '', 'BookOpen', 13, 4, 'M', '', 1, 1),
('字典类型', '/system/dict/type', 'system/dict/DictTypeList', 'BookOpen', 17, 1, 'C', 'system:dict:type', 1, 1),
('字典数据', '/system/dict/data', 'system/dict/DictDataList', 'BookText', 17, 2, 'C', 'system:dict:data', 1, 1),
('个人中心', '/profile', 'profile/Profile', 'User', 0, 4, 'C', '', 1, 1),
('仪表盘', '/dashboard', 'dashboard/Dashboard', 'LayoutDashboard', 0, 0, 'C', 'dashboard', 1, 1);

-- 给管理员角色分配所有菜单权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu;

-- 初始化字典数据
INSERT INTO sys_dict_type (dict_name, dict_type, status) VALUES
('系统状态', 'sys_status', 1),
('菜单类型', 'menu_type', 1),
('数据范围', 'data_scope', 1);

INSERT INTO sys_dict_data (dict_id, dict_label, dict_value, sort_order, status) VALUES
((SELECT id FROM sys_dict_type WHERE dict_type = 'sys_status'), '启用', '1', 1, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'sys_status'), '禁用', '0', 2, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'menu_type'), '目录', 'M', 1, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'menu_type'), '菜单', 'C', 2, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'menu_type'), '按钮', 'F', 3, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'data_scope'), '全部数据', '1', 1, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'data_scope'), '本部门数据', '2', 2, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'data_scope'), '本部门及以下数据', '3', 3, 1),
((SELECT id FROM sys_dict_type WHERE dict_type = 'data_scope'), '仅本人数据', '4', 4, 1);

-- 初始化通知
INSERT INTO sys_notice (title, content, type, status) VALUES
('欢迎使用系统', '欢迎您使用后台管理系统！', 1, 1),
('系统更新通知', '系统已更新到最新版本', 1, 1);

-- 创建索引
CREATE INDEX idx_sys_user_username ON sys_user(username);
CREATE INDEX idx_sys_role_role_key ON sys_role(role_key);
CREATE INDEX idx_sys_menu_parent_id ON sys_menu(parent_id);
CREATE INDEX idx_sys_dict_data_dict_id ON sys_dict_data(dict_id);
CREATE INDEX idx_sys_message_to_user_id ON sys_message(to_user_id);
CREATE INDEX idx_password_history_user_id ON sys_password_history(user_id);

-- 初始化完成
SELECT 'PostgreSQL 数据库初始化完成！' AS message;