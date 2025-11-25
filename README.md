# 电商物流配送可视化平台

一个基于 NestJS + TypeScript + PostgreSQL 构建的全栈物流配送可视化平台，实现商家发货到用户收货的完整业务闭环，支持实时轨迹追踪。

## 项目简介

本项目是电商物流配送场景的可视化平台，核心功能包括商家端订单管理、模拟发货、配送区域圈选，以及用户端的实时物流追踪。系统通过 WebSocket 实时推送包裹位置，结合高德地图 API 进行路径规划，并使用定时任务模拟真实的配送过程。

**技术栈**: 
- 后端：NestJS、TypeScript、PostgreSQL + PostGIS、Prisma、Socket.io、JWT 认证、高德地图 Web Service API
- 前端：React 18、TypeScript、Vite、Ant Design、高德地图 JS API、ECharts、Socket.io-client

**核心特性**: JWT 认证、订单管理、实时轨迹追踪、配送区域管理、自动化轨迹模拟、地理空间计算

## 快速开始

### 环境要求

确保系统已安装 Node.js 18+、Docker、Docker Compose，推荐使用 pnpm 作为包管理器。

### 一键启动后端服务

```bash
# 万全启动命令（自动处理端口占用+完整初始化+启动服务）
docker-compose up -d && \
(lsof -ti:3000 | xargs kill -9 2>/dev/null || true) && \
sleep 1 && \
cd backend && \
pnpm install && \
pnpm approve-builds bcrypt && \
pnpm prisma:generate && \
npx prisma db push && \
pnpm prisma:seed && \
pnpm start:dev
```

**命令说明**：此命令会依次执行启动数据库容器、清理 3000 端口占用、安装依赖、批准 bcrypt 构建、生成 Prisma Client、同步数据库、填充测试数据、启动开发服务器。

### 启动前端应用

#### 一键启动前端服务

```bash
# 万全启动命令（自动处理端口占用+完整初始化+启动服务）
(lsof -ti:5173 | xargs kill -9 2>/dev/null || true) && \
sleep 1 && \
cd frontend && \
pnpm install && \
([ -f .env ] || (echo "警告: .env 文件不存在，请确保已配置环境变量" && touch .env)) && \
pnpm dev
```

**命令说明**：此命令会依次执行清理 5173 端口占用、安装依赖、检查环境变量文件、启动开发服务器。

#### 手动启动步骤

```bash
# 进入前端目录
cd frontend

# 安装依赖（首次）
pnpm install

# 配置环境变量（复制示例文件并填写）
cp .env.example .env
# 编辑 .env 文件，填写高德地图 JS API Key

# 启动开发服务器
pnpm dev
```

前端将在 `http://localhost:5173` 启动。

**环境变量配置**（`frontend/.env`）：
```env
VITE_API_URL=http://localhost:3000
VITE_AMAP_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JSCODE=your-amap-security-jscode
```

**注意**：前端使用高德地图 JS API（与后端 Web Service API 不同），需要单独申请 JS API Key 和安全密钥。

### 分步启动（可选）

如果已完成初始化，日常开发只需：

```bash
# 清理端口并启动
kill -9 $(lsof -ti:3000) 2>/dev/null || true && cd backend && pnpm start:dev
```

首次启动需要配置环境变量文件 `backend/.env`：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_viz?schema=public"
JWT_SECRET="your_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"
AMAP_KEY="your_amap_web_api_key_optional"
```

### 验证服务

**快速测试（推荐）**：新开终端窗口执行展示性测试
```bash
cd backend
pnpm demo              # 完整自动化演示（6个场景）
pnpm demo:interactive  # 交互式菜单演示
```

**手动测试**：
- 登录接口：`curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username":"merchant1","password":"123456"}'`
- 追踪接口：`curl http://localhost:3000/tracking/订单号`（seed 输出的订单号）
- 可视化数据：`pnpm prisma:studio` 访问 `http://localhost:5555`

