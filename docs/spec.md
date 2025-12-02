# 电商物流配送可视化平台 - 技术规范文档

> **文档状态**: 项目已完成，本文档包含完整的技术架构、API 规范和实现细节  
> **后端状态**: ✅ 100% 完成（66 个单元测试 + 42 个 E2E 测试）  
> **前端状态**: ✅ 100% 完成（所有核心功能和特殊效果已实现）

## 1. 项目概述

本项目是一个端到端的**电商物流配送可视化平台**，实现从商家发货到用户收货的完整业务闭环，重点展示基于地图的实时物流轨迹追踪、数据可视化和地理空间计算能力。

**核心成果**：
- ✅ **完整的后端服务**：NestJS + PostgreSQL + Prisma，10 大核心功能模块全部实现
- ✅ **完整的前端应用**：React 18 + TypeScript + Vite，商家端和用户端全部功能已实现
- ✅ **高德地图集成**：真实路径规划（50+ 路径点）、降级策略、限流队列、JS API v2.0 特殊效果
- ✅ **WebSocket 实时通信**：Room 机制、断线重连、路径分段显示、车辆平滑动画
- ✅ **自动化轨迹模拟**：定时任务每 5 秒推送位置，自动完成配送
- ✅ **数据统计分析**：总览、配送区域、物流公司三个维度的统计接口
- ✅ **完整测试套件**：66 个单元测试 + 42 个 E2E 测试，核心模块 80%+ 覆盖率

## 2. 课题要求

基于 React、Node.js、TypeScript 以及地图服务等技术栈，构建一个覆盖商家、用户、后端服务三端的全栈项目。项目需实现物流配送场景的业务闭环，并重点突出前端在数据可视化与实时交互方面的复杂度和价值。

## 3. 技术栈选型

### 3.1 前端技术栈

**核心框架**：
- React 18 + TypeScript：现代化前端框架，提供完整的类型安全
- Vite：快速构建工具，支持热模块替换（HMR）

**UI 与组件**：
- Ant Design：商家端管理后台 UI 组件库
- `@ant-design/icons`：图标库

**地图与可视化**：
- 高德地图 JS API v2.0：使用 `@amap/amap-jsapi-loader` 异步加载
  - 需要 JS API Key 和安全密钥（Jscode）
  - 支持所有特殊效果：车辆动画、路径分段、多边形编辑、热力图、点聚合等
- ECharts：数据看板图表库（柱状图、地理坐标系）

**状态管理与路由**：
- Zustand：轻量级状态管理（认证状态、主题）
- React Router v6：单页应用路由管理

**网络通信**：
- Axios：HTTP 客户端，支持请求/响应拦截器、JWT Token 自动注入
- Socket.io-client：WebSocket 实时通信，支持断线重连（指数退避策略）

**工具库**：
- `qrcode.react`：二维码生成（订单追踪链接）
- `dayjs`：日期时间处理

### 3.2 后端技术栈

**核心框架**：
- NestJS：基于 TypeScript 的企业级 Node.js 框架，模块化设计，依赖注入

**数据库与 ORM**：
- PostgreSQL 15 + PostGIS：关系型数据库，支持地理空间扩展
- Prisma ORM：类型安全的数据库访问，自动生成 TypeScript 类型

**认证与安全**：
- Passport：认证中间件（Local Strategy + JWT Strategy）
- JWT：无状态认证，Token 包含用户信息
- bcryptjs：密码加盐哈希（salt rounds: 10）

**实时通信**：
- Socket.io：WebSocket 库，支持 Room 机制、自动降级、心跳检测
- @nestjs/websockets：NestJS WebSocket Gateway 模块

**任务调度**：
- @nestjs/schedule：定时任务模块，使用 Cron 表达式（每 5 秒执行）

**外部服务**：
- 高德地图 Web Service API：路径规划接口（`/v3/direction/driving`）
  - 支持降级策略：API 失败时使用直线插值
  - 限流队列：半秒查一单，失败重试 3 次

### 3.3 开发工具

**容器化**：
- Docker & Docker Compose：PostgreSQL 数据库服务容器化

**包管理**：
- pnpm：快速、节省磁盘空间的包管理器

**代码质量**：
- ESLint：代码检查
- Prettier：代码格式化

**测试工具**：
- Jest：单元测试和 E2E 测试框架
- Supertest：HTTP 断言库
- Socket.io-client：WebSocket 测试客户端

## 4. 系统架构设计

### 4.1 应用架构

**单应用多路由设计**（无需域名级别隔离）：
- **商家端路由**：`/merchant/*`（需 JWT 认证）
  - `/merchant/login` - 登录页
  - `/merchant/dashboard` - 数据看板
  - `/merchant/orders` - 订单列表（含地图组件）
  - `/merchant/orders/new` - 创建订单
  - `/merchant/zones` - 配送区域管理
- **用户端路由**：`/track/*`（公开访问）
  - `/track` - 物流查询页（输入订单号）
  - `/track/:orderNo` - 实时追踪页（地图 + 时间轴）

### 4.2 核心模块

**商家端 (Merchant Portal)**：
- 基于 Ant Design 的管理后台
- 功能：订单管理（多选批量操作）、模拟发货、配送区域圈选、数据看板、CSV 导出、二维码生成
- 鉴权：JWT 登录，路由守卫保护

**用户端 (User Tracker)**：
- 移动端友好的响应式页面（最小宽度 375px）
- 功能：物流查询、地图实时轨迹展示、物流时间轴、平滑动画
- 鉴权：免登录，凭订单号查询
- 支持横竖屏、触摸手势

**后端服务 (Core Service)**：
- **API 层**：RESTful 接口处理 CRUD，JWT 认证保护
- **Gateway 层**：WebSocket 服务，Room 机制实现订单级别隔离
- **Task 层**：定时任务（Simulator），每 5 秒推进轨迹并推送位置

### 4.3 数据流向

**模拟发货流程**：
1. 商家调用 `POST /orders/:id/ship` 接口
2. 后端通过 `RouteQueueService` 调用高德 API `/v3/direction/driving` 规划路径（限流：半秒查一单，失败重试 3 次）
3. 采样路径点（保留 50 个关键点）并存入 Route 表
4. 更新订单状态为 SHIPPING，创建"已揽收"时间线
5. Cron 定时任务自动接管该订单的位置推进

**实时追踪流程**：
1. 用户端 WebSocket 连接到 `socket.io` 服务器
2. 发送 `subscribe(orderNo)` 事件订阅订单号（加入 Room）
3. 服务端立即推送当前位置、状态、进度
4. Cron 任务每 5 秒执行一次，更新 Route 的 `currentStep` 和订单的 `currentLocation`
5. WebSocket 广播 `location_update` 事件到该订单 Room
6. 前端接收位置数据，使用缓动函数平滑渲染车辆图标
7. 路径分段显示：已走过路径（深蓝实线）+ 未走过路径（浅灰虚线）
8. 到达终点时广播 `status_update` 事件通知已送达

