# 电商物流配送可视化平台

一个基于 NestJS + React + TypeScript 构建的全栈物流配送可视化平台，实现从商家发货到用户收货的完整业务闭环，支持实时轨迹追踪、地图可视化、数据统计分析等核心功能。

## 项目简介

本项目是电商物流配送场景的完整解决方案，涵盖商家端订单管理、用户端实时追踪、后端自动化轨迹模拟三大模块。系统通过 WebSocket 实时推送包裹位置，结合高德地图 API 进行真实路径规划，使用定时任务模拟配送过程，并提供了丰富的数据可视化看板。

**技术栈**: 
- **后端**：NestJS、TypeScript、PostgreSQL + PostGIS、Prisma ORM、Socket.io、JWT 认证、高德地图 Web Service API、@nestjs/schedule 定时任务
- **前端**：React 18、TypeScript、Vite、Ant Design、高德地图 JS API v2.0、ECharts、Socket.io-client、Zustand 状态管理、React Router v6

**核心特性**: 
- ✅ 完整的商家端管理系统（订单管理、配送区域圈选、数据看板）
- ✅ 用户端实时物流追踪（地图动画、时间轴、WebSocket 断线重连）
- ✅ 智能路径规划（高德 API + 降级策略）
- ✅ 自动化轨迹模拟（定时任务每 5 秒推送位置）
- ✅ 地理空间计算（射线法判断配送范围）
- ✅ 数据统计分析（总览、区域、物流公司维度）

## 快速开始

### 环境要求

- **Node.js**: 18+ 
- **包管理器**: pnpm（推荐）或 npm
- **Docker & Docker Compose**: 用于运行 PostgreSQL 数据库
- **高德地图 API Key**: 需要申请 JS API Key（前端）和 Web Service API Key（后端，可选）

### 一键启动（推荐）

**启动后端服务**：
```bash
# 从项目根目录执行，自动处理端口占用、数据库初始化、依赖安装
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

**启动前端服务**（新开终端）：
```bash
# 从项目根目录执行
(lsof -ti:5173 | xargs kill -9 2>/dev/null || true) && \
sleep 1 && \
cd frontend && \
pnpm install && \
pnpm dev
```

### 环境变量配置

**后端** (`backend/.env`)：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_viz?schema=public"
JWT_SECRET="your_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"
AMAP_KEY="your_amap_web_service_key_optional"  # 可选，未配置时使用直线插值
```

**前端** (`frontend/.env`)：
```env
VITE_API_URL=http://localhost:3000
VITE_AMAP_KEY=your-amap-js-api-key           # 必需，高德地图 JS API Key
VITE_AMAP_SECURITY_JSCODE=your-security-code  # 必需，高德地图安全密钥
```

**注意**：前端使用高德地图 JS API v2.0，后端使用 Web Service API，两者需要分别申请不同的 Key。

### 验证服务

**快速演示**（推荐）：
```bash
cd backend
pnpm demo              # 完整自动化演示（约60秒，展示9大核心能力）
pnpm demo:interactive  # 交互式菜单演示（12个可选场景）
```

**测试账号**：
- 用户名：`merchant1`
- 密码：`123456`

**访问地址**：
- 前端应用：`http://localhost:5173`
- 后端 API：`http://localhost:3000`
- Prisma Studio：`pnpm prisma:studio` → `http://localhost:5555`

### 运行测试

项目包含完整的测试套件（66个单元测试 + 42个E2E测试）：

```bash
cd backend

# 单元测试
pnpm test:unit                    # 运行所有单元测试
pnpm test:unit --coverage        # 生成覆盖率报告

# E2E 测试（需要后端服务运行）
pnpm start:dev                   # 启动服务
pnpm test:e2e                    # 运行端到端测试
```

**测试覆盖**：
- ✅ **AmapService**：路径点采样、API 调用、错误处理（22个测试，100% 覆盖率）
- ✅ **地理空间计算**：Haversine 距离、射线法点在多边形判断（28个测试，100% 覆盖率）
- ✅ **OrdersService**：订单状态机、批量操作、路径规划（16个测试，80%+ 覆盖率）
- ✅ **E2E 测试**：完整业务流程验证（42个测试用例，11个业务场景）

## 核心功能

### 商家端（需登录）

**数据看板** (`/merchant/dashboard`)：
- 统计卡片：今日订单数、运输中订单数（WebSocket 实时更新）、已完成数、今日金额
- 配送时效分析：ECharts 地理柱状图（按配送区域统计）、物流公司对比柱状图
- 订单目的地热力图：基于历史订单分布，使用高德地图 HeatMap 插件
- 最新订单动态：实时显示订单状态变更，支持历史数据加载

**订单管理** (`/merchant/orders`)：
- 订单列表：分页、状态筛选、多字段排序、复选框多选
- 地图联动：左侧地图实时显示选中订单的终点、路径、当前位置
- 批量操作：批量发货、批量删除、导出 CSV
- 订单详情：双击行查看详情，支持生成二维码和追踪链接

**创建订单** (`/merchant/orders/new`)：
- 表单填写：物流公司选择、收货地址（支持搜索和地图选点）、商品信息
- 地图预览：实时显示起点（商家地址）和终点标记
- 自动计算：根据物流公司时效自动计算预计送达时间