### 运行测试

项目提供完整的单元测试和 E2E 测试套件：

**单元测试**（66个测试用例）：
```bash
cd backend
pnpm test:unit           # 运行所有单元测试
pnpm test:unit --coverage  # 生成覆盖率报告
```

**单元测试覆盖**：
- ✅ **AmapService**：路径点采样算法、API 调用、错误处理、路径解析（22个测试）
- ✅ **地理空间计算**：Haversine 距离、射线法点在多边形判断、路径总距离（28个测试）
- ✅ **OrdersService**：订单时效计算、状态机转换、批量操作、路径规划集成（16个测试）

**E2E 测试**（需要后端服务运行）：
```bash
cd backend
pnpm test:e2e           # 运行端到端测试
```

**测试覆盖率**：
- OrdersService: 80%+
- AmapService: 100%
- 地理空间工具函数: 100%

## 功能说明

### 商家端功能

商家需要先登录获取 JWT Token，然后在所有请求的 Header 中携带 `Authorization: Bearer <token>`。

**订单管理**：支持创建订单、查询订单列表（可按状态筛选、多字段排序）、查看订单详情、更新和删除订单。创建订单时需要提供收货人信息、商品信息、起点和终点的经纬度及地址。

**模拟发货**：订单处于待发货状态时，可以调用发货接口。系统会自动调用高德地图 API 规划真实路径，如果 API 调用失败会降级使用直线插值生成路径。发货后订单状态变为运输中，定时任务开始每 5 秒推送位置更新。

**配送区域管理**：商家可以创建配送区域（GeoJSON Polygon 格式），设置配送时效。系统使用射线法判断订单目的地是否在配送区域内，支持查询区域内的所有订单。

### 用户端功能

**物流查询**：用户无需登录，直接通过订单号查询物流信息。接口返回订单状态、当前位置、预计送达时间、物流时间线等完整信息。

**实时追踪**：用户端通过 WebSocket 连接到服务器，发送 subscribe 事件订阅订单号。服务器立即推送当前位置，之后每 5 秒推送位置更新，包含经纬度和进度百分比。当订单到达终点时，推送 status_update 事件通知已签收。

**物流时间线**：系统自动记录订单的关键状态变更，包括订单创建、已揽收、运输中、派送中、已签收等，每条记录包含状态描述、详细说明、位置信息和时间戳。

### 自动化流程

系统通过定时任务实现轨迹自动推进。定时器每 5 秒查询所有运输中的订单，根据路径数据计算当前位置，更新订单的 currentLocation 字段和路径的 currentStep，然后通过 WebSocket 广播给订阅的客户端。当订单到达终点时，自动更新状态为已送达，并创建签收时间线记录。

## 测试账号

系统预置了测试账号和数据。商家端登录账号：用户名 `merchant1`，密码 `123456`。数据库中包含 5 个待发货订单和 1 个运输中订单，运输中订单的订单号在 seed 脚本执行后会显示在控制台，可用于测试实时追踪功能。

所有测试订单的位置都在北京市范围内，起点设置为天安门广场，终点分布在朝阳区、海淀区、西城区、丰台区、石景山区等不同地点，方便在地图上展示。

## 部署指南

### 开发环境

开发环境按照快速开始章节的步骤操作即可。建议使用 Docker Compose 管理数据库，使用 pnpm start:dev 启动热重载，使用 Prisma Studio 可视化管理数据。

### 生产环境

生产环境部署需要准备 Ubuntu 20.04+ 或类似 Linux 系统，至少 2GB 内存。首先安装 Node.js 18、pnpm、PostgreSQL 15 和 PostGIS 扩展。

创建数据库用户和数据库，并启用 PostGIS 扩展。将项目克隆到服务器，安装生产依赖 `pnpm install --prod`，配置生产环境的 .env 文件（注意修改数据库密码和 JWT 密钥）。

