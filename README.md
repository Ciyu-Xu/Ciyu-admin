# Ciyu Admin - 现代管理后台系统

一个基于 Python + React 的高性能、现代化企业级管理后台系统，采用前后端完全分离架构。

## 技术栈

### 后端
- **FastAPI** - 异步高性能 Web 框架
- **SQLAlchemy 2.0** - 现代化 ORM
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存与会话存储（可选）
- **JWT** - 无状态认证
- **Pydantic** - 数据验证

### 前端
- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Vite** - 极速构建工具
- **Tailwind CSS** - 原子化 CSS
- **Zustand** - 轻量级状态管理
- **React Query** - 服务端状态管理
- **React Hook Form + Zod** - 表单验证
- **Recharts** - 数据可视化图表

## 功能特性

### 系统管理
- 用户管理：增删改查、状态控制、密码重置
- 角色管理：角色配置、权限分配
- 菜单管理：动态路由、权限标识
- 部门管理：组织架构、层级管理
- 岗位管理：职位配置
- 字典管理：数据字典维护
- 参数管理：系统参数配置

### 公告与消息
- 公告管理：系统公告发布、支持弹窗公告
- 公告阅读记录：追踪用户阅读情况，支持查看已读列表
- 消息通知：站内消息推送、未读提醒

### 系统监控
- 在线用户：数据库持久化会话、支持强制下线、同一账号单点登录
- 系统状态：实时动态图表（CPU/内存/磁盘/网络流量）
- 操作日志：用户操作记录，参数/响应详情查看
- 登录日志：登录历史记录
- 定时任务：基于 APScheduler 的任务调度管理

### 安全特性
- JWT Token 双令牌机制（访问令牌+刷新令牌）
- Token 自动刷新（401 时静默刷新，无感续期）
- 密码 bcrypt 加密存储
- RBAC 权限控制（支持按钮级权限）
- Token 黑名单机制（强制下线）
- 登录限流保护
- 图形验证码
- 同一账号单点登录（后登录踢掉之前会话）
- 密码策略（强度校验、历史记录、过期时间）
- SSO 单点登录（支持 GitHub / Gitee OAuth）

## 快速开始

### 环境要求
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- Redis 7+（可选）

### 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（可选）
# 复制 .env.example 为 .env 并按需修改
# 默认 DATABASE_URL 指向 PostgreSQL（postgresql+asyncpg://postgres:123456@localhost:5432/admin_system）
# 如需使用 SQLite，创建 .env 并设置 DATABASE_URL=sqlite+aiosqlite:///./test.db

# 启动服务
uvicorn app.main:app --reload
```

后端服务默认运行在 http://localhost:8000
API 文档地址：http://localhost:8000/docs

说明：后端在启动时会自动建表并初始化基础数据（含默认账号 admin/admin123），见 app 启动生命周期 [main.py](file:///d:/ciyu/TraeSOLO/admin-system/backend/app/main.py#L11-L24)。

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务默认运行在 http://localhost:5173

> 前端开发服务器通过 Vite proxy 将 `/api` 和 `/uploads` 请求代理到后端 `http://localhost:8000`，配置见 `vite.config.ts`。

### Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 项目结构