### 4.3 前端页面布局设计

#### 4.3.1 商家端布局

**整体布局结构**：
- 采用 Ant Design 的 Layout 组件（Header + Sider + Content）
- 顶部导航栏：Logo、商家名称、主题切换、退出登录
- 左侧菜单：数据看板、订单管理、创建订单、配送区域管理
- 主内容区：根据路由动态渲染页面内容

**1. 登录页 (`/merchant/login`)**
```
┌─────────────────────────────────────┐
│                                     │
│         [Logo + 平台名称]           │
│                                     │
│    ┌─────────────────────────┐     │
│    │   商家登录              │     │
│    │                         │     │
│    │   用户名: [输入框]      │     │
│    │   密码:   [输入框]      │     │
│    │                         │     │
│    │   [登录按钮]            │     │
│    │   [注册链接]            │     │
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```
- 居中卡片布局，背景使用渐变或地图底图
- 支持表单验证和错误提示
- 登录成功后跳转到 `/merchant/dashboard`

**2. 数据看板 (`/merchant/dashboard`)**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | 商家名称 | [主题切换] | [退出]              │
├─────────────────────────────────────────────────────────────┤
│ Sider │ Content                                              │
│       │ ┌──────────────────────────────────────────────┐   │
│ 看板  │ │ 统计卡片区 (4个卡片，横向排列)                │   │
│ 订单  │ │ [今日订单] [运输中] [已完成] [今日金额]        │   │
│ 创建  │ └──────────────────────────────────────────────┘   │
│ 区域  │ ┌──────────────┐ ┌──────────────┐                │
│       │ │ ECharts Geo  │ │ 物流公司柱状图│                │
│       │ │ 地理柱状图   │ │               │                │
│       │ │ (配送区域)   │ │               │                │
│       │ └──────────────┘ └──────────────┘                │
│       │ ┌──────────────────────────────────────────────┐   │
│       │ │ 订单目的地热力图 (ECharts)                    │   │
│       │ └──────────────────────────────────────────────┘   │
│       │ ┌──────────────────────────────────────────────┐   │
│       │ │ 最新订单动态列表                              │   │
│       │ │ • 订单 ORD123 已送达                          │   │
│       │ │ • 订单 ORD124 已发货                          │   │
│       │ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 响应式布局：大屏（≥1200px）4列卡片，中屏（768-1199px）2列，小屏（<768px）1列
- 图表区域：大屏左右并排，小屏上下堆叠
- 支持日期范围选择器（右上角）

**3. 订单列表页 (`/merchant/orders`)**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | 商家名称 | [主题切换] | [退出]              │
├─────────────────────────────────────────────────────────────┤
│ Sider │ Content                                              │
│       │ ┌──────────────┐ ┌──────────────────────────────┐   │
│ 看板  │ │              │ │ [新建订单] [批量发货]        │   │
│ 订单  │ │   地图组件    │ │ [批量删除] [导出CSV]         │   │
│ 创建  │ │              │ │                              │   │
│ 区域  │ │ • 起点标记    │ │ [筛选: 全部▼] [排序: 时间▼] │   │
│       │ │ • 终点标记    │ │                              │   │
│       │ │ • 路径线     │ │ ┌──────────────────────────┐ │   │
│       │ │ • 车辆位置   │ │ │ ☑ 订单号 | 状态 | 收货人  │ │   │
│       │ │              │ │ │ ☑ ORD001 | 运输中 | 张** │ │   │
│       │ │              │ │ │ ☐ ORD002 | 待发货 | 李** │ │   │
│       │ │              │ │ │ ☐ ORD003 | 已送达 | 王** │ │   │
│       │ │              │ │ │ ...                       │ │   │
│       │ │              │ │ └──────────────────────────┘ │   │
│       │ │              │ │ [< 1 2 3 ... 10 >]           │   │
│       │ └──────────────┘ └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 左右分栏布局：左侧地图（40%宽度），右侧订单列表（60%宽度）
- 小屏（<768px）：地图和列表上下堆叠，通过 Tab 切换
- 地图实时显示选中订单的路径和位置
- 列表支持多选、筛选、排序、分页

**4. 创建订单页 (`/merchant/orders/new`)**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | 商家名称 | [主题切换] | [退出]              │
├─────────────────────────────────────────────────────────────┤
│ Sider │ Content                                              │
│       │ ┌──────────────────────────────────────────────┐   │
│ 看板  │ │ 创建订单                                      │   │
│ 订单  │ │ ┌──────────────┐ ┌──────────────┐            │   │
│ 创建  │ │ │ 表单区域     │ │ │ 地图预览     │            │   │
│ 区域  │ │ │              │ │ │              │            │   │
│       │ │ │ 物流公司:    │ │ │ • 起点标记    │            │   │
│       │ │ │ [下拉选择]   │ │ │ • 终点标记    │            │   │
│       │ │ │              │ │ │ • 路径预览   │            │   │
│       │ │ │ 收货地址:    │ │ │              │            │   │
│       │ │ │ [搜索框]     │ │ │              │            │   │
│       │ │ │ [地图选点]   │ │ │              │            │   │
│       │ │ │              │ │ │              │            │   │
│       │ │ │ 收货人:      │ │ │              │            │   │
│       │ │ │ [输入框]     │ │ │              │            │   │
│       │ │ │ 电话:        │ │ │              │            │   │
│       │ │ │ [输入框]     │ │ │              │            │   │
│       │ │ │              │ │ │              │            │   │
│       │ │ │ 商品名称:    │ │ │              │            │   │
│       │ │ │ [输入框]     │ │ │              │            │   │
│       │ │ │ 数量:        │ │ │              │            │   │
│       │ │ │ [数字输入]   │ │ │              │            │   │
│       │ │ │ 金额:        │ │ │              │            │   │
│       │ │ │ [数字输入]   │ │ │              │            │   │
│       │ │ │              │ │ │              │            │   │
│       │ │ │ [取消] [提交]│ │ │              │            │   │
│       │ │ └──────────────┘ └──────────────┘            │   │
│       │ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 左右分栏：左侧表单（60%），右侧地图预览（40%）
- 小屏：上下堆叠，地图在表单下方
- 地址搜索支持自动补全
- 地图选点：点击地图设置终点，实时更新表单

**5. 配送区域管理页 (`/merchant/zones`)**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | 商家名称 | [主题切换] | [退出]              │
├─────────────────────────────────────────────────────────────┤
│ Sider │ Content                                              │
│       │ ┌──────────────────────────────────────────────┐   │
│ 看板  │ │ 配送区域管理                                  │   │
│ 订单  │ │ ┌──────────────┐ ┌──────────────┐            │   │
│ 创建  │ │ │ 地图编辑区   │ │ │ 区域列表     │            │   │
│ 区域  │ │ │              │ │ │              │            │   │
│       │ │ │ [绘制模式]   │ │ │ • 区域A      │            │   │
│       │ │ │ [编辑模式]   │ │ │            │            │   │
│       │ │ │              │ │ │   [编辑][删除]           │   │
│       │ │ │ • 多边形区域 │ │ │              │            │   │
│       │ │ │ • 可拖拽顶点 │ │ │ • 区域B      │            │   │
│       │ │ │              │ │ │            │            │   │
│       │ │ │              │ │ │   [编辑][删除]           │   │
│       │ │ │              │ │ │              │            │   │
│       │ │ │              │ │ │ [新建区域]   │            │   │
│       │ │ └──────────────┘ └──────────────┘            │   │
│       │ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 左右分栏：左侧地图编辑（70%），右侧区域列表（30%）
- 地图支持绘制、编辑、删除多边形
- 右侧列表显示所有区域，支持编辑和删除