构建项目使用 `pnpm build`，运行数据库迁移和填充数据。使用 PM2 管理进程：`pm2 start dist/main.js --name delivery-viz-api`，设置开机自启 `pm2 startup && pm2 save`。

配置 Nginx 反向代理，监听 80 和 443 端口，将请求转发到本地 3000 端口。特别注意 WebSocket 需要特殊配置，location 路径设置 `proxy_http_version 1.1`，`proxy_set_header Upgrade $http_upgrade`，`proxy_set_header Connection "upgrade"`，超时时间设置为 86400 秒。

使用 Let's Encrypt 申请免费 SSL 证书，安装 certbot 后运行 `certbot --nginx -d api.domain.com` 自动配置 HTTPS。

配置防火墙，允许 HTTP、HTTPS 和 SSH 端口访问。设置数据库定时备份，创建备份脚本使用 pg_dump 导出数据并压缩，通过 crontab 设置每天凌晨 2 点执行。

### Docker 部署

项目提供了 Dockerfile 和 docker-compose.yml 配置。Dockerfile 使用多阶段构建，第一阶段安装依赖和构建，第二阶段创建精简的生产镜像。

docker-compose.yml 定义了 postgres 和 backend 两个服务，backend 依赖 postgres 的健康检查。启动前需要在 docker-compose.yml 中配置环境变量，然后执行 `docker-compose up -d --build`。

## 常见问题

**数据库连接失败**：检查 Docker 容器是否运行 `docker ps`，查看日志 `docker logs delivery-viz-db`，确认 .env 中的数据库配置正确，检查 5432 端口是否被占用。

**bcrypt 加载失败**：一键启动命令已包含 bcrypt 构建步骤。如仍失败，执行 `pnpm approve-builds bcrypt` 后重新安装。

**Prisma 迁移失败**：一键启动命令使用 `npx prisma db push`（非交互式）。如数据库状态不一致，执行 `npx prisma migrate reset` 重置。

**WebSocket 连接失败**：检查防火墙是否允许 3000 端口，Nginx 配置是否正确代理 WebSocket，CORS 配置是否正确。生产环境确保 WebSocket 路径 `/socket.io/` 被正确代理。

**端口被占用**：使用一键启动命令会自动清理端口，或手动执行 `kill -9 $(lsof -ti:3000)`。

**高德地图 API 失败**：如果没有配置 AMAP_KEY 或 API 调用失败，系统会自动使用直线插值生成路径，不影响核心功能。如需真实路径，前往高德开放平台申请 API Key。

## 项目状态

**后端开发**：✅ 100% 完成
- 认证系统（JWT + Passport）
- 订单管理（CRUD + 批量操作）
- 路径规划（高德 API + 降级策略）
- 实时追踪（WebSocket + Room 机制）
- 配送区域管理（地理计算）
- 定时任务自动化（Cron 轨迹模拟）
- 物流公司管理（6家预置）
- 数据统计分析（总览/区域/物流）
- 完整测试套件（66单元 + 42E2E）

**前端开发**：🚧 进行中（基础架构已完成）
- ✅ 项目初始化（Vite + React + TypeScript）
- ✅ 基础架构（路由、API 服务、状态管理）
- ✅ 商家端核心页面（登录、订单列表、创建订单）
- ✅ 用户端核心页面（查询、追踪）
- ⏳ 地图功能（高德地图集成）
- ⏳ 数据看板（ECharts 图表）
- ⏳ 配送区域管理（地图绘制）
- ⏳ 实时追踪（WebSocket + 动画）

系统已具备完整的业务闭环：商家创建订单 → 模拟发货 → 后端生成轨迹 → 定时任务推送位置 → 用户实时追踪 → 自动确认收货。

文档体系完整，包括本 README、开发者文档 docs/backend.md、原始需求 documents/电商物流配送可视化平台.md。

## 技术支持

遇到问题请查阅 docs/backend.md 中的详细技术文档，或在项目仓库提交 Issue。欢迎贡献代码和改进建议。

## 许可证

MIT License
