# 前端应用

电商物流配送可视化平台前端应用，基于 React + TypeScript + Vite 构建。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design
- **状态管理**: Zustand
- **路由**: React Router v6
- **地图**: 高德地图 JS API v2.0
- **图表**: ECharts
- **实时通信**: Socket.io-client
- **HTTP 客户端**: Axios

## 快速开始

### 安装依赖

```bash
cd frontend
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```env
VITE_API_URL=http://localhost:3000
VITE_AMAP_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JSCODE=your-amap-security-jscode
```

### 启动开发服务器

```bash
pnpm dev
```

前端将在 `http://localhost:5173` 启动。

## 项目结构

```
frontend/
├── src/
│   ├── pages/          # 页面组件
│   │   ├── merchant/   # 商家端页面
│   │   └── track/     # 用户端页面
│   ├── components/     # 组件
│   │   ├── common/    # 通用组件
│   │   ├── layout/    # 布局组件
│   │   ├── map/      # 地图组件
│   │   ├── merchant/  # 商家端组件
│   │   └── track/     # 用户端组件
│   ├── services/       # API 服务
│   ├── stores/         # 状态管理
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型
│   └── router/         # 路由配置
├── public/             # 静态资源
└── package.json
```

## 功能特性

### 商家端
- ✅ 登录/注册
- ✅ 数据看板（统计卡片、ECharts 图表、热力图）
- ✅ 订单管理（列表、创建、批量操作）
- ✅ 配送区域管理（地图绘制编辑）
- ✅ 实时数据更新（WebSocket）

### 用户端
- ✅ 物流查询（订单号输入）
- ✅ 实时追踪（地图动画、时间轴）
- ✅ WebSocket 断线重连

## 开发说明

### 路由结构

- `/merchant/login` - 商家登录
- `/merchant/dashboard` - 数据看板
- `/merchant/orders` - 订单列表
- `/merchant/orders/new` - 创建订单
- `/merchant/zones` - 配送区域管理
- `/track` - 物流查询
- `/track/:orderNo` - 实时追踪

### 状态管理

使用 Zustand 管理全局状态：
- `authStore` - 认证状态
- `themeStore` - 主题状态

### API 服务

所有 API 请求通过 `services/api.ts` 统一封装，自动处理 JWT Token 和错误。

### 地图功能

高德地图相关功能：
- 地图组件封装 (`components/map/MapComponent`)
- 订单列表地图 (`components/map/OrderListMap`)
- 实时追踪地图 (`components/track/TrackingMap`)
- 配送区域编辑器 (`components/merchant/ZoneEditor`)

## 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

构建产物在 `dist/` 目录。

