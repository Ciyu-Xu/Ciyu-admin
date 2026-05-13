# PostgreSQL 数据库迁移指南

## 前置条件

1. 已安装 PostgreSQL 12+（已安装 ✓）
2. 已安装 Python 3.8+

## 当前配置

- **主机**: localhost
- **端口**: 5432
- **数据库**: admin_system
- **用户名**: postgres
- **密码**: 123456

## 启动步骤

### 1. 安装 Python 依赖

```bash
cd d:/ciyu/TraeSOLO/admin-system/backend
pip install -r requirements.txt
```

### 2. 复制并修改配置文件

创建 `.env` 文件（如果没有）：

```env
DATABASE_URL=postgresql+asyncpg://postgres:123456@localhost:5432/admin_system
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
HOST=0.0.0.0
PORT=8000
```

### 3. 启动后端服务

```bash
cd backend
uvicorn app.main:app --reload
```

### 4. 启动前端服务

```bash
cd frontend
npm run dev
```

## 已修改的文件

### 后端模型（适配 PostgreSQL）
- `app/db/base.py` - 基础模型，使用 BigInteger 主键
- `app/models/user.py` - 用户、角色、菜单等模型
- `app/models/log.py` - 日志模型
- `app/models/task.py` - 定时任务模型
- `app/models/system_config.py` - 系统配置模型
- `app/models/password_policy.py` - 密码策略模型
- `app/models/message.py` - 消息模型
- `app/models/notice.py` - 通知模型
- `app/models/session.py` - 会话模型
- `app/models/__init__.py` - 模型导出

### 后端配置
- `app/core/config.py` - PostgreSQL 连接配置
- `app/api/v1/endpoints/auth.py` - 认证接口（字段名更新）
- `app/core/code_generator.py` - 代码生成器（支持 PostgreSQL 语法）

### 前端
- 无需修改

## 数据库连接说明

连接格式：
```
postgresql+asyncpg://用户名:密码@主机:端口/数据库名
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123` （请立即修改！）

## 常见问题

### 1. 连接失败

检查：
- PostgreSQL 服务是否启动
- 用户名密码是否正确
- 防火墙是否允许 5432 端口

### 2. 权限问题

```sql
GRANT ALL PRIVILEGES ON DATABASE admin_system TO postgres;
```

## PostgreSQL 优势

1. **功能强大** - 窗口函数、CTE、JSONB、全文搜索
2. **性能优秀** - 多种索引类型
3. **完全开源** - 无商业化风险
4. **标准SQL** - 严格遵循 ANSI SQL 标准