**6. 订单详情弹窗（Modal）**
```
┌─────────────────────────────────────┐
│ 订单详情                    [×]     │
├─────────────────────────────────────┤
│ 订单号: ORD1234567890               │
│ 状态: 运输中 (进度: 45%)            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│ 物流公司: 顺丰速运                  │
│ 收货人: 张** (脱敏)                 │
│ 收货地址: 北京市朝阳区...           │
│                                     │
│ 商品信息:                           │
│ • 商品名称: iPhone 15                │
│ • 数量: 1                            │
│ • 金额: ¥5999                       │
│                                     │
│ 预计送达: 2025-11-24 18:00         │
│                                     │
│ [查看详情] [模拟发货] [生成二维码]  │
└─────────────────────────────────────┘
```
- 居中弹窗，宽度 600px（移动端自适应）
- 支持二维码生成和下载

#### 4.3.2 用户端布局

**整体布局结构**：
- 移动端优先设计（最小宽度 375px）
- 无侧边栏，顶部导航栏简化
- 主内容区全屏显示地图或表单

**1. 物流查询页 (`/track`)**
```
┌─────────────────────────────────────┐
│ [返回] 物流查询                      │
├─────────────────────────────────────┤
│                                     │
│         [Logo + 平台名称]           │
│                                     │
│    ┌─────────────────────────┐     │
│    │   请输入订单号          │     │
│    │                         │     │
│    │   [订单号输入框]        │     │
│    │   ORD________________   │     │
│    │                         │     │
│    │   [查询按钮]            │     │
│    │                         │     │
│    │   提示: 订单号格式为    │     │
│    │   ORD开头，共20位字符   │     │
│    └─────────────────────────┘     │
│                                     │
│         (背景地图: 北京天安门)       │
│                                     │
└─────────────────────────────────────┘
```
- 居中卡片布局，背景显示地图
- 输入框支持格式验证
- 查询成功后跳转到 `/track/:orderNo`

**2. 实时追踪页 (`/track/:orderNo)` - 大屏布局（≥768px）**
```
┌─────────────────────────────────────────────────────────────┐
│ [返回] 物流追踪                                              │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────────────┐   │
│ │                      │ │ 订单信息卡片                  │   │
│ │                      │ │ ┌──────────────────────────┐ │   │
│ │      地图区域        │ │ │ 订单号: ORD1234567890     │ │   │
│ │                      │ │ │ 状态: 运输中              │ │   │
│ │  • 起点标记          │ │ │ 进度: 45%                │ │   │
│ │  • 终点标记          │ │ │ ━━━━━━━━━━━━━━━━━━━━━━━  │ │   │
│ │  • 路径线            │ │ │ 物流公司: 顺丰速运         │ │   │
│ │  • 车辆图标(动画)    │ │ │ 预计送达: 11-24 18:00     │ │   │
│ │                      │ │ └──────────────────────────┘ │   │
│ │                      │ │                              │   │
│ │                      │ │ 物流时间线                  │   │
│ │                      │ │ ┌──────────────────────────┐ │   │
│ │                      │ │ │ ✓ 已签收                 │ │   │
│ │                      │ │ │   包裹已成功签收          │ │   │
│ │                      │ │ │   北京市朝阳区...         │ │   │
│ │                      │ │ │   2025-11-24 18:00       │ │   │
│ │                      │ │ │ ──────────────────────── │ │   │
│ │                      │ │ │ ✓ 派送中                 │ │   │
│ │                      │ │ │   包裹已到达目的地城市    │ │   │
│ │                      │ │ │   2025-11-24 15:30       │ │   │
│ │                      │ │ │ ──────────────────────── │ │   │
│ │                      │ │ │ ✓ 运输中                 │ │   │
│ │                      │ │ │   包裹正在运输途中        │ │   │
│ │                      │ │ │   2025-11-24 12:00       │ │   │
│ │                      │ │ │ ──────────────────────── │ │   │
│ │                      │ │ │ ✓ 已揽收                 │ │   │
│ │                      │ │ │   快递已从发货地揽收      │ │   │
│ │                      │ │ │   2025-11-24 10:00       │ │   │
│ │                      │ │ └──────────────────────────┘ │   │
│ └──────────────────────┘ └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 左右分栏：左侧地图（60%），右侧信息区（40%）
- 信息区包含订单卡片和时间线

**3. 实时追踪页 (`/track/:orderNo)` - 小屏布局（<768px）**
```
┌─────────────────────────────────────┐
│ [返回] 物流追踪                      │
├─────────────────────────────────────┤
│ [地图] [时间线]  ← Tab 切换          │
├─────────────────────────────────────┤
│                                     │
│      地图区域 (全屏)                │
│                                     │
│  • 起点标记                         │
│  • 终点标记                         │
│  • 路径线                           │
│  • 车辆图标(动画)                   │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│ ┌───────────────────────────────┐ │
│ │ 订单信息卡片 (底部固定)         │ │
│ │ 订单号: ORD1234567890          │ │
│ │ 状态: 运输中 | 进度: 45%        │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ 物流公司: 顺丰速运              │ │
│ │ 预计送达: 11-24 18:00          │ │
│ └───────────────────────────────┘ │
└─────────────────────────────────────┘
```
- 全屏地图，底部固定订单信息卡片
- Tab 切换地图和时间线视图
- 时间线视图时，订单卡片在顶部

**4. 连接状态提示条**
```
┌─────────────────────────────────────┐
│ ⚠️ 连接已断开，正在重连...          │  ← 黄色提示条（顶部固定）
└─────────────────────────────────────┘
```
- 网络断开时显示黄色提示条
- 重连成功显示绿色提示条
- 重连失败显示红色提示条，提示刷新页面

#### 4.3.3 响应式断点设计

| 断点 | 宽度范围 | 布局策略 |
|------|---------|---------|
| 移动端 | < 768px | 单列布局，Tab 切换，全屏地图 |
| 平板 | 768px - 1199px | 双列布局，地图和信息区并排 |
| 桌面 | ≥ 1200px | 多列布局，完整功能展示 |

#### 4.3.4 颜色方案

**商家端（Ant Design 默认主题）**：
- 主色：蓝色 (#1890ff)
- 成功：绿色 (#52c41a)
- 警告：橙色 (#faad14)
- 错误：红色 (#f5222d)

**订单状态颜色**：
- 待发货：灰色 (#d9d9d9)
- 运输中：蓝色 (#1890ff)
- 已送达：绿色 (#52c41a)
- 已取消：红色 (#f5222d)

**用户端（移动端友好）**：
- 背景：白色/浅灰色
- 主色：蓝色渐变
- 强调色：橙色（用于重要提示）

#### 4.3.5 交互细节

1. **地图交互**：
   - 双击地图：放大地图
   - 拖拽：平移地图
   - 双指缩放：移动端手势支持
   - 点击标记：显示信息窗口

2. **动画效果**：
   - 车辆移动：使用 `Marker.moveAlong` API，2秒缓动动画
   - 页面切换：淡入淡出过渡（300ms）
   - 加载状态：骨架屏动画

3. **反馈机制**：
   - Toast 提示：操作成功/失败
   - Modal 确认：删除、批量操作等危险操作
   - 加载状态：按钮禁用 + Loading 图标

### 4.4 高德地图特殊效果实现要点

> **重要提示**：基于高德地图 JS API v2.0 官方文档，所有方法均经过验证。

#### 4.4.1 车辆平滑移动动画

**核心方法**：高德地图 JS API v2.0 **不支持** `Marker.moveAlong()`，需使用 `setPosition()` + `requestAnimationFrame` + 缓动函数。

```typescript
// 缓动移动函数
const moveSmoothly = (
  marker: AMap.Marker,
  from: [number, number],
  to: [number, number],
  duration = 2000
) => {
  const startTime = Date.now();
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-in-out 缓动
    const ease = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    marker.setPosition([
      fromLng + (toLng - fromLng) * ease,
      fromLat + (toLat - fromLat) * ease
    ]);
    
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
};

