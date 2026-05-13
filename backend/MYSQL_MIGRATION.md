# MySQL 数据库迁移指南

## 前置条件

1. 已安装 MySQL 5.7+ 或 MariaDB 10.2+
2. 已安装 Python 3.8+

## 迁移步骤

### 1. 安装新依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 创建 MySQL 数据库

使用以下命令创建数据库：

```sql
-- 登录 MySQL
mysql -u root -p

-- 执行初始化脚本
source d:/ciyu/TraeSOLO/admin-system/backend/init_mysql.sql
```

或者使用 MySQL 客户端工具（如 Navicat、phpMyAdmin）导入 `init_mysql.sql` 文件。

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，然后修改数据库连接信息：

```env
# 修改为你的 MySQL 配置
DATABASE_URL=mysql+aiomysql://root:your_password@localhost:3306/admin_system?charset=utf8mb4
```

### 4. 启动服务

```bash
# 后端
cd backend
uvicorn app.main:app --reload

# 前端
cd frontend
npm run dev
```

## 数据库连接说明

连接格式：
```
mysql+aiomysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4
```

常用参数：
- `charset=utf8mb4` - 使用 utf8mb4 字符集，支持 emoji
- `connect_timeout` - 连接超时时间（秒）
- `read_timeout` - 读取超时时间（秒）
- `write_timeout` - 写入超时时间（秒）

## 数据库表说明

| 表名 | 说明 |
|------|------|
| sys_user | 用户表 |
| sys_role | 角色表 |
| sys_menu | 菜单表 |
| sys_user_role | 用户角色关联表 |
| sys_role_menu | 角色菜单关联表 |
| sys_operation_log | 操作日志表 |
| sys_login_log | 登录日志表 |
| sys_task | 定时任务表 |
| sys_task_log | 任务执行日志表 |
| sys_dict | 字典表 |
| sys_dict_item | 字典项表 |
| sys_config | 系统配置表 |
| sys_password_history | 密码历史表 |
| sys_password_policy | 密码策略表 |

## 默认账号

- 用户名: `admin`
- 密码: `admin123` (生产环境请立即修改！)

## 常见问题

### 1. 连接失败

检查：
- MySQL 服务是否启动
- 用户名密码是否正确
- 防火墙是否允许 3306 端口

### 2. 字符编码问题

确保数据库和表使用 `utf8mb4` 字符集。

### 3. 权限问题

确保 MySQL 用户有以下权限：
- CREATE
- INSERT
- SELECT
- UPDATE
- DELETE
- ALTER
- INDEX
- REFERENCES

## 从 SQLite 迁移现有数据

如果需要从 SQLite 迁移数据，可以使用以下工具：
- `sqlite3` + `mysqldump`
- Python 脚本手动迁移
- 第三方迁移工具如 `sqlite2mysql`