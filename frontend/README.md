# 前端项目

电商物流配送可视化平台 - 前端应用

## 技术栈

- React 18 + TypeScript
- Vite
- Ant Design
- React Router v6
- Zustand (状态管理)
- Socket.io-client (实时通信)
- 高德地图 JS API
- ECharts (数据可视化)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# API 配置
VITE_API_URL=http://localhost:3000

# 高德地图配置（JS API - 前端使用）
VITE_AMAP_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JSCODE=your-amap-security-jscode
```

### 3. 启动开发服务器

```bash
pnpm dev
```

前端将在 `http://localhost:5173` 启动。

### 4. 构建生产版本

```bash
pnpm build
```

## 项目结构

```
src/
├── pages/           # 页面组件
│   ├── merchant/    # 商家端页面
│   └── track/       # 用户端页面
├── components/      # 通用组件
├── stores/          # Zustand 状态管理
├── services/        # API 服务封装
├── utils/           # 工具函数
└── types/           # TypeScript 类型定义
```

## 路由说明

### 商家端（需登录）
- `/merchant/login` - 登录页
- `/merchant/dashboard` - 数据看板
- `/merchant/orders` - 订单列表
- `/merchant/orders/new` - 创建订单
- `/merchant/zones` - 配送区域管理

### 用户端（公开）
- `/track` - 物流查询页
- `/track/:orderNo` - 实时追踪页

## 开发进度

- ✅ 项目初始化
- ✅ 基础架构（路由、API、状态管理）
- ✅ 商家端核心页面（登录、订单列表、创建订单）
- ✅ 用户端核心页面（查询、追踪）
- ⏳ 地图功能（高德地图集成）
- ⏳ 数据看板（ECharts 图表）
- ⏳ 配送区域管理（地图绘制）
- ⏳ 实时追踪（WebSocket + 动画）

## 注意事项

1. 确保后端服务已启动（`http://localhost:3000`）
2. 高德地图 JS API Key 需要单独申请（与后端 Web Service API Key 不同）
3. 前端使用 JS API，需要配置安全密钥（Jscode）
