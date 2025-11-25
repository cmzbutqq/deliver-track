FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# 安装依赖
RUN pnpm install --frozen-lockfile || pnpm install

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN pnpm prisma:generate

# 构建应用
RUN pnpm build

# 生产环境镜像
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]

