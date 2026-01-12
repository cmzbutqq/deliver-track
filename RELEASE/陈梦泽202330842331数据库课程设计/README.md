# 数据库前后端系统使用说明

本文档说明如何启动和使用数据库前后端系统。

## 环境要求

- **Node.js**: 18+
- **包管理器**: pnpm（推荐）或 npm
- **Docker & Docker Compose**: 用于运行 PostgreSQL 数据库

## 数据库配置

### 数据库连接

数据库通过 Docker Compose 启动，默认配置如下：

- **数据库类型**: PostgreSQL
- **端口**: 5432
- **数据库名**: `delivery_viz`
- **用户名**: `postgres`
- **密码**: `postgres`

连接字符串（`backend/.env`）：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_viz?schema=public"
```

### 数据库结构管理

系统使用 Prisma ORM 管理数据库结构，数据库 schema 定义在 `backend/prisma/schema.prisma`。

**开发环境**（推荐）：
```bash
cd backend
npx prisma db push --force-reset --accept-data-loss
```
此命令会直接同步 schema 到数据库，删除所有数据并重新初始化。

**初始化测试数据**：
```bash
cd backend
npx prisma db seed
```
seed 脚本会创建默认测试账号和初始数据。

## 启动系统

### 一键启动（推荐）

**启动后端服务**（包含数据库）：
```bash
./start-backend.sh
```

此脚本会自动：
1. 启动 Docker 数据库
2. 清理端口占用（3000）
3. 安装依赖
4. 同步数据库结构（`prisma db push`）
5. 运行 seed 脚本初始化数据
6. 启动后端开发服务器

**启动前端服务**（新开终端）：
```bash
./runfrontend.sh
```

此脚本会自动：
1. 清理端口占用（5173）
2. 安装依赖
3. 启动前端开发服务器

**说明**：
- 脚本会自动处理端口占用、依赖安装、数据库重置等操作
- 每次启动后端时，数据库会被重置并重新初始化，确保数据状态一致
- 按 `Ctrl+C` 停止服务后，会自动回到项目根目录
- 如果脚本没有执行权限，运行 `chmod +x start-backend.sh runfrontend.sh`

### 手动启动

**1. 启动数据库**：
```bash
docker-compose up -d
```

**2. 启动后端**：
```bash
cd backend
pnpm install
npx prisma db push --force-reset --accept-data-loss
npx prisma db seed
pnpm start:dev
```

**3. 启动前端**（新开终端）：
```bash
cd frontend
pnpm install
pnpm dev
```

## 数据库管理工具

### Prisma Studio

Prisma Studio 是 Prisma 提供的可视化数据库管理工具，可以直观地查看和编辑数据库中的数据。

**启动 Prisma Studio**：
```bash
cd backend
pnpm prisma:studio
```

访问地址：`http://localhost:5555`

**功能**：
- 查看所有表的数据
- 编辑、添加、删除数据
- 查看表之间的关联关系
- 验证数据完整性约束

### 数据库结构查看

**查看数据库结构**：
```bash
cd backend
npx prisma studio
```

**生成 Prisma Client**（修改 schema 后）：
```bash
cd backend
npx prisma generate
```

## 访问地址

- **前端应用**: `http://localhost:5173`
- **后端 API**: `http://localhost:3000`
- **Prisma Studio**: `http://localhost:5555`（需要先运行 `pnpm prisma:studio`）

## 测试账号

系统 seed 脚本会自动创建以下测试账号：

- **用户名**: `merchant1`
- **密码**: `123456`

## 环境变量配置

### 后端环境变量（`backend/.env`）

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_viz?schema=public"
JWT_SECRET="your_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"
AMAP_KEY="your_amap_web_service_key"  # 建议
```

### 前端环境变量（`frontend/.env`）

```env
VITE_API_URL=http://localhost:3000
VITE_AMAP_KEY=your-amap-js-api-key           # 必需
VITE_AMAP_SECURITY_JSCODE=your-security-code  # 必需
```

## 常见问题

### 数据库连接失败

- 检查 Docker 容器是否运行：`docker ps`
- 查看数据库日志：`docker logs delivery-viz-db`
- 确认 `.env` 中的 `DATABASE_URL` 配置正确
- 检查 5432 端口是否被占用

### Prisma 数据库同步失败

- 开发环境使用：`npx prisma db push`（直接同步，不创建迁移文件）
- 重置数据库：`npx prisma db push --force-reset --accept-data-loss`
- 检查 `backend/prisma/schema.prisma` 文件是否有语法错误

### Seed 脚本运行失败

- 检查数据库是否已启动
- 查看 seed 脚本的错误信息
- 确认 `backend/prisma/seed.ts` 文件是否正确

### 端口被占用

- 后端端口（3000）：`kill -9 $(lsof -ti:3000)`
- 前端端口（5173）：`kill -9 $(lsof -ti:5173)`
- Prisma Studio 端口（5555）：`kill -9 $(lsof -ti:5555)`

### bcrypt 加载失败（M1/M2 Mac）

启动脚本已包含构建步骤，如果仍有问题，手动执行：
```bash
cd backend
pnpm approve-builds bcrypt
```

## 数据库相关命令

```bash
cd backend

# 查看数据库结构
npx prisma studio

# 同步数据库结构（开发环境）
npx prisma db push

# 重置数据库并同步结构
npx prisma db push --force-reset --accept-data-loss

# 运行 seed 脚本
npx prisma db seed

# 生成 Prisma Client
npx prisma generate
```