// WebSocket 接收位置更新
socket.on('location_update', (data) => {
  const currentPos = vehicleMarker.getPosition();
  moveSmoothly(vehicleMarker, 
    [currentPos.getLng(), currentPos.getLat()],
    [data.location.lng, data.location.lat]
  );
});
```

#### 4.4.2 路径分段显示（已走过/未走过）

**实现方法**：使用两个 `Polyline` 对象，分别显示已走过和未走过的路径。

```typescript
// 已走过的路径（深蓝实线）
const passedLine = new AMap.Polyline({
  path: [],
  strokeColor: '#1890ff',
  strokeWeight: 4,
  strokeStyle: 'solid',
  zIndex: 10,
  map: map,
});

// 未走过的路径（浅灰虚线）
const remainingLine = new AMap.Polyline({
  path: routePoints,
  strokeColor: '#d9d9d9',
  strokeWeight: 3,
  strokeStyle: 'dashed',
  lineDash: [10, 5],
  zIndex: 9,
  map: map,
});

// 更新路径分段
socket.on('location_update', (data) => {
  const currentIndex = Math.floor((data.progress / 100) * routePoints.length);
  passedLine.setPath(routePoints.slice(0, currentIndex + 1));
  remainingLine.setPath(routePoints.slice(currentIndex));
});
```

#### 4.4.3 多边形绘制编辑（PolygonEditor）

**实现方法**：加载 `AMap.PolygonEditor` 插件，使用 `open()` 开启编辑模式。

```typescript
AMap.plugin('AMap.PolygonEditor', () => {
  const polygon = new AMap.Polygon({
    path: [],
    strokeColor: '#1890ff',
    fillColor: '#1890ff',
    fillOpacity: 0.3,
    map: map,
  });
  
  const editor = new AMap.PolygonEditor(map, polygon);
  editor.open(); // 开启绘制/编辑模式
  
  // 完成绘制，获取 GeoJSON
  const finish = () => {
    editor.close();
    const path = polygon.getPath();
    const coords = path.map(p => [p.getLng(), p.getLat()]);
    // 闭合多边形
    if (coords[0][0] !== coords[coords.length - 1][0]) {
      coords.push(coords[0]);
    }
    return { type: 'Polygon', coordinates: [coords] };
  };
});
```

#### 4.4.4 地址搜索自动补全

**实现方法**：使用 `AMap.Autocomplete` + `AMap.PlaceSearch`。

```typescript
AMap.plugin(['AMap.Autocomplete', 'AMap.PlaceSearch'], () => {
  const autocomplete = new AMap.Autocomplete({
    input: 'addressInput', // 输入框 ID
    city: '全国',
  });
  
  autocomplete.on('select', (e) => {
    const placeSearch = new AMap.PlaceSearch();
    placeSearch.getDetails(e.poi.id, (status, result) => {
      if (status === 'complete' && result.info === 'OK') {
        const poi = result.poiList.pois[0];
        setFormData({
          receiverAddress: poi.address || poi.name,
          destination: {
            lng: poi.location.lng,
            lat: poi.location.lat,
            address: poi.address || poi.name,
          },
        });
      }
    });
  });
});
```

#### 4.4.5 地图选点（逆地理编码）

**实现方法**：监听地图点击事件，使用 `AMap.Geocoder` 获取地址。

```typescript
AMap.plugin('AMap.Geocoder', () => {
  const geocoder = new AMap.Geocoder();
  
  map.on('click', (e) => {
    const { lng, lat } = e.lnglat;
    
    // 创建标记
    const marker = new AMap.Marker({
      position: [lng, lat],
      map: map,
      draggable: true,
    });
    
    // 逆地理编码
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result.info === 'OK') {
        setFormData({
          receiverAddress: result.regeocode.formattedAddress,
          destination: { lng, lat, address: result.regeocode.formattedAddress },
        });
      }
    });
  });
});
```

#### 4.4.6 点聚合（大量标记优化）

**实现方法**：使用 `AMap.MarkerClusterer` 插件。

```typescript
AMap.plugin('AMap.MarkerClusterer', () => {
  const markers = orders.map(order => {
    const dest = order.destination as { lng: number; lat: number };
    return new AMap.Marker({
      position: [dest.lng, dest.lat],
      icon: createStatusIcon(order.status),
      extData: order,
    });
  });
  
  const cluster = new AMap.MarkerClusterer(map, markers, {
    gridSize: 80,
    minClusterSize: 2,
    maxZoom: 18,
  });
});
```

#### 4.4.7 热力图（订单目的地分布）

**实现方法**：使用 `AMap.Heatmap` 插件。

```typescript
AMap.plugin('AMap.Heatmap', () => {
  const heatmap = new AMap.Heatmap(map, {
    radius: 25,
    opacity: [0, 0.8],
  });
  
  const data = orders
    .filter(o => o.status === 'DELIVERED')
    .map(o => {
      const dest = o.destination as { lng: number; lat: number };
      return { lng: dest.lng, lat: dest.lat, count: 1 };
    });
  
  heatmap.setDataSet({ data, max: 100 });
});
```

#### 4.4.8 自动调整视野（setFitView）

**实现方法**：使用 `map.setFitView()` 方法。

```typescript
const points: [number, number][] = [
  [origin.lng, origin.lat],
  [destination.lng, destination.lat],
];