**配送区域管理** (`/merchant/zones`)：
- 地图绘制：使用高德地图 PolygonEditor 绘制/编辑多边形区域
- 区域配置：设置区域名称、配送时效
- 订单筛选：查询指定区域内的所有订单（使用射线法算法）

### 用户端（无需登录）

**物流查询** (`/track`)：
- 订单号输入：格式验证（ORD 开头，20 位字符）
- 背景地图：默认显示北京天安门位置

**实时追踪** (`/track/:orderNo`)：
- 地图可视化：起点/终点标记、完整路径线、车辆图标（平滑动画）
- 实时位置更新：WebSocket 每 5 秒推送位置，车辆图标使用缓动函数平滑移动
- 路径分段显示：已走过路径（深蓝实线）+ 未走过路径（浅灰虚线）
- 订单信息卡片：订单号、状态、进度百分比、物流公司、预计送达时间
- 物流时间轴：倒序显示状态变更历史（已揽收、运输中、派送中、已签收）
- 断线重连：指数退避策略（最多 5 次），自动重新订阅

### 后端自动化

**轨迹模拟**：
- 定时任务：每 5 秒查询所有运输中订单，计算新位置并推送
- 路径规划：优先使用高德地图 API 获取真实路径（50+ 路径点），失败时降级到直线插值（20 个点）
- 限流机制：路径生成队列服务，半秒查一单，失败重试 3 次
- 自动完成：到达终点时自动更新状态为已送达，创建签收时间线

**WebSocket 通信**：
- Room 机制：每个订单对应一个 Room，实现订单级别隔离
- 事件推送：`location_update`（位置更新）、`status_update`（状态更新）、`delivery_complete`（配送完成）
- 首次订阅：立即推送当前位置和进度，无需等待下一个 tick

## 项目状态

**后端服务**：✅ **100% 完成**
- 认证授权（JWT + Passport）
- 订单管理（CRUD + 批量操作）
- 路径规划（高德 API + 降级策略 + 限流队列）
- 实时追踪（WebSocket + Room 机制）
- 配送区域管理（射线法地理计算）
- 定时任务自动化（Cron 轨迹模拟）
- 物流公司管理（6 家预置公司）
- 数据统计分析（总览/区域/物流公司）
- 完整测试套件（66 个单元测试 + 42 个 E2E 测试）

**前端应用**：✅ **100% 完成**
- 项目架构（Vite + React 18 + TypeScript）
- 商家端完整功能（登录、订单管理、创建订单、配送区域、数据看板）
- 用户端完整功能（物流查询、实时追踪、地图动画）
- 高德地图集成（JS API v2.0，支持所有特殊效果）
- 数据可视化（ECharts 图表 + 高德地图 HeatMap）
- WebSocket 实时通信（断线重连、路径分段显示）
- 响应式布局（支持移动端和桌面端）

**系统特性**：
- ✅ 完整业务闭环：商家创建订单 → 模拟发货 → 后端生成轨迹 → 定时任务推送位置 → 用户实时追踪 → 自动确认收货
- ✅ 智能路径规划：优先使用高德 API 获取真实路径（50+ 路径点），失败时自动降级到直线插值
- ✅ 限流与重试：路径生成队列服务，半秒查一单，失败重试 3 次
- ✅ 实时数据同步：WebSocket Room 机制实现订单级别隔离，首次订阅立即推送
- ✅ 地理空间计算：射线法判断配送范围，Haversine 公式计算距离

## 常见问题

**数据库连接失败**：
- 检查 Docker 容器：`docker ps`
- 查看日志：`docker logs delivery-viz-db`
- 确认 `.env` 中的 `DATABASE_URL` 配置正确
- 检查 5432 端口是否被占用

**bcrypt 加载失败**（M1/M2 Mac）：
- 一键启动命令已包含构建步骤
- 手动执行：`pnpm approve-builds bcrypt`

**Prisma 迁移失败**：
- 开发环境使用：`npx prisma db push`（非交互式）
- 重置数据库：`npx prisma migrate reset`

**WebSocket 连接失败**：
- 检查防火墙是否允许 3000 端口
- Nginx 配置需要特殊处理 WebSocket（`proxy_http_version 1.1`，`Upgrade` 和 `Connection` 头）
- 生产环境确保 `/socket.io/` 路径被正确代理

**高德地图 API 失败**：
- 未配置 `AMAP_KEY` 时自动使用直线插值，不影响核心功能
- 前端需要配置 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_JSCODE`
- 后端 `AMAP_KEY` 为可选，用于获取真实路径

**端口被占用**：
- 一键启动命令会自动清理端口
- 手动清理：`kill -9 $(lsof -ti:3000)` 或 `kill -9 $(lsof -ti:5173)`

## 技术支持

详细技术文档请参考 `docs/spec.md`，包含完整的系统架构设计、API 接口规范、前端页面布局、高德地图特殊效果实现要点等。

遇到问题请在项目仓库提交 Issue，欢迎贡献代码和改进建议。

## 许可证

MIT License
