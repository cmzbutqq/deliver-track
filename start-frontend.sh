#!/bin/bash

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 设置错误处理：Ctrl+C 时回到根目录
trap 'cd "$SCRIPT_DIR"; echo ""; echo "❌ 服务已停止，已回到项目根目录"; exit 130' INT TERM

echo "🚀 启动前端服务..."
echo ""

# 阶段1: 清理端口占用
echo "🧹 [1/4] 清理端口占用..."
(lsof -ti:5173 | xargs kill -9 2>/dev/null || true)
sleep 1
echo "✅ 端口 5173 已清理"
echo ""

# 阶段2: 进入 frontend 目录
echo "📂 [2/4] 进入 frontend 目录..."
cd frontend
if [ $? -ne 0 ]; then
  echo "❌ 无法进入 frontend 目录"
  exit 1
fi
echo "✅ 已进入 frontend 目录"
echo ""

# 阶段3: 安装依赖
echo "📥 [3/4] 安装依赖..."
pnpm install
if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi
echo "✅ 依赖安装完成"
echo ""

# 阶段4: 启动开发服务器
echo "🎉 [4/4] 启动开发服务器..."
echo ""

pnpm dev

# 如果服务正常退出，回到根目录
cd "$SCRIPT_DIR"
echo ""
echo "✅ 服务已停止，已回到项目根目录"

