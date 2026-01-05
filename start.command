#!/bin/bash
# Codex Desktop 启动脚本
# 双击此文件即可启动应用

cd "$(dirname "$0")"

echo "🚀 Starting Codex Desktop..."
echo ""

# 检查 node 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    read -p "Press Enter to exit..."
    exit 1
fi

# 检查 cargo 是否安装
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found. Please install Rust first."
    read -p "Press Enter to exit..."
    exit 1
fi

# 检查 codex 是否安装
if ! command -v codex &> /dev/null; then
    echo "❌ Codex CLI not found. Please install it first."
    read -p "Press Enter to exit..."
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 启动应用
echo "✅ Starting Tauri dev server..."
npm run tauri dev

# 保持窗口打开以便查看错误
read -p "Press Enter to exit..."
