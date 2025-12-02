#!/bin/bash

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 设置错误处理：Ctrl+C 时回到根目录
trap 'cd "$SCRIPT_DIR"; echo ""; echo "❌ 服务已停止，已回到项目根目录"; exit 130' INT TERM

echo "🚀 启动后端服务..."
echo ""

# 阶段1: 启动 Docker 数据库
echo "📦 [1/6] 启动 Docker 数据库..."
docker-compose up -d
if [ $? -ne 0 ]; then
  echo "❌ Docker 启动失败"
  exit 1
fi
echo "✅ Docker 数据库已启动"
echo ""

# 阶段2: 清理端口占用
echo "🧹 [2/6] 清理端口占用..."
(lsof -ti:3000 | xargs kill -9 2>/dev/null || true)
sleep 1
echo "✅ 端口 3000 已清理"
echo ""

# 阶段3: 进入 backend 目录
echo "📂 [3/6] 进入 backend 目录..."
cd backend
if [ $? -ne 0 ]; then
  echo "❌ 无法进入 backend 目录"
  exit 1
fi
echo "✅ 已进入 backend 目录"
echo ""

# 阶段4: 安装依赖
echo "📥 [4/6] 安装依赖..."
pnpm install
if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi
echo "✅ 依赖安装完成"
echo ""

# 阶段5: 构建 bcrypt（M1/M2 Mac 需要）
echo "🔨 [5/6] 构建 bcrypt..."
pnpm approve-builds bcrypt
if [ $? -ne 0 ]; then
  echo "⚠️  bcrypt 构建失败（可能不是 M1/M2 Mac，继续执行）"
fi
echo "✅ bcrypt 构建完成"
echo ""

# 阶段6: 重置数据库并启动服务
echo "🗄️  [6/6] 重置数据库（删除所有数据，重新运行迁移和 seed）..."
npx prisma migrate reset --force
if [ $? -ne 0 ]; then
  echo "❌ 数据库重置失败"
  exit 1
fi
echo "✅ 数据库已重置并初始化完成"
echo ""

echo "🎉 准备就绪，启动开发服务器..."
echo ""

# 启动开发服务器
pnpm start:dev

# 如果服务正常退出，回到根目录
cd "$SCRIPT_DIR"
echo ""
echo "✅ 服务已停止，已回到项目根目录"