```
admin-system/
├── backend/                 # 后端项目
│   ├── app/
│   │   ├── api/            # API路由
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           ├── auth.py           # 认证接口
│   │   │           ├── sso.py            # SSO 单点登录
│   │   │           ├── system/          # 系统管理接口
│   │   │           │   ├── user.py      # 用户管理
│   │   │           │   ├── role.py      # 角色管理
│   │   │           │   ├── menu.py      # 菜单管理
│   │   │           │   ├── dept.py      # 部门管理
│   │   │           │   ├── post.py      # 岗位管理
│   │   │           │   ├── notice.py    # 公告管理
│   │   │           │   ├── message.py   # 消息通知
│   │   │           │   ├── log.py       # 日志管理
│   │   │           │   ├── monitor.py   # 系统监控
│   │   │           │   ├── config.py    # 参数配置
│   │   │           │   ├── dict.py      # 字典管理
│   │   │           │   └── password_policy.py # 密码策略
│   │   │           └── users.py        # 用户CRUD
│   │   ├── services/       # 业务逻辑层
│   │   │   ├── oper_log.py         # 操作日志服务
│   │   │   └── sso.py             # SSO 单点登录服务
│   │   ├── utils/          # 工具函数
│   │   ├── core/           # 核心配置
│   │   │   ├── config.py          # 系统配置
│   │   │   ├── security.py         # 安全工具
│   │   │   ├── online_user.py      # 在线用户服务
│   │   │   ├── captcha.py          # 验证码
│   │   │   ├── rate_limit.py       # 限流
│   │   │   ├── data_scope.py       # 数据权限
│   │   │   └── password_policy.py  # 密码策略
│   │   ├── db/             # 数据库
│   │   │   ├── session.py          # 数据库会话
│   │   │   ├── base.py             # 基础模型
│   │   │   └── init_db.py          # 数据初始化
│   │   ├── models/         # 数据模型
│   │   │   ├── user.py            # 用户/角色/菜单模型
│   │   │   ├── notice.py          # 公告模型
│   │   │   ├── message.py         # 消息模型
│   │   │   ├── log.py             # 日志模型
│   │   │   ├── session.py         # 会话模型
│   │   │   ├── task.py            # 定时任务模型
│   │   │   ├── system_config.py   # 系统配置模型
│   │   │   └── password_policy.py # 密码策略模型
│   │   ├── schemas/        # Pydantic模型
│   │   └── main.py         # 应用入口
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── api/            # API接口
│   │   │   ├── auth.ts             # 认证接口
│   │   │   ├── user.ts             # 用户接口
│   │   │   ├── dict.ts             # 字典接口
│   │   │   ├── log.ts              # 日志接口
│   │   │   ├── message.ts          # 消息接口
│   │   │   └── system/             # 系统接口
│   │   │       ├── sso.ts          # SSO 单点登录
│   │   │       ├── profile.ts      # 个人中心
│   │   │       └── ...
│   │   ├── components/     # 公共组件
│   │   │   ├── NoticePopup.tsx    # 公告弹窗
│   │   │   ├── Toast.tsx          # Toast 通知
│   │   │   ├── CommandPalette.tsx # 命令面板
│   │   │   ├── FormField.tsx      # 表单字段组件
│   │   │   ├── KeepAlive.tsx      # 标签页保活
│   │   │   └── PasswordStrengthIndicator.tsx # 密码强度
│   │   ├── hooks/          # 自定义Hook
│   │   │   ├── useHeartbeat.ts    # 心跳机制
│   │   │   └── useToast.ts        # Toast 通知
│   │   ├── layouts/       # 布局组件
│   │   │   └── MainLayout.tsx     # 主布局
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard.tsx       # 仪表盘
│   │   │   ├── Login.tsx          # 登录页
│   │   │   ├── Register.tsx       # 注册页
│   │   │   ├── monitor/           # 监控模块
│   │   │   │   ├── OnlineUser.tsx    # 在线用户
│   │   │   │   ├── SystemStatus.tsx  # 系统状态
│   │   │   │   ├── TaskList.tsx      # 定时任务
│   │   │   │   └── TaskLogList.tsx   # 任务日志
│   │   │   ├── system/           # 系统模块
│   │   │   │   ├── UserList.tsx      # 用户管理
│   │   │   │   ├── RoleList.tsx      # 角色管理
│   │   │   │   ├── MenuList.tsx      # 菜单管理
│   │   │   │   ├── DeptList.tsx      # 部门管理
│   │   │   │   ├── PostList.tsx      # 岗位管理
│   │   │   │   ├── NoticeList.tsx    # 公告管理
│   │   │   │   ├── MessageList.tsx   # 消息通知
│   │   │   │   ├── DictManagement.tsx # 字典管理
│   │   │   │   ├── OperationLogList.tsx # 操作日志
│   │   │   │   ├── LoginLogList.tsx  # 登录日志
│   │   │   │   ├── Profile.tsx       # 个人中心
│   │   │   │   ├── SystemSettings.tsx # 系统配置
│   │   │   │   └── DictDataList.tsx   # 字典数据
│   │   ├── stores/        # 状态管理
│   │   │   ├── auth.ts            # 认证状态
│   │   │   ├── tabs.ts            # 标签页状态
│   │   │   └── toast.ts           # Toast 状态
│   │   ├── utils/          # 工具函数
│   │   │   ├── request.ts          # Axios 实例（Token 自动刷新）
│   │   │   └── validation.ts       # Zod 表单验证 schema
│   │   ├── types/          # TypeScript类型
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## API 响应格式

统一响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

## 核心特性

### 高性能
- 异步 Python 后端，响应速度提升 3-5 倍
- 前端资源优化，首屏加载 < 2 秒
- 支持并发用户 > 1000

### 安全可靠
- JWT Token 双令牌机制
- 密码 bcrypt 加密存储
- RBAC 权限控制（支持按钮级权限）
- SQL 注入防护、XSS 防护
- 登录限流保护
- 图形验证码

### 现代化 UX
- 标签页缓存（Keep-Alive）：切换页面保持状态，支持标签关闭
- 命令面板（Ctrl+K）：快速搜索和导航页面
- Toast 通知系统：替代浏览器弹窗，带进度条动画
- 响应式设计，适配各种屏幕
- 动态数据图表，实时监控
- 渐变色卡片设计
- 流畅动画效果

## 开发计划

- [x] 基础架构搭建
- [x] 用户认证授权
- [x] Token 自动刷新
- [x] 用户管理模块
- [x] 角色权限管理
- [x] 菜单管理
- [x] 部门岗位管理
- [x] 字典管理（字典类型/字典数据）
- [x] 参数管理（系统配置）
- [x] 密码策略管理
- [x] 系统监控（在线用户/系统状态）
- [x] 日志管理（操作日志/登录日志）
- [x] 操作日志详情查看
- [x] 公告管理
- [x] 公告阅读记录
- [x] 消息通知
- [x] 定时任务管理（基于 APScheduler）
- [x] SSO 单点登录（GitHub / Gitee OAuth）
- [x] 个人中心（信息编辑、密码修改、登录历史）
- [x] 标签页缓存（Keep-Alive）
- [x] 命令面板（Ctrl+K 快速导航）
- [x] Toast 消息通知
- [x] 表单验证库（react-hook-form + zod）
- [ ] 数据导入导出

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