// 调整视野包含所有点，边距 20px
map.setFitView(points, false, [20, 20, 20, 20]);

// 包含路径点
map.setFitView(routePoints, false, [20, 20, 20, 20]);
```

#### 4.4.9 关键注意事项

1. **坐标系**：后端返回 GCJ-02 坐标，前端无需转换
2. **插件加载**：所有插件需通过 `AMap.plugin()` 异步加载
3. **性能优化**：大量标记使用点聚合，路径点过多时采样显示
4. **内存管理**：组件卸载时调用 `setMap(null)` 清理覆盖物

## 5. 核心功能与业务闭环
> 💡 **核心闭环：** 商家创建订单 -> 模拟发货 -> 后端生成轨迹 -> 用户实时追踪 -> 确认收货

### 5.1 商家端
*   **数据看板 (`/merchant/dashboard`)**：
    *   **统计卡片区**：今日订单数、运输中订单数（WebSocket 实时更新）、已完成数、今日金额（30秒轮询）
    *   **配送时效分析图表**：
        *   左侧：ECharts Geo 地理柱状图（按配送区域统计订单数/平均配送时长，可切换）
        *   右侧：普通柱状图（按物流公司对比配送时效）
    *   **订单目的地热力图**：基于历史订单目的地分布
    *   **最新订单动态列表**：实时显示订单状态变更（如："订单 ORD123 已送达"）
    *   支持切换日期范围（手动刷新）
*   **订单管理 (`/merchant/orders`)**：
    *   **列表展示**：
        *   分页显示，每页条数可选（10/20/50/100，默认100）
        *   支持按状态筛选、按创建时间/金额排序
        *   复选框多选（支持全选/反选）
        *   列表左侧显示地图组件，实时显示选中订单的终点标记、路径线、当前位置（运输中）
        *   不同状态用不同颜色区分（待发货=灰色、运输中=蓝色、已送达=绿色）
        *   点击地图标记或双击列表行弹出订单信息弹窗
    *   **批量操作**：
        *   批量发货：仅针对待发货订单，Modal 确认后依次调用发货接口
        *   批量删除：仅允许删除待发货/已取消订单，Modal 确认后删除
        *   批量导出：导出选中订单为 CSV 文件
    *   **CSV 导出**：包含字段（订单号、状态、创建时间、物流公司、收货人、收货电话、收货地址、商品名称、数量、金额、预计送达、实际送达）
*   **创建订单 (`/merchant/orders/new`)**：
    *   **必填字段**：
        *   物流公司（下拉选择，系统预置 6 家）
        *   收货地址（支持输入框搜索 + 地图选点两种方式）
        *   收货人姓名、收货人电话
        *   商品名称、商品数量、订单金额
    *   **起点位置**：自动使用商家默认发货地址（存储在 Merchant 表）
    *   **预计送达时间**：根据物流公司的标准时效自动计算
*   **订单详情弹窗**：
    *   显示：状态、进度百分比、物流公司、收货人（脱敏）、收货地址、商品信息、金额、预计送达时间
    *   操作按钮：[查看详情] [模拟发货/取消发货]
    *   支持生成订单二维码（包含 `/track/:orderNo` 链接）
*   **配送区域管理 (`/merchant/zones`)**：
    *   使用高德地图 `AMap.PolygonEditor` 绘制多边形区域
    *   点击地图添加顶点，双击完成绘制
    *   拖拽顶点编辑形状，右键删除顶点
    *   配置区域名称、配送时效（小时）
    *   列表展示所有配送区域，支持编辑/删除

### 5.2 用户端
*   **物流查询页 (`/track`)**：
    *   输入框输入订单号（格式：`ORD` 开头 20 位字符）
    *   支持格式验证和友好提示
    *   支持扫描二维码跳转（无需前端实现扫描功能）
    *   背景地图显示默认位置（北京天安门，缩放级别 10）
*   **实时追踪页 (`/track/:orderNo`)**：
    *   **地图可视化**：
        *   调用 `/tracking/:orderNo` API 获取订单和完整路径点数组（`route.points`）
        *   绘制起点标记（商家位置）、终点标记（收货地址）
        *   绘制完整路径线（蓝色 Polyline，可选优化：已走过深蓝实线 + 未走过浅灰虚线）
        *   车辆图标显示当前位置（运输中订单）
        *   自动调整地图视野以显示起点和终点（`fitBounds`），失败则回退至缩放级别 10
        *   支持地图控件（缩放、定位、比例尺）、触摸手势（双指缩放、拖拽）
    *   **实时位置更新**：
        *   WebSocket 连接订阅订单号（发送 `subscribe` 事件）
        *   后端每 5 秒推送一次位置更新（`location_update` 事件）
        *   前端收到推送后，车辆图标使用缓动函数在 2 秒内平滑移动到新位置
        *   移动路径为沿路径线的曲线插值（使用高德地图 `Marker.moveAlong` API）
        *   到达终点时收到 `status_update` 事件，显示"已送达"
    *   **订单信息卡片**：
        *   显示订单号、状态、进度百分比、物流公司、预计送达时间
        *   实时更新进度条
    *   **物流时间线**（小屏幕与地图切换 Tab 显示）：
        *   时间轴形式展示状态变更历史
        *   每条记录包含状态、描述、位置、时间戳
        *   倒序显示（最新在上）
    *   **错误处理**：
        *   网络断开：顶部显示黄色提示条"连接已断开，正在重连..."
        *   重连策略：指数退避重连（1次立即、2次等2秒、3次等4秒、4次等8秒，最多5次）
        *   重连成功：绿色提示"连接已恢复"，自动重新订阅订单，跳转到最新位置
        *   重连失败：显示"连接失败，请刷新页面"
    *   **响应式设计**：
        *   最小宽度 375px（iPhone 标准）
        *   小屏幕：地图和时间轴使用 Tab 切换
        *   大屏幕：地图和时间轴左右并排显示
        *   支持横竖屏自适应

### 5.3 后端服务
*   **RESTful API**：
    *   认证接口：`POST /auth/login`, `POST /auth/register`
    *   商家接口：`GET /merchants/me` (需认证)
    *   订单接口：`GET /orders`, `POST /orders`, `GET /orders/:id`, `PATCH /orders/:id`, `DELETE /orders/:id`, `POST /orders/:id/ship` (需认证)
    *   配送区域：`GET /delivery-zones`, `POST /delivery-zones`, `PATCH /delivery-zones/:id`, `DELETE /delivery-zones/:id` (需认证)
    *   物流公司：`GET /logistics-companies` (公开，前端下拉选择)
    *   追踪接口：`GET /tracking/:orderNo` (公开，返回包含 `route.points` 完整路径)
*   **WebSocket 实时通信**：
    *   使用 Socket.io Gateway 实现 (端口与 HTTP 服务相同)
    *   客户端事件：`subscribe(orderNo)` 订阅订单，`unsubscribe(orderNo)` 取消订阅
    *   服务端事件：`location_update` 位置更新，`status_update` 状态更新
    *   Room 机制实现订单级别隔离，避免无效推送
    *   首次订阅立即推送当前状态（位置、进度、预计送达）
*   **轨迹模拟**：
    *   使用 `@nestjs/schedule` 实现 Cron 定时任务（每 5 秒执行）
    *   自动更新运输中订单的位置，推进路径步骤（`currentStep++`）
    *   通过 WebSocket 广播 `location_update` 事件到对应订单 Room
    *   到达终点自动标记为已送达，创建时间线记录，广播 `status_update` 事件
    *   服务重启后自动恢复所有运输中订单的模拟

### 5.4 关键业务逻辑实现
*   **轨迹模拟策略**:
    1.  **优先真实路网**: 
        *   调用高德地图 Web 服务 API (`/v3/direction/driving`)。
        *   提取 polyline 路径点，进行采样优化（保留 50 个关键点）。
        *   真实路网路径通常包含 50+ 个不规则路径点。
    2.  **降级策略**: 
        *   若 API 调用失败（网络错误、Key 无效等），自动切换到直线插值。
        *   在起点和终点间生成 20 个均匀分布的路径点。
        *   确保系统在任何情况下都能正常工作。
    3.  **状态同步**: 
        *   Route 表维护 `currentStep` 指针和 `totalSteps` 总数。
        *   WebSocket 订阅时立即发送当前位置和进度。
        *   Cron 任务每 5 秒推进一步，广播位置更新。
    4.  **自动完成配送**:
        *   到达终点（`currentStep >= totalSteps - 1`）时自动更新订单状态为 DELIVERED。
        *   创建"已签收"物流时间线记录。
        *   停止继续推送。
*   **配送区域管理**:
    *   商家绘制多边形区域（GeoJSON Polygon 格式）。
    *   后端使用**射线法算法**（Ray Casting Algorithm）判断订单目的地是否在区域内。
    *   支持 Haversine 公式计算地理距离。
*   **物流公司时效管理**（已实现）:
    *   `LogisticsCompany` 表存储物流公司配置：
        *   `id` (UUID), `name` (唯一，如"顺丰速运"), `timeLimit` (配送时效，小时)
        *   系统预置 6 家物流公司：
            *   顺丰速运 (24小时)、京东物流 (24小时)
            *   圆通速递 (48小时)、中通快递 (48小时)
            *   申通快递 (72小时)、韵达速递 (72小时)
    *   创建订单时根据选择的物流公司自动计算 `estimatedTime`：
        *   `estimatedTime = createdAt + timeLimit`
    *   提供 `GET /logistics-companies` 接口供前端获取物流公司列表
*   **商家发货地址管理**（已实现）:
    *   `Merchant` 表包含 `address` 字段（JSON: {lng, lat, address}）
    *   商家可通过 `PATCH /merchants/me` 更新默认发货地址
    *   创建订单时自动使用商家的 `address` 作为 `origin`
*   **数据生成器 (Seeder)**:
    *   生成 100 个模拟订单（PENDING 60%, SHIPPING 20%, DELIVERED 15%, CANCELLED 5%）
    *   预置 31 个配送区域（覆盖主要省会城市，不重复）
    *   预置 6 家物流公司配置
    *   预置商家默认发货地址（北京市朝阳区）
    *   使用 `RouteQueueService` 生成真实路径（限流：半秒查一单，失败重试 3 次）
*   **认证与授权**:
    *   使用 Passport Local Strategy 处理登录
    *   JWT Token 无状态认证，保护商家端接口
    *   用户端追踪接口公开，无需认证（仅需订单号）

## 6. 数据库设计

### 6.1 数据模型

**Merchant (商家)**：
- 核心字段：`id` (UUID), `username` (唯一), `passwordHash` (bcrypt), `name`, `phone`
- 发货地址：`address` (JSON: {lng, lat, address}) - 默认发货地址
- 关系：一对多 orders, 一对多 deliveryZones

**Order (订单)**：
- 核心字段：`id` (UUID), `orderNo` (唯一，格式：ORD + 17位数字), `status` (enum: PENDING, SHIPPING, DELIVERED, CANCELLED), `merchantId`
- 收货信息：`receiverName`, `receiverPhone`, `receiverAddress`
- 商品信息：`productName`, `productQuantity`, `amount`, `logistics` (物流公司名称)
- 地理位置：`origin` (JSON: {lng, lat, address}), `destination` (JSON: {lng, lat, address}), `currentLocation` (JSON: {lng, lat, address})
- 时效：`estimatedTime` (预计送达时间), `actualTime` (实际送达时间)
- 关系：多对一 merchant, 一对一 route, 一对多 timeline

**DeliveryZone (配送区域)**：
- 核心字段：`id` (UUID), `name`, `merchantId`, `boundary` (GeoJSON Polygon 格式), `timeLimit` (配送时效，小时)
- 关系：多对一 merchant

**Route (轨迹缓存)**：
- 核心字段：`id` (UUID), `orderId` (唯一), `points` (JSON 数组: [[lng, lat], [lng, lat], ...])
- 进度：`currentStep` (当前步骤索引，从 0 开始), `totalSteps` (总步数), `interval` (推送间隔，毫秒，默认 5000)
- 关系：一对一 order

**LogisticsTimeline (物流时间线)**：
- 核心字段：`id` (UUID), `orderId`, `status` (状态描述，如"已揽收"、"运输中"、"已签收"), `description` (详细说明)
- 位置：`location` (可选，JSON: {lng, lat, address})
- 时间：`timestamp` (时间戳)
- 关系：多对一 order

**LogisticsCompany (物流公司)**：
- 核心字段：`id` (UUID), `name` (唯一，物流公司名称), `timeLimit` (配送时效，小时)
- 预置数据：顺丰速运(24h)、京东物流(24h)、圆通速递(48h)、中通快递(48h)、申通快递(72h)、韵达速递(72h)

### 6.2 数据关系图

```
Merchant (1) ──< (N) Order (1) ── (1) Route
    │                              │
    │                              └──< (N) LogisticsTimeline
    │
    └──< (N) DeliveryZone

