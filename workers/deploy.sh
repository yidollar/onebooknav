#!/bin/bash

# OneBookNav Cloudflare Workers 部署脚本
# 这个脚本将帮助您自动设置和部署 OneBookNav 到 Cloudflare Workers

set -e

echo "🚀 OneBookNav Cloudflare Workers 部署脚本"
echo "=========================================="

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler CLI 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 错误: 未登录 Cloudflare"
    echo "请运行: wrangler auth login"
    exit 1
fi

echo "✅ wrangler CLI 已安装并已登录"

# 步骤 1: 创建数据库
echo ""
echo "📍 步骤 1: 创建 D1 数据库"
echo "正在创建数据库 'onebooknav'..."

DB_OUTPUT=$(wrangler d1 create onebooknav 2>&1 || true)
if echo "$DB_OUTPUT" | grep -q "already exists"; then
    echo "⚠️  数据库 'onebooknav' 已存在"
    DB_ID=$(wrangler d1 list | grep "onebooknav" | awk '{print $2}' | head -1)
else
    DB_ID=$(echo "$DB_OUTPUT" | grep -o "database_id = \"[^\"]*\"" | sed 's/database_id = "\(.*\)"/\1/')
    echo "✅ 数据库创建成功!"
fi

if [ -z "$DB_ID" ]; then
    echo "❌ 错误: 无法获取数据库 ID"
    echo "请手动运行: wrangler d1 create onebooknav"
    exit 1
fi

echo "📋 数据库 ID: $DB_ID"

# 步骤 2: 更新配置文件
echo ""
echo "📍 步骤 2: 更新配置文件"

# 更新 wrangler.toml
if [ -f "wrangler.toml" ]; then
    sed -i.bak "s/YOUR_DATABASE_ID_HERE/$DB_ID/g" wrangler.toml
    echo "✅ 已更新 wrangler.toml"
else
    echo "❌ 错误: 找不到 wrangler.toml 文件"
    exit 1
fi

# 步骤 3: 初始化数据库
echo ""
echo "📍 步骤 3: 初始化数据库结构"

if [ -f "../data/schema.sql" ]; then
    wrangler d1 execute onebooknav --file=../data/schema.sql
    echo "✅ 数据库结构初始化完成"
else
    echo "⚠️  警告: 找不到 schema.sql，跳过数据库初始化"
fi

# 步骤 4: 设置密钥
echo ""
echo "📍 步骤 4: 设置安全密钥"

# 检查 JWT_SECRET
if ! wrangler secret list 2>/dev/null | grep -q "JWT_SECRET"; then
    echo "🔐 请设置 JWT_SECRET（用于身份验证）"
    echo "建议使用 64 位随机字符串，例如："
    echo "$(openssl rand -hex 32 2>/dev/null || echo 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890')"
    echo ""
    wrangler secret put JWT_SECRET
    echo "✅ JWT_SECRET 设置完成"
else
    echo "✅ JWT_SECRET 已存在"
fi

# 检查 DEFAULT_ADMIN_PASSWORD
if ! wrangler secret list 2>/dev/null | grep -q "DEFAULT_ADMIN_PASSWORD"; then
    echo ""
    echo "🔐 请设置管理员密码"
    echo "要求: 至少 8 个字符，建议包含大小写字母、数字和特殊字符"
    echo ""
    wrangler secret put DEFAULT_ADMIN_PASSWORD
    echo "✅ DEFAULT_ADMIN_PASSWORD 设置完成"
else
    echo "✅ DEFAULT_ADMIN_PASSWORD 已存在"
fi

# 步骤 5: 部署
echo ""
echo "📍 步骤 5: 部署到 Cloudflare Workers"

wrangler deploy

echo ""
echo "🎉 部署完成!"
echo ""
echo "📋 部署信息:"
echo "   - 数据库 ID: $DB_ID"
echo "   - 管理员用户名: admin"
echo "   - 管理员密码: 您刚才设置的密码"
echo ""
echo "🌐 访问您的应用程序并使用管理员账户登录"
echo ""
echo "📝 提示:"
echo "   - 查看日志: wrangler tail"
echo "   - 查看数据库: wrangler d1 execute onebooknav --command='SELECT * FROM users'"
echo "   - 本地开发: wrangler dev"