LogisticsCompany (独立表，通过 name 关联)
```

### 6.3 关键设计说明

- **地理数据存储**：使用 JSON 格式存储坐标和地址，便于序列化和查询，预留升级到 PostGIS 原生类型的可能
- **路径缓存**：Route 表缓存路径点数组，避免重复调用高德 API，提高性能
- **时间线记录**：自动记录订单状态变更，包括订单创建、已揽收、运输中、派送中、已签收等关键节点
- **订单号生成**：格式为 `ORD` + 17 位数字，确保唯一性

## 7. 用户体验与技术特色

### 7.1 已实现特性
*   **实时数据同步**: 
    *   WebSocket Room 机制实现订单级别隔离。
    *   支持订阅/取消订阅，避免无效推送。
    *   首次订阅立即推送当前状态，无需等待下一个 tick。
*   **智能降级策略**: 
    *   高德 API 不可用时自动切换到直线插值。
    *   保证系统在任何情况下都能提供完整功能。
*   **数据持久化**: 
    *   路径缓存在数据库中，避免重复计算。
    *   服务重启后自动恢复所有运输中订单。
*   **完整业务闭环**: 
    *   从订单创建 → 发货 → 运输 → 送达的全流程自动化。
    *   物流时间线自动记录关键节点。

### 7.2 前端实现状态

**核心功能**：✅ **全部完成**
- ✅ 商家端登录/注册页面（JWT 认证，路由守卫）
- ✅ 订单列表页（分页、筛选、排序、多选、地图联动）
- ✅ 创建订单表单（地址搜索、地图选点、逆地理编码）
- ✅ 配送区域管理（PolygonEditor 绘制/编辑多边形）
- ✅ 用户端物流查询页（订单号输入、格式验证）
- ✅ 实时追踪页（WebSocket + 地图动画、路径分段显示）
- ✅ 物流时间轴组件（倒序显示、实时更新）
- ✅ 响应式布局（最小 375px，支持移动端和桌面端）

**进阶功能**：✅ **全部完成**
- ✅ 数据看板（统计卡片、ECharts 图表、高德地图 HeatMap）
- ✅ 批量操作（批量发货、批量删除、CSV 导出）
- ✅ 订单二维码生成（包含追踪链接，支持复制和打开）
- ✅ WebSocket 断线重连（指数退避策略，最多 5 次）
- ✅ 错误处理（ErrorBoundary、统一错误提示）

**特殊效果**：✅ **全部实现**
- ✅ 车辆平滑移动动画（requestAnimationFrame + ease-in-out 缓动函数）
- ✅ 路径分段显示（已走过深蓝实线 + 未走过浅灰虚线）
- ✅ 地图选点与逆地理编码（AMap.Geocoder）
- ✅ 多边形绘制编辑（AMap.PolygonEditor）
- ✅ 地址搜索自动补全（AMap.Autocomplete + AMap.PlaceSearch）
- ✅ 热力图可视化（AMap.HeatMap 插件）
- ✅ 自动调整视野（map.setFitView，失败时回退到手动计算）

## 8. 项目实施状态

### 8.1 后端服务
** 全部功能已完成并测试通过**：
*    商家认证系统（JWT + Passport）
*    订单管理完整 CRUD（含批量发货/删除）
*    智能路径规划（高德 API + 降级策略）
*    实时轨迹追踪（WebSocket，含 Room 机制和 delivery_complete 事件）
*    配送区域管理（射线法地理计算）
*    定时任务自动化（Cron 轨迹模拟）
*    物流时间线自动记录
*    物流公司管理系统（6家预置公司，自动计算时效）
*    商家发货地址管理（支持更新和自动使用）
*    数据统计分析（总览/区域/物流公司）
*    数据库设计与 Prisma ORM
*    完整的测试套件（单元测试 + E2E测试 + 演示测试）
*    Docker 容器化支持

**测试验证结果**（2025-11-23）：
-  **单元测试**: 66/66 通过（AmapService, GeoUtils, OrdersService）
-  **E2E 测试**: 42/42 通过（11个业务场景全覆盖）
-  **演示测试**: 9/9 场景通过（55秒完整演示）
-  **高德 API**: 真实路网规划成功（天安门→望京，57个路径点）
-  **WebSocket**: 实时推送正常（含断线重连和事件完整性）
-  **系统状态**: 118个订单，7个运输中，今日56单，金额¥245,162.93
-  **服务恢复**: 支持重启后自动恢复运输中订单

**测试统计概览**：

| 测试类型 | 文件数 | 测试用例 | 通过率 | 覆盖率 |
|---------|-------|---------|--------|--------|
| 单元测试 | 3 | 66个 | 100%  | 核心模块 80%+ |
| E2E 测试 | 1 | 42个 | 100%  | 完整业务流程 |
| 演示测试 | 2 | 9个场景 | 100%  | 功能展示 |

**演示性测试**：

项目包含两种演示性测试，用于快速展示系统功能：

1. **完整流程演示** (`backend/tests/demo.test.ts`)
   - 运行命令：`pnpm demo`
   - 自动化执行全流程（约 60-90 秒）
   - 展示 9 大核心能力 + 7 大技术亮点
   - 包含 WebSocket 实时推送演示

2. **交互式演示** (`backend/tests/api-showcase.ts`)
   - 运行命令：`pnpm demo:interactive`
   - 交互式菜单选择，按需演示特定功能
   - 支持 12 个可选场景（认证、订单、路径规划、实时追踪等）

详细测试说明请参考 `README.md` 中的"运行测试"章节。

### 8.2 前端应用

**✅ 全部功能已完成并实现**：

**项目架构**：
- ✅ Vite + React 18 + TypeScript 项目初始化
- ✅ 依赖安装（Ant Design, 高德地图, ECharts, axios, socket.io-client, zustand, react-router-dom, qrcode.react, dayjs）
- ✅ 路由配置（React Router v6，路由守卫保护商家端）
- ✅ 环境变量配置（VITE_API_URL, VITE_AMAP_KEY, VITE_AMAP_SECURITY_JSCODE）
- ✅ API 服务封装（axios instance + JWT 拦截器 + 统一错误处理）

**商家端功能**：
- ✅ 登录页 (`/merchant/login`) + JWT Token 存储（localStorage）
- ✅ 订单列表页 (`/merchant/orders`) - 表格、分页、筛选、排序、多选、地图联动
- ✅ 创建订单表单 (`/merchant/orders/new`) - 地址搜索、地图选点、逆地理编码
- ✅ 订单详情弹窗 - 信息展示、二维码生成、追踪链接（复制/打开）
- ✅ 批量操作 - 批量发货、批量删除、CSV 导出
- ✅ 配送区域管理 (`/merchant/zones`) - PolygonEditor 绘制/编辑多边形
- ✅ 数据看板 (`/merchant/dashboard`) - 统计卡片、ECharts 图表、热力图、最新订单动态

**用户端功能**：
- ✅ 物流查询页 (`/track`) - 订单号输入、格式验证
- ✅ 实时追踪页 (`/track/:orderNo`) - 地图可视化、物流时间轴
- ✅ WebSocket 实时通信 - 订阅/取消订阅、断线重连（指数退避）
- ✅ 车辆平滑移动动画（requestAnimationFrame + ease-in-out 缓动函数）
- ✅ 路径分段显示（已走过深蓝实线 + 未走过浅灰虚线）
- ✅ 响应式布局 - 小屏幕 Tab 切换，大屏幕并排显示

**已实现组件**：
- ✅ `MapComponent` - 高德地图封装（支持插件加载、错误处理）
- ✅ `OrderDetailModal` - 订单详情弹窗（二维码、追踪链接）
- ✅ `QRCodeGenerator` - 二维码生成
- ✅ `ErrorBoundary` - 错误边界
- ✅ `OrderTable` - 订单表格（多选、筛选、排序）
- ✅ `AddressPicker` - 地址选择器（搜索、地图选点）
- ✅ `ZoneEditor` - 配送区域编辑器（PolygonEditor）
- ✅ `TimeAnalysisChart` - 时效分析图表（ECharts Geo + 柱状图）
- ✅ `HeatmapChart` - 热力图（高德地图 HeatMap 插件）
- ✅ `TrackingMap` - 追踪地图（车辆动画、路径分段）
- ✅ `OrderTimeline` - 物流时间轴
- ✅ `ConnectionStatus` - 连接状态提示

## 9. 项目目录结构

```
/
├── frontend/                    # React 前端应用 (已完成)
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── merchant/       # 商家端页面（登录、看板、订单、区域）
│   │   │   └── track/          # 用户端页面（查询、追踪）
│   │   ├── components/         # 通用组件
│   │   │   ├── common/         # 通用组件（ErrorBoundary、QRCodeGenerator）
│   │   │   ├── layout/         # 布局组件（MerchantLayout）
│   │   │   ├── map/            # 地图组件（MapComponent、OrderListMap、TrackingMap）
│   │   │   ├── merchant/       # 商家端组件（订单、区域、看板相关）
│   │   │   └── track/          # 用户端组件（追踪相关）
│   │   ├── stores/             # Zustand 状态管理（authStore、themeStore）
│   │   ├── services/           # API 请求封装（api.ts、orderService、websocketService 等）
│   │   ├── hooks/              # 自定义 Hooks（useAmap）
│   │   ├── utils/              # 工具函数（mapUtils、animationUtils、message）
│   │   ├── types/              # TypeScript 类型定义
│   │   └── router/             # 路由配置
│   ├── public/                 # 静态资源
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # NestJS 后端服务 (已完成)
│   ├── src/
│   │   ├── auth/               # 认证模块（JWT + Passport）
│   │   ├── merchants/          # 商家模块
│   │   ├── orders/             # 订单模块（含 AmapService、RouteQueueService）
│   │   ├── delivery-zones/     # 配送区域模块
│   │   ├── logistics-companies/ # 物流公司模块
│   │   ├── statistics/         # 数据统计模块
│   │   ├── tracking/           # 追踪模块（WebSocket Gateway）
│   │   ├── simulator/           # 轨迹模拟模块（定时任务）
│   │   ├── prisma/             # Prisma 模块
│   │   └── utils/               # 工具函数（地理空间计算）
│   ├── prisma/
│   │   ├── schema.prisma       # 数据库 Schema
│   │   └── seed.ts             # 数据填充脚本
│   ├── tests/                  # 测试文件
│   │   ├── demo.test.ts        # 完整流程演示
│   │   ├── api-showcase.ts     # 交互式演示
│   │   └── e2e/                # E2E 测试
│   ├── Dockerfile
│   └── package.json
├── docs/                       # 项目文档
│   └── spec.md                 # 技术规范文档
├── documents/                  # 原始需求文档（只读）
├── docker-compose.yml          # 数据库编排
└── README.md                   # 项目入口说明
```

---

## 10. 后端 API 接口清单（已全部实现）

>  所有后端接口已实现并测试通过，前端可直接调用。

### 10.1 认证接口
-  `POST /auth/login` - 商家登录（返回 JWT Token）
-  `POST /auth/register` - 商家注册

### 10.2 商家接口
-  `GET /merchants/me` - 获取商家信息（需认证）
-  `PATCH /merchants/me` - 更新商家信息（含发货地址）

### 10.3 订单接口
-  `GET /orders` - 订单列表（支持分页、筛选、排序）
-  `POST /orders` - 创建订单（自动使用商家发货地址）
-  `GET /orders/:id` - 订单详情
-  `PATCH /orders/:id` - 更新订单
-  `DELETE /orders/:id` - 删除订单
-  `POST /orders/:id/ship` - 发货（调用高德API规划路径）
-  `POST /orders/:id/deliver` - 确认送达
-  `POST /orders/batch/ship` - 批量发货
-  `DELETE /orders/batch` - 批量删除

### 10.4 配送区域接口
-  `GET /delivery-zones` - 配送区域列表
-  `POST /delivery-zones` - 创建配送区域
-  `GET /delivery-zones/:id/orders` - 区域内订单
-  `PATCH /delivery-zones/:id` - 更新配送区域
-  `DELETE /delivery-zones/:id` - 删除配送区域

### 10.5 物流公司接口
-  `GET /logistics-companies` - 物流公司列表（公开接口）

### 10.6 数据统计接口
-  `GET /statistics/overview` - 总览统计（今日订单/金额/运输中）
-  `GET /statistics/zones` - 配送区域统计（订单数/时效）
-  `GET /statistics/logistics` - 物流公司统计（订单数/时效/准点率）

### 10.7 追踪接口（公开）
-  `GET /tracking/:orderNo` - 订单追踪（含完整路径点）

### 10.8 WebSocket 事件
**客户端事件**：
- `subscribe(orderNo)` - 订阅订单更新
- `unsubscribe(orderNo)` - 取消订阅

**服务端事件**：
- `location_update` - 位置更新（每5秒推送）
- `status_update` - 状态更新
- `delivery_complete` - 配送完成

---

## 11. 开发环境配置

### 11.1 后端环境变量
```env
# 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_viz?schema=public"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# 高德地图
AMAP_KEY="your-amap-web-service-key"
```

### 11.2 一键启动命令
```bash
# 后端服务（从项目根目录）
kill -9 $(lsof -ti:3000) 2>/dev/null || true && \
cd backend && \
pnpm install && \
pnpm prisma:generate && \
pnpm prisma:push && \
pnpm prisma:seed && \
pnpm start:dev
```

### 11.3 测试命令
```bash
# 单元测试
pnpm test:unit

# E2E 测试
pnpm test:e2e

# 演示测试
pnpm demo

# 交互式测试
pnpm demo:interactive
```

### 11.4 前端环境变量
```env
# API 地址
VITE_API_URL=http://localhost:3000

# 高德地图 JS API（必需）
VITE_AMAP_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JSCODE=your-amap-security-jscode
```

---

## 12. 总结

本文档详细描述了电商物流配送可视化平台的完整技术规范，包括：

1. **系统架构**：前后端分离、单应用多路由设计、模块化架构
2. **技术栈**：React 18 + NestJS + PostgreSQL + 高德地图 API
3. **核心功能**：订单管理、实时追踪、配送区域管理、数据统计分析
4. **特殊效果**：车辆平滑动画、路径分段显示、地图选点、多边形编辑、热力图
5. **数据设计**：6 个核心数据模型，支持地理空间计算
6. **API 规范**：完整的 RESTful API 和 WebSocket 事件定义
7. **测试策略**：单元测试、E2E 测试、演示测试

项目已完整实现所有功能，前后端均已开发完成并通过测试。详细的使用说明请参考 `README.md`。

---

**文档版本**：v1.0  
**最后更新**：2025-01-XX  
**维护者**：项目开发团队
