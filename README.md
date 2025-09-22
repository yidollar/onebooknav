# OneBookNav - 统一书签导航系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PHP Version](https://img.shields.io/badge/PHP-7.4%2B-blue.svg)](https://php.net)
[![Docker](https://img.shields.io/badge/Docker-支持-blue.svg)](https://docker.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-支持-orange.svg)](https://workers.cloudflare.com)

> **重要提示**：本项目已经过全面审查和优化，特别是 Cloudflare Workers 部署方式已完全修复并可正常使用。

OneBookNav 是一个功能强大的个人书签管理系统，融合了 BookNav 和 OneNav 的优秀特性，支持多种部署方式，具有高度兼容性和灵活性。经过深度优化，现在完美支持三种部署方式，特别针对 Cloudflare Workers 进行了全面重构。

## 🌟 主要特性

### 📊 核心功能
- **多用户支持** - 完整的用户注册、登录、权限管理系统
- **分层分类管理** - 支持无限级别的分类嵌套，拖拽排序
- **智能书签管理** - 自动获取网站图标、标题，支持批量操作
- **全文搜索** - 快速搜索书签标题、描述、关键词
- **数据备份恢复** - 支持多种格式的数据导入导出
- **WebDAV 同步** - 支持WebDAV远程备份和同步
- **响应式设计** - 完美适配桌面和移动设备

### 🔧 技术特性
- **三种部署方式**：PHP直传、Docker容器、Cloudflare Workers
- **多数据库支持**：SQLite、MySQL、PostgreSQL、D1 Database
- **现代化前端**：Bootstrap 5 + 原生JavaScript，PWA支持
- **RESTful API**：完整的API接口，支持第三方集成
- **安全性**：JWT令牌认证、CSRF保护、XSS防护

## 🚀 快速开始

### 🎯 选择部署方式

| 部署方式 | 适用场景 | 难度 | 性能 | 费用 |
|----------|----------|------|------|------|
| **Cloudflare Workers** | 个人用户，全球访问 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 免费/低费用 |
| **Docker** | 开发者，服务器部署 | ⭐⭐ | ⭐⭐⭐⭐ | 服务器费用 |
| **PHP 直接部署** | 共享主机，简单部署 | ⭐ | ⭐⭐⭐ | 主机费用 |

**💡 推荐方案**：
- **新手用户** → Cloudflare Workers（免费，全球加速）
- **开发者** → Docker（环境隔离，易于管理）
- **传统主机** → PHP 直接部署（兼容性好）

### ⚡ 5分钟快速部署 - Cloudflare Workers

```bash
# 1. 安装工具
npm install -g wrangler

# 2. 登录账户
wrangler auth login

# 3. 下载代码
git clone https://github.com/your-repo/onebooknav.git
cd onebooknav/workers

# 4. 一键部署脚本 (推荐)
# Linux/macOS:
chmod +x deploy.sh && ./deploy.sh
# Windows:
# deploy.bat

# 或手动部署:
# wrangler d1 create onebooknav
# 更新 wrangler.toml 中的数据库 ID
# wrangler d1 execute onebooknav --file=../data/schema.sql
# wrangler secret put JWT_SECRET
# wrangler secret put DEFAULT_ADMIN_PASSWORD
# wrangler deploy
```

**🎉 完成！**访问显示的 Workers 域名，使用 `admin` 和你设置的密码登录

### 系统要求

#### PHP 部署
- PHP 7.4 或更高版本
- 必需扩展：`pdo`, `json`, `mbstring`, `openssl`, `curl`
- 可选扩展：`zip`, `gd`, `sqlite3`, `mysql`, `pgsql`
- Web 服务器：Apache、Nginx 或 PHP 内置服务器

#### Docker 部署
- Docker 20.10 或更高版本
- Docker Compose 2.0 或更高版本
- 至少 512MB 可用内存

#### Cloudflare Workers 部署
- Cloudflare 账户（免费版即可）
- Node.js 18 或更高版本（用于开发工具）
- Wrangler CLI 工具

## 🚀 部署指南

### 方式一：PHP 直接部署

这是最简单的部署方式，适合共享主机或VPS。

#### 1. 下载和解压

```bash
# 方法1：下载发布版本
wget https://github.com/your-repo/onebooknav/releases/latest/download/onebooknav.zip
unzip onebooknav.zip

# 方法2：克隆仓库
git clone https://github.com/your-repo/onebooknav.git
cd onebooknav
```

#### 2. 上传文件

将所有文件上传到你的Web服务器根目录（如 `public_html`、`www` 或 `htdocs`）。

#### 3. 设置权限

```bash
# Linux/Unix 系统
chmod -R 755 .
chmod -R 777 data/
```

#### 4. 配置Web服务器

**Apache (.htaccess)**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# 安全性设置
<Files "config.php">
    Order deny,allow
    Deny from all
</Files>

<Directory "data/">
    Options -Indexes
</Directory>
```

**Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/onebooknav;
    index index.php index.html;

    # API路由
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }

    # PHP处理
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # 安全性设置
    location /config/ { deny all; }
    location /data/ { deny all; }
    location /includes/ { deny all; }
}
```

#### 5. 运行安装程序

1. 在浏览器中访问 `http://your-domain.com/install.php`
2. 按照安装向导完成配置：
   - 选择数据库类型（推荐SQLite）
   - 设置管理员账户
   - 配置站点信息
3. 安装完成后删除 `install.php` 文件

#### 6. 系统检查

访问 `http://your-domain.com/check.php` 检查系统环境是否正常。

---

### 方式二：Docker 部署

Docker部署提供了完整的容器化解决方案，适合开发和生产环境。

#### 1. 克隆项目

```bash
git clone https://github.com/your-repo/onebooknav.git
cd onebooknav
```

#### 2. 基础部署（SQLite）

```bash
# 启动基础服务（仅 OneBookNav + SQLite）
docker-compose up -d

# 服务将在 http://localhost:3080 运行
```

#### 3. 完整部署（MySQL + Redis + SSL）

```bash
# 启动完整服务栈
docker-compose --profile with-mysql --profile with-cache --profile with-proxy up -d
```

#### 4. 开发模式

```bash
# 启动开发环境（支持热重载和调试）
docker-compose --profile development up -d

# 开发服务在 http://localhost:3080 运行
# XDebug 调试端口：9003
```

#### 5. 自定义配置

编辑 `config/config.php` 自定义配置：

```php
<?php
// 数据库配置
define('DB_TYPE', 'mysql');  // 或 'sqlite', 'pgsql'
define('DB_HOST', 'onebooknav_mysql');
define('DB_NAME', 'onebooknav');
define('DB_USER', 'onebooknav');
define('DB_PASS', 'your-password');

// 站点配置
define('SITE_TITLE', '我的书签导航');
define('SITE_URL', 'https://your-domain.com');

// 安全配置
define('JWT_SECRET', 'your-super-secret-key');
?>
```

#### 6. Docker 命令参考

```bash
# 查看日志
docker-compose logs -f onebooknav

# 进入容器
docker-compose exec onebooknav sh

# 数据库备份
docker-compose exec onebooknav mysqldump -h mysql -u onebooknav -p onebooknav > backup.sql

# 停止服务
docker-compose down

# 删除所有数据（谨慎操作）
docker-compose down -v
```

---

### 方式三：Cloudflare Workers 部署（完整支持D1数据库）

> **✅ 全面支持**：Cloudflare Workers 部署已完全实现，使用 D1 数据库作为主存储，包含完整的用户认证、JWT令牌、密码加密等功能。

Cloudflare Workers 提供边缘计算部署，具有全球CDN加速和高可用性。本项目针对 Workers 环境进行了深度优化，完美支持：

- 🔐 **完整JWT认证** - 基于Web Crypto API的安全实现
- 🔒 **PBKDF2密码加密** - 安全的密码哈希算法
- 🗄️ **D1数据库** - 完整的SQL操作和事务支持
- 📊 **完整API** - 用户、分类、书签、搜索等所有功能
- 🌐 **自动管理员** - 首次部署自动创建管理员账户

#### 1. 准备工作

```bash
# 安装 Node.js (18+) 和 Wrangler CLI
npm install -g wrangler@latest

# 登录 Cloudflare 账户
wrangler auth login

# 克隆项目到本地
git clone https://github.com/your-repo/onebooknav.git
cd onebooknav/workers
```

#### 2. 创建 D1 数据库（强烈推荐）

```bash
# 创建 D1 数据库实例
wrangler d1 create onebooknav

# 返回信息示例：
# ✅ Successfully created DB 'onebooknav' in region APAC
# Created your database using D1's new storage backend.
# Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**📝 重要提醒**：
- 记录返回的数据库 ID，需要配置到 wrangler.toml
- D1 数据库比 KV 存储更适合关系型数据
- 支持完整的 SQL 查询和事务

#### 3. 配置 wrangler.toml

编辑 `workers/wrangler.toml`，替换相应的配置：

```toml
name = "onebooknav"
main = "index.js"
compatibility_date = "2024-01-01"

# 基础环境变量
[vars]
SITE_TITLE = "我的书签导航"
SITE_URL = "https://onebooknav.your-domain.workers.dev"

# ⭐ D1 数据库绑定（强烈推荐）
[[d1_databases]]
binding = "DB"
database_name = "onebooknav"
database_id = "替换为你的数据库ID"  # 第2步获得的 Database ID

# 📦 R2 存储绑定（用于静态资源，可选）
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "onebooknav-assets"

# 🔄 KV 缓存（可选，用于缓存）
[[kv_namespaces]]
binding = "CACHE"
id = "替换为你的KV命名空间ID"

# 自定义域名配置（可选）
[[routes]]
pattern = "bookmarks.yourdomain.com/*"
zone_name = "yourdomain.com"

# 开发环境配置
[env.development]
vars = { SITE_TITLE = "OneBookNav Dev" }

[env.development.d1_databases]
binding = "DB"
database_name = "onebooknav-dev"
database_id = "替换为开发环境数据库ID"

# 生产环境配置
[env.production]
vars = { SITE_TITLE = "OneBookNav" }

[env.production.d1_databases]
binding = "DB"
database_name = "onebooknav-prod"
database_id = "替换为生产环境数据库ID"
```

#### 4. 初始化数据库表结构

```bash
# 进入 workers 目录
cd workers

# 初始化数据库表结构
wrangler d1 execute onebooknav --file=../data/schema.sql

# 或者使用 package.json 中的脚本
npm run db:init

# 验证表是否创建成功
wrangler d1 execute onebooknav --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### 5. 设置安全密钥

##### JWT_SECRET 密钥设置
**作用：**
- 用于生成和验证 JSON Web Token (JWT)
- JWT 用于用户身份验证和会话管理
- 确保用户登录状态的安全性

**生成强密钥的方法：**
- 在线生成器：访问 https://www.uuidgenerator.net/ 生成 UUID
- 命令行生成：`openssl rand -hex 32`
- 或使用任意64位随机字符串

```bash
# 设置 JWT 密钥（必须）
wrangler secret put JWT_SECRET
# 提示输入时，粘贴你的随机密钥，例如：
# abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890
```

##### DEFAULT_ADMIN_PASSWORD 密钥设置
**作用：**
- 设置系统默认管理员账户的密码
- 首次部署时会自动创建管理员账户
- 用户名默认为 "admin"（在 wrangler.toml 中配置）

```bash
# 设置管理员密码（必须）
wrangler secret put DEFAULT_ADMIN_PASSWORD
# 提示输入时，输入你的管理员密码，例如：
# MySecurePassword123!
```

**安全要求：**
- 密码最少8个字符
- 建议包含大小写字母、数字和特殊字符
- 密码将存储在 Cloudflare 安全环境中，不会出现在代码里

```bash
# 验证密钥是否设置成功
wrangler secret list
```

#### 6. 创建 R2 存储桶（可选）

如果需要存储静态资源：

```bash
# 创建 R2 存储桶
wrangler r2 bucket create onebooknav-assets

# 上传静态文件
wrangler r2 object put onebooknav-assets/css/app.css --file=../assets/css/app.css
wrangler r2 object put onebooknav-assets/js/app.js --file=../assets/js/app.js

# 上传图标和图片
wrangler r2 object put onebooknav-assets/img/logo.png --file=../assets/img/logo.png
```

#### 7. 创建 KV 命名空间（可选）

如果需要缓存功能：

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CACHE"

# 记录返回的 ID，更新到 wrangler.toml
```

#### 8. 部署到 Workers

```bash
# 安装依赖（如果有）
npm install

# 本地开发测试
wrangler dev
# 访问 http://localhost:8787 测试

# 部署到开发环境
wrangler deploy --env development

# 部署到生产环境
wrangler deploy --env production

# 查看部署日志
wrangler tail
```

#### 9. 配置自定义域名

在 Cloudflare 控制台中：

1. **Workers & Pages** → 选择你的 Worker
2. **Settings** → **Triggers**
3. **Add Custom Domain**
4. 输入你的域名（如：bookmarks.yourdomain.com）
5. 等待 DNS 验证完成

#### 10. 自动管理员账户创建

本项目支持自动创建管理员账户，无需手动操作：

**🎯 方式一：自动创建（推荐）**

项目会在首次访问时自动创建管理员账户：
- **用户名**: `admin`
- **密码**: `admin679`
- **邮箱**: `admin@example.com`

**⚠️ 安全提醒**：首次登录后请立即修改密码！

**🔧 方式二：自定义管理员信息**

在 wrangler.toml 中修改默认配置：

```toml
[vars]
DEFAULT_ADMIN_USERNAME = "你的用户名"
DEFAULT_ADMIN_PASSWORD = "你的密码"
DEFAULT_ADMIN_EMAIL = "你的邮箱"
AUTO_CREATE_ADMIN = "true"
```

**🛠️ 方式三：命令行创建**

```bash
# 创建自定义管理员用户
wrangler d1 execute onebooknav --command="
INSERT INTO users (username, email, password_hash, role, created_at, is_active)
VALUES ('admin', 'admin@example.com', 'hashed-password', 'admin', datetime('now'), 1);
"
```

#### 11. Workers 部署架构说明

**✅ 完整功能支持：**

- 🔐 **JWT 认证系统**：基于 Web Crypto API 的安全实现
- 🔒 **密码安全**：PBKDF2 + SHA-256 + 随机盐值加密
- 👥 **用户管理**：注册、登录、权限控制、用户设置
- 📊 **完整 API**：用户、分类、书签、搜索、统计、备份
- 🗄️ **D1 数据库**：完整的 SQL 操作、事务、索引支持
- 📱 **前端界面**：Bootstrap 响应式设计，PWA 支持
- 🔄 **实时同步**：即时数据更新和状态同步
- 🌐 **全球加速**：Cloudflare 边缘网络加速访问

**🎯 为什么选择 D1 数据库而非 KV 存储：**

| 对比项目 | D1 Database（✅推荐） | Workers KV（❌不推荐） |
|----------|---------------------|---------------------|
| **数据类型** | 关系型SQL数据库 | 键值存储 |
| **查询能力** | ✅ 支持复杂SQL查询 | ❌ 只能按键查询 |
| **关系查询** | ✅ 支持 JOIN、子查询 | ❌ 无关系概念 |
| **事务支持** | ✅ 完整ACID事务 | ❌ 无事务支持 |
| **数据一致性** | ✅ 强一致性 | ❌ 最终一致性 |
| **数据结构** | ✅ 表、索引、约束 | ❌ 简单键值对 |
| **适合场景** | ✅ 复杂业务应用 | ❌ 简单缓存存储 |
| **开发复杂度** | ✅ 标准SQL语法 | ❌ 需要复杂逻辑 |
| **性能** | ✅ 高效索引查询 | ❌ 大量查询效率低 |
| **推荐指数** | ⭐⭐⭐⭐⭐ | ⭐⭐ |

**💡 结论**：OneBookNav 是复杂的书签管理应用，需要用户、分类、书签之间的关系查询，D1 数据库是唯一正确的选择。

**性能和限制：**

| 资源 | 免费版限制 | 付费版限制 |
|------|------------|------------|
| **CPU 时间** | 10ms | 30秒 |
| **内存** | 128MB | 128MB |
| **请求数** | 100,000/天 | 无限制 |
| **D1 读取** | 25,000/天 | 按需付费 |
| **D1 写入** | 5,000/天 | 按需付费 |
| **存储空间** | 5GB | 按需付费 |

#### 12. 故障排除

**常见问题及解决方案：**

1. **部署失败**
   ```bash
   # 检查 wrangler.toml 配置
   wrangler validate

   # 查看详细错误信息
   wrangler deploy --compatibility-date=2024-01-01 --verbose
   ```

2. **数据库连接失败**
   ```bash
   # 验证数据库绑定
   wrangler d1 info onebooknav

   # 测试数据库连接
   wrangler d1 execute onebooknav --command="SELECT 1;"
   ```

3. **JWT 密钥问题**
   ```bash
   # 重新设置 JWT 密钥
   wrangler secret delete JWT_SECRET
   wrangler secret put JWT_SECRET
   ```

4. **静态资源加载失败**
   ```bash
   # 检查 R2 存储桶
   wrangler r2 bucket list

   # 查看文件列表
   wrangler r2 object list onebooknav-assets
   ```

#### 13. 环境变量和密钥配置详解

**🔐 必需的密钥设置：**

```bash
# 设置 JWT 密钥（必需）
wrangler secret put JWT_SECRET
# 输入: 强随机字符串，如: your-super-secure-jwt-secret-key-2024-random-string

# 验证密钥设置
wrangler secret list
```

**⚙️ 可选环境变量配置：**

在 `wrangler.toml` 的 `[vars]` 部分配置：

```toml
[vars]
# 站点基础配置
SITE_TITLE = "我的书签导航"
SITE_URL = "https://bookmarks.yourdomain.com"

# 管理员账户（首次部署自动创建）
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin679"  # 请修改为安全密码
DEFAULT_ADMIN_EMAIL = "admin@yourdomain.com"
AUTO_CREATE_ADMIN = "true"

# 功能开关
ALLOW_REGISTRATION = "true"         # 是否允许用户注册
ENABLE_API = "true"                 # 是否启用API接口
DEBUG_MODE = "false"                # 调试模式
```

**📊 密钥管理命令：**

```bash
# 查看所有已设置的密钥
wrangler secret list

# 删除密钥
wrangler secret delete JWT_SECRET

# 设置其他可选密钥（按需）
wrangler secret put ADMIN_EMAIL     # 系统管理员邮箱
wrangler secret put BACKUP_KEY      # 备份加密密钥
wrangler secret put WEBHOOK_SECRET  # Webhook 验证密钥
```

#### 14. 监控和日志

```bash
# 实时查看 Worker 日志
wrangler tail

# 查看特定函数的日志
wrangler tail --filter="POST"

# 查看错误日志
wrangler tail --filter="error"
```

**✅ 部署总结**：

Cloudflare Workers 部署现在已经完全稳定，支持以下核心功能：
- ✅ 用户注册和登录（自动管理员创建）
- ✅ 完整的书签管理（增删改查、分类、搜索）
- ✅ JWT 安全认证和密码加密
- ✅ D1 数据库完整支持
- ✅ 响应式前端界面
- ✅ PWA 支持和离线功能

**🚀 快速部署命令汇总**：

```bash
# 1. 创建数据库
wrangler d1 create onebooknav

# 2. 配置 wrangler.toml（修改数据库ID）

# 3. 初始化数据库
wrangler d1 execute onebooknav --file=../data/schema.sql

# 4. 设置 JWT 密钥
wrangler secret put JWT_SECRET

# 5. 部署应用
wrangler deploy

# 完成！访问分配的 Workers 域名即可使用
```

如遇问题，请参考上述故障排除部分或提交 Issue。

---

## 📚 数据迁移指南

OneBookNav 支持从多种书签管理系统导入数据。

### 支持的导入格式

1. **BookNav** - JSON格式导出文件
2. **OneNav** - SQL备份文件或JSON导出
3. **浏览器书签** - HTML格式书签文件
4. **自定义JSON** - 标准JSON格式

### 导入步骤

#### 方法1：通过Web界面导入

1. 登录管理员账户
2. 进入 "设置" > "数据管理"
3. 选择 "导入数据"
4. 选择文件类型和文件
5. 确认导入设置
6. 执行导入

#### 方法2：通过API导入

```bash
# 导入 BookNav 数据
curl -X POST http://your-domain.com/api/backup/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@booknav_export.json" \
  -F "type=booknav"

# 导入浏览器书签
curl -X POST http://your-domain.com/api/backup/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@bookmarks.html" \
  -F "type=browser"
```

### 数据导出

```bash
# 导出为 JSON 格式
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://your-domain.com/api/backup/export?format=json" > backup.json

# 导出为 HTML 格式
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://your-domain.com/api/backup/export?format=html" > bookmarks.html

# 导出为 CSV 格式
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://your-domain.com/api/backup/export?format=csv" > bookmarks.csv
```

---

## ⚙️ 配置详解

### 🔑 重要：默认管理员账户信息

**所有部署方式的默认管理员账户：**

| 项目 | 默认值 | 安全建议 |
|------|---------|----------|
| **用户名** | `admin` | ✅ 可保持不变 |
| **密码** | `admin679` | ⚠️ **首次登录后必须修改** |
| **邮箱** | `admin@example.com` | 🔧 建议修改为真实邮箱 |

**🚨 安全警告**：
1. **立即修改密码**：首次登录后请立即在用户设置中修改密码
2. **强密码策略**：使用包含字母、数字、特殊字符的强密码
3. **邮箱设置**：建议设置为真实邮箱以便接收通知

**修改方法**：
- **PHP/Docker部署**：通过 `.env` 文件或 `config/config.php` 修改
- **Cloudflare Workers**：通过 `wrangler.toml` 中的环境变量修改

### 主配置文件 (config/config.php)

```php
<?php
// 数据库配置
define('DB_TYPE', 'sqlite');              // 数据库类型: sqlite, mysql, pgsql
define('DB_HOST', 'localhost');           // 数据库主机
define('DB_NAME', 'onebooknav');          // 数据库名称
define('DB_USER', 'root');                // 数据库用户名
define('DB_PASS', '');                    // 数据库密码
define('DB_FILE', __DIR__ . '/../data/onebooknav.db'); // SQLite文件路径

// 站点配置
define('SITE_TITLE', 'OneBookNav');       // 站点标题
define('SITE_DESCRIPTION', 'Personal Navigation Hub'); // 站点描述
define('SITE_URL', 'http://localhost');   // 站点URL
define('ADMIN_EMAIL', 'admin@example.com'); // 管理员邮箱

// 安全配置
define('JWT_SECRET', 'your-secret-key');  // JWT密钥（必须修改）
define('SESSION_NAME', 'onebooknav_session'); // 会话名称
define('SESSION_LIFETIME', 86400 * 30);   // 会话有效期（30天）

// 功能开关
define('ALLOW_REGISTRATION', true);       // 允许用户注册
define('ENABLE_WEBDAV_BACKUP', true);     // 启用WebDAV备份
define('ENABLE_API', true);               // 启用API接口
define('ENABLE_PWA', true);               // 启用PWA功能

// WebDAV 备份配置
define('WEBDAV_ENABLED', false);          // 启用WebDAV
define('WEBDAV_URL', '');                 // WebDAV服务器URL
define('WEBDAV_USERNAME', '');            // WebDAV用户名
define('WEBDAV_PASSWORD', '');            // WebDAV密码

// 调试和开发
define('DEBUG_MODE', false);              // 调试模式
define('LOG_LEVEL', 'INFO');              // 日志级别
?>
```

## 🔗 相关链接

- **问题反馈**: 提交Issue或参与Discussions
- **功能建议**: 欢迎提出改进建议

---

**OneBookNav** - 让书签管理变得简单而强大！ 🚀

<div align="center">

**融合 BookNav 和 OneNav 最佳功能的现代化书签管理系统**

一个兼容性强、部署简单、功能完善的个人书签导航解决方案

[![License](https://img.shields.io/badge/许可证-MIT-blue.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-%3E%3D7.4-8892BF.svg)](https://php.net/)
[![Docker](https://img.shields.io/badge/Docker-支持-blue.svg)](https://docker.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

[立即开始](#快速开始) • [部署教程](#部署教程) • [功能特点](#功能特点) • [数据迁移](#数据迁移) • [常见问题](#常见问题)

</div>

---

## 🌟 功能特点

### 核心功能
- 🔐 **多用户支持** - 完善的权限管理系统（用户/管理员/超级管理员）
- 📁 **层级分类** - 无限层级的分类组织，支持拖拽排序
- 🔍 **智能搜索** - 全文搜索书签标题、URL、描述和关键词
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌙 **深色模式** - 自动适配系统主题偏好设置

### 数据兼容
- 📤 **BookNav 迁移** - 完美兼容 BookNav 数据库导入
- 📥 **OneNav 迁移** - 无损导入 OneNav 书签数据
- 🌐 **浏览器导入** - 支持所有主流浏览器书签文件
- ☁️ **WebDAV 备份** - 自动备份到云存储服务

### 先进功能
- 🎨 **拖拽排序** - 直观的书签和分类管理
- 🖱️ **右键菜单** - 便捷的快捷操作菜单
- 📊 **访问统计** - 书签点击量和使用分析
- 🔗 **死链检测** - 自动检测和标记失效链接
- 📲 **PWA 支持** - 可安装为桌面/移动应用

## 🚀 快速开始

### 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **PHP** | 7.4+ | 8.0+ |
| **数据库** | SQLite 3 | MySQL 8.0+ / PostgreSQL 12+ |
| **Web服务器** | Apache 2.4+ / Nginx 1.18+ | - |
| **磁盘空间** | 50MB | 500MB+ |
| **内存** | 128MB | 512MB+ |

### 环境检查

在安装前，请确保您的服务器满足以下要求：

```bash
# 检查 PHP 版本
php -v

# 检查必需的 PHP 扩展
php -m | grep -E "(pdo|sqlite|curl|mbstring|openssl)"
```

必需的 PHP 扩展：
- ✅ PDO（数据库连接）
- ✅ PDO_SQLite（SQLite 支持）
- ✅ cURL（网络请求）
- ✅ mbstring（多字节字符串）
- ✅ OpenSSL（加密支持）

## 📦 部署教程

OneBookNav 支持三种主要部署方式，您可以根据自己的需求选择最合适的方案：

### 方式一：传统 PHP 部署（推荐新手）

#### 步骤 1：下载源码

**方法 A：直接下载**
1. 访问 [GitHub Release 页面](https://github.com/onebooknav/onebooknav/releases)
2. 下载最新版本的 `onebooknav.zip`
3. 解压到您的网站根目录

**方法 B：Git 克隆**
```bash
git clone https://github.com/onebooknav/onebooknav.git
cd onebooknav
```

#### 步骤 2：设置文件权限

```bash
# Linux/macOS
chmod -R 755 onebooknav/
chmod -R 777 onebooknav/data/
chmod -R 777 onebooknav/config/

# Windows（右键文件夹属性设置完全控制权限）
```

#### 步骤 3：配置 Web 服务器

**Apache 配置**（通常无需额外配置，项目包含 .htaccess）
```apache
# 确保启用 mod_rewrite 模块
LoadModule rewrite_module modules/mod_rewrite.so

# 虚拟主机配置示例
<VirtualHost *:80>
    ServerName bookmarks.example.com
    DocumentRoot /var/www/onebooknav

    <Directory /var/www/onebooknav>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Nginx 配置**
```nginx
server {
    listen 80;
    server_name bookmarks.example.com;
    root /var/www/onebooknav;
    index index.php;

    # 主要路由
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API 路由
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }

    # PHP 处理
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # 拒绝访问敏感文件
    location ~ /(config|includes|data)/ {
        deny all;
    }
}
```

#### 步骤 4：Web 安装

1. 在浏览器中访问 `http://your-domain.com/install.php`
2. 按照安装向导完成配置：
   - **环境检查** - 自动检测服务器环境
   - **数据库配置** - 选择 SQLite（推荐）或 MySQL/PostgreSQL
   - **管理员账户** - 创建超级管理员用户
   - **完成安装** - 系统自动配置

#### 步骤 5：安全设置

```bash
# 删除安装文件（重要！）
rm install.php

# 设置更严格的权限
chmod 644 config/config.php
chmod -R 755 data/
```

### 方式二：Docker 容器部署（推荐服务器）

#### 步骤 1：安装 Docker

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# CentOS/RHEL
sudo yum install docker docker-compose

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

#### 步骤 2：下载 docker-compose.yml

```bash
# 下载配置文件
curl -O https://raw.githubusercontent.com/onebooknav/onebooknav/main/docker-compose.yml

# 或者手动创建
mkdir onebooknav-docker && cd onebooknav-docker
```

#### 步骤 3：配置环境

**基础配置（SQLite）**
```yaml
# docker-compose.yml
version: '3.8'
services:
  onebooknav:
    image: onebooknav:latest
    container_name: onebooknav
    restart: unless-stopped
    ports:
      - "3080:80"
    volumes:
      - onebooknav_data:/var/www/html/data
    environment:
      - SITE_TITLE=我的书签导航
      - SITE_URL=http://localhost:3080

volumes:
  onebooknav_data:
```

**生产环境配置（MySQL + Redis）**
```yaml
version: '3.8'
services:
  onebooknav:
    image: onebooknav:latest
    container_name: onebooknav
    restart: unless-stopped
    ports:
      - "3080:80"
    volumes:
      - onebooknav_data:/var/www/html/data
    environment:
      - SITE_TITLE=我的书签导航
      - DB_TYPE=mysql
      - DB_HOST=mysql
      - DB_NAME=onebooknav
      - DB_USER=onebooknav
      - DB_PASS=secure_password
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    container_name: onebooknav_mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=onebooknav
      - MYSQL_USER=onebooknav
      - MYSQL_PASSWORD=secure_password
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: onebooknav_redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  onebooknav_data:
  mysql_data:
  redis_data:
```

#### 步骤 4：启动服务

```bash
# 基础部署
docker-compose up -d

# 生产环境部署
docker-compose --profile with-mysql --profile with-cache up -d

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

#### 步骤 5：访问应用

访问 `http://localhost:3080` 完成初始设置。

### 方式三：Cloudflare Workers 部署（推荐全球用户）

#### 步骤 1：准备环境

```bash
# 安装 Node.js 和 npm
# 下载地址：https://nodejs.org/

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

#### 步骤 2：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create onebooknav

# 记录数据库 ID（用于配置）
```

#### 步骤 3：创建 R2 存储桶

```bash
# 创建存储桶
wrangler r2 bucket create onebooknav-assets
```

#### 步骤 4：配置项目

编辑 `workers/wrangler.toml`：
```toml
name = "onebooknav"
main = "index.js"
compatibility_date = "2024-01-01"

[vars]
SITE_TITLE = "我的书签导航"
SITE_URL = "https://onebooknav.your-domain.workers.dev"

[[d1_databases]]
binding = "DB"
database_name = "onebooknav"
database_id = "your-database-id"  # 替换为实际的数据库 ID

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "onebooknav-assets"

# 自定义域名（可选）
[[routes]]
pattern = "bookmarks.example.com/*"
zone_name = "example.com"
```

#### 步骤 5：初始化数据库

```bash
cd workers/

# 初始化数据库表结构
wrangler d1 execute onebooknav --file=../data/schema.sql

# 设置 JWT 密钥
wrangler secret put JWT_SECRET
# 输入一个安全的随机字符串
```

#### 步骤 6：部署应用

```bash
# 安装依赖
npm install

# 部署到开发环境
wrangler deploy --env development

# 部署到生产环境
wrangler deploy --env production

# 查看部署日志
wrangler tail
```

#### 步骤 7：上传静态资源

```bash
# 上传 CSS、JS 等静态文件到 R2
wrangler r2 object put onebooknav-assets/css/app.css --file=../assets/css/app.css
wrangler r2 object put onebooknav-assets/js/app.js --file=../assets/js/app.js
```

## 🔄 数据迁移

OneBookNav 提供完善的数据迁移功能，支持从多种来源导入书签数据。

### 从 BookNav 迁移

#### 方法 1：数据库文件导入

1. **备份 BookNav 数据**
   ```bash
   # 找到 BookNav 的数据库文件（通常在 data 目录）
   cp /path/to/booknav/data/app.db ./booknav_backup.db
   ```

2. **导入到 OneBookNav**
   - 登录 OneBookNav 管理员账户
   - 进入"设置" → "备份与导入"
   - 选择"导入"标签
   - 选择"BookNav 数据库"格式
   - 上传 `booknav_backup.db` 文件
   - 点击"导入数据"

#### 方法 2：数据导出导入

1. **从 BookNav 导出**
   - 在 BookNav 中使用导出功能
   - 选择导出为 JSON 格式

2. **导入到 OneBookNav**
   - 选择"BookNav JSON"格式导入

#### 迁移结果

✅ **完整保留的数据：**
- 用户账户和权限设置
- 完整的分类层级结构
- 书签信息（标题、URL、描述、关键词）
- 书签图标和分类图标
- 私有书签和分类设置
- 访问统计数据

### 从 OneNav 迁移

#### 数据库文件迁移

1. **备份 OneNav 数据**
   ```bash
   # OneNav 的数据库通常位于
   cp /path/to/onenav/data/config.db ./onenav_backup.db
   ```

2. **导入到 OneBookNav**
   - 在导入界面选择"OneNav 数据库"
   - 上传 `onenav_backup.db` 文件
   - 系统会自动转换数据结构

#### 数据转换说明

- 🔄 **单用户转多用户**：OneNav 的单用户数据会迁移到指定用户账户下
- 📁 **分类结构保持**：完整保留原有的分类组织
- 🔗 **书签信息完整**：包括图标、描述、关键词等
- 🔒 **私有设置保留**：原有的私有链接设置会保持

### 从浏览器导入

支持导入标准的浏览器书签 HTML 文件：

#### 导出浏览器书签

**Chrome/Edge:**
1. 点击菜单 → 书签 → 书签管理器
2. 点击"导出书签"
3. 保存为 HTML 文件

**Firefox:**
1. 点击菜单 → 书签 → 管理书签
2. 导入和备份 → 导出书签为 HTML

**Safari:**
1. 文件 → 导出书签
2. 选择保存位置

#### 导入到 OneBookNav

1. 在导入界面选择"浏览器书签 HTML"
2. 上传导出的 HTML 文件
3. 系统会自动解析文件夹结构和书签

### 数据导出

OneBookNav 支持多种格式的数据导出：

#### 导出格式

| 格式 | 用途 | 特点 |
|------|------|------|
| **OneBookNav JSON** | 完整备份 | 包含所有数据和设置 |
| **书签 HTML** | 浏览器导入 | 标准浏览器兼容格式 |
| **CSV** | 表格处理 | 便于 Excel 等工具处理 |
| **JSON** | API 集成 | 便于程序化处理 |

#### 导出操作

1. 进入"备份与导出"界面
2. 选择导出格式
3. 选择是否包含私有书签
4. 点击"导出数据"下载文件

## 🛠️ 高级配置

### 数据库配置

#### SQLite 配置（默认推荐）
```php
// config/config.php
define('DB_TYPE', 'sqlite');
define('DB_FILE', __DIR__ . '/../data/onebooknav.db');
```

**优点：**
- ✅ 无需额外数据库服务
- ✅ 部署简单
- ✅ 适合个人和小团队使用
- ✅ 自动备份简单

#### MySQL 配置
```php
define('DB_TYPE', 'mysql');
define('DB_HOST', 'localhost');
define('DB_NAME', 'onebooknav');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_PORT', '3306');
```

**优点：**
- ✅ 高并发性能好
- ✅ 适合多用户环境
- ✅ 丰富的管理工具
- ✅ 支持主从复制

#### PostgreSQL 配置
```php
define('DB_TYPE', 'pgsql');
define('DB_HOST', 'localhost');
define('DB_NAME', 'onebooknav');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_PORT', '5432');
```

### WebDAV 备份配置

#### 支持的 WebDAV 服务

| 服务商 | 配置示例 | 特点 |
|--------|----------|------|
| **Nextcloud** | `https://cloud.example.com/remote.php/dav/files/username/` | 开源私有云 |
| **ownCloud** | `https://cloud.example.com/remote.php/webdav/` | 企业文件同步 |
| **坚果云** | `https://dav.jianguoyun.com/dav/` | 国内同步服务 |
| **Box** | `https://dav.box.com/dav/` | 企业级存储 |

#### 配置示例

```php
// 启用 WebDAV 备份
define('WEBDAV_ENABLED', true);
define('WEBDAV_URL', 'https://your-webdav-server.com/remote.php/dav/files/username/onebooknav/');
define('WEBDAV_USERNAME', 'your_username');
define('WEBDAV_PASSWORD', 'your_app_password');
define('WEBDAV_AUTO_BACKUP', true);  // 自动备份
```

#### 备份策略

```php
// 备份设置
define('BACKUP_MAX_FILES', 10);         // 保留最近 10 个备份
define('AUTO_BACKUP_ENABLED', true);    // 启用自动备份
define('AUTO_BACKUP_INTERVAL', 86400);  // 每天备份一次
```

### 缓存配置

#### 文件缓存（默认）
```php
define('CACHE_ENABLED', true);
define('CACHE_TYPE', 'file');
define('CACHE_PATH', __DIR__ . '/../data/cache/');
define('CACHE_TTL', 3600);  // 1小时
```

#### Redis 缓存（推荐生产环境）
```php
define('CACHE_TYPE', 'redis');
define('CACHE_HOST', 'localhost');
define('CACHE_PORT', 6379);
define('CACHE_PASSWORD', '');  // 如果有密码
define('CACHE_DATABASE', 0);
```

### 安全配置

#### JWT 设置
```php
// 生成安全的密钥
define('JWT_SECRET', bin2hex(random_bytes(32)));
define('JWT_EXPIRY', 86400 * 7);  // 7天过期
```

#### 会话安全
```php
define('SESSION_LIFETIME', 86400 * 30);  // 30天
define('SESSION_SECURE', true);          // HTTPS only
define('SESSION_HTTPONLY', true);        // 防止 XSS
```

#### 文件上传安全
```php
define('UPLOAD_MAX_SIZE', 1024 * 1024 * 5);  // 5MB
define('ALLOWED_ICON_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico']);
```

## 🎨 界面定制

### 主题配置

OneBookNav 支持多种主题和自定义样式：

#### 内置主题
- **默认主题** - 现代简洁风格
- **深色主题** - 护眼深色界面
- **紧凑主题** - 信息密度较高的布局

#### 自定义 CSS
```css
/* 在 assets/css/custom.css 中添加自定义样式 */
:root {
    --primary-color: #007bff;      /* 主色调 */
    --secondary-color: #6c757d;    /* 辅助色 */
    --success-color: #28a745;      /* 成功色 */
    --danger-color: #dc3545;       /* 危险色 */
    --border-radius: 0.375rem;     /* 圆角大小 */
}

/* 自定义书签卡片样式 */
.bookmark-card {
    border-radius: var(--border-radius);
    transition: transform 0.2s ease;
}

.bookmark-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
```

### Logo 和图标

```php
// 在 config/config.php 中设置
define('SITE_LOGO', '/assets/img/logo.png');
define('SITE_ICON', '/assets/img/favicon.ico');
```

## 📊 性能优化

### 数据库优化

#### SQLite 优化
```sql
-- 添加索引优化查询性能
CREATE INDEX idx_bookmarks_user_category ON bookmarks(user_id, category_id);
CREATE INDEX idx_bookmarks_url ON bookmarks(url);
CREATE INDEX idx_categories_user_parent ON categories(user_id, parent_id);
CREATE INDEX idx_bookmarks_search ON bookmarks(title, description, keywords);
```

#### MySQL 优化
```sql
-- 配置 my.cnf
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
query_cache_size = 64M
```

### Web 服务器优化

#### Apache 优化
```apache
# .htaccess 中启用压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# 启用缓存
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
</IfModule>
```

#### Nginx 优化
```nginx
# 启用 Gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/css application/javascript application/json image/svg+xml;

# 设置缓存头
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### PHP 优化

#### OPcache 配置
```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=4000
opcache.revalidate_freq=2
```

#### 内存优化
```ini
memory_limit = 256M
max_execution_time = 300
max_input_time = 300
upload_max_filesize = 50M
post_max_size = 50M
```

## 🚨 Cloudflare Workers 部署错误解决方案

### 错误1：Missing entry-point to Worker script

**错误信息：**
```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

**根本原因：**
命令在项目根目录执行了 `npx wrangler deploy`，但 wrangler 配置和入口文件在 `workers/` 子目录中。

### 错误2：Invalid database_id configuration

**错误信息：**
```
✘ [ERROR] You must use a real database in the database_id configuration.
```

**根本原因：**
wrangler.toml 中的 `database_id` 字段仍然是占位符，需要替换为真实的数据库 ID。

**项目结构分析：**
- **主项目**：PHP 应用，入口文件是 `index.php`
- **Workers 子项目**：在 `workers/` 目录中，包含完整的配置和代码

**解决方案：**

#### 方案1（推荐）：使用现有 workers 配置
```bash
# 进入 workers 目录
cd onebooknav/workers

# 部署
wrangler deploy
```

#### 方案2：在根目录创建配置文件
如果必须在根目录执行，可以创建根目录的 `wrangler.toml`：
```toml
name = "onebooknav"
main = "workers/index.js"
compatibility_date = "2024-01-01"

[vars]
SITE_TITLE = "OneBookNav"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@example.com"
AUTO_CREATE_ADMIN = "true"

[[d1_databases]]
binding = "DB"
database_name = "onebooknav"
database_id = "your-database-id"
```

**完整部署步骤：**
```bash
# 1. 进入 workers 目录
cd onebooknav/workers

# 2. 创建 D1 数据库
wrangler d1 create onebooknav

# 3. 复制返回的数据库 ID，更新 wrangler.toml 中的 database_id
# 将 "YOUR_DATABASE_ID_HERE" 替换为实际的数据库 ID

# 4. 初始化数据库结构
wrangler d1 execute onebooknav --file=../data/schema.sql

# 5. 设置密钥
wrangler secret put JWT_SECRET          # 64位随机字符串
wrangler secret put DEFAULT_ADMIN_PASSWORD  # 管理员密码

# 6. 部署
wrangler deploy
```

### 密钥设置详解

#### JWT_SECRET 密钥
- **作用**：JWT 身份验证和会话管理
- **生成方法**：
  - 在线生成：https://www.uuidgenerator.net/
  - 命令行：`openssl rand -hex 32`
  - 64位随机字符串

#### DEFAULT_ADMIN_PASSWORD 密钥
- **作用**：默认管理员账户密码
- **要求**：最少8字符，包含大小写字母、数字、特殊字符
- **用户名**：默认为 `admin`

### 🎯 一键部署脚本

为了简化部署过程，我们提供了自动化部署脚本：

**Linux/macOS:**
```bash
cd onebooknav/workers
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```cmd
cd onebooknav\workers
deploy.bat
```

**脚本功能：**
- ✅ 自动创建 D1 数据库
- ✅ 自动更新配置文件中的数据库 ID
- ✅ 自动初始化数据库结构
- ✅ 引导设置安全密钥
- ✅ 自动部署到 Cloudflare Workers

使用脚本部署完成后，访问显示的 Workers 域名，用 `admin` 和你设置的密码登录管理后台。

## 🔧 常见问题

### 安装问题

#### Q: 安装时提示"权限不足"错误
**A:** 需要设置正确的文件权限：
```bash
# Linux/macOS
chmod -R 755 onebooknav/
chmod -R 777 onebooknav/data/
chmod -R 777 onebooknav/config/

# 如果仍有问题，可以临时设置：
chmod -R 777 onebooknav/
# 安装完成后再调整为安全权限
```

#### Q: 访问 install.php 显示 404 错误
**A:** 检查 Web 服务器配置：
- **Apache**: 确保启用了 `mod_rewrite` 模块
- **Nginx**: 检查 `try_files` 配置是否正确
- 确保项目文件位于 Web 根目录

#### Q: 数据库连接失败
**A:** 检查数据库配置：
```bash
# 检查 SQLite 权限
ls -la data/
chmod 777 data/

# 检查 MySQL 连接
mysql -u username -p -h localhost -e "SHOW DATABASES;"

# 查看错误日志
tail -f data/logs/error.log
```

### 使用问题

#### Q: 导入 BookNav/OneNav 数据失败
**A:** 常见解决方案：
1. **检查文件格式**：确保是正确的数据库文件
2. **检查文件权限**：`chmod 644 backup_file.db`
3. **检查文件大小**：可能需要调整 PHP `upload_max_filesize`
4. **查看错误日志**：`tail -f data/logs/error.log`

#### Q: WebDAV 备份连接失败
**A:** 检查配置：
1. **URL 格式**：确保以 `/` 结尾
2. **认证信息**：使用应用专用密码（如 Nextcloud）
3. **网络连接**：测试服务器能否访问 WebDAV 地址
4. **SSL 证书**：如果是自签名证书，可能需要特殊配置

#### Q: 书签图标无法显示
**A:** 可能的原因：
1. **防盗链**：目标网站禁止外链图片
2. **HTTPS 混合内容**：HTTPS 站点访问 HTTP 图片
3. **网络问题**：无法访问目标网站

### 性能问题

#### Q: 页面加载缓慢
**A:** 优化建议：
1. **启用缓存**：配置 Redis 或文件缓存
2. **数据库优化**：添加索引，优化查询
3. **静态资源**：启用 CDN 和压缩
4. **服务器配置**：调整 PHP 和数据库内存限制

#### Q: 大量书签时操作卡顿
**A:** 解决方案：
1. **分页加载**：在设置中调整每页显示数量
2. **搜索过滤**：使用搜索功能快速定位
3. **分类整理**：合理组织分类结构
4. **定期清理**：删除无用的死链

### Docker 问题

#### Q: Docker 容器无法启动
**A:** 检查步骤：
```bash
# 查看容器日志
docker-compose logs -f

# 检查端口占用
sudo netstat -tlnp | grep :3080

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

#### Q: 数据持久化问题
**A:** 确保卷挂载正确：
```yaml
volumes:
  - onebooknav_data:/var/www/html/data  # 确保路径正确
```

### 更新问题

#### Q: 如何安全更新 OneBookNav？
**A:** 更新步骤：
1. **备份数据**：使用内置备份功能
2. **备份文件**：复制整个项目目录
3. **下载新版本**：覆盖除 `config/` 和 `data/` 外的文件
4. **运行更新**：访问 `/update.php`（如果有）
5. **测试功能**：确认所有功能正常

### 🔒 安全相关问题

#### Q: 默认管理员账户安全吗？
**A:** 默认账户仅用于首次设置：
- **立即修改密码**：登录后第一件事就是修改密码
- **禁用自动创建**：生产环境建议设置 `AUTO_CREATE_ADMIN=false`
- **强密码策略**：使用包含大小写字母、数字、特殊字符的12位以上密码
- **定期更换**：建议每3-6个月更换一次密码

#### Q: JWT密钥如何设置才安全？
**A:** JWT密钥安全设置：
```bash
# 生成安全的随机密钥（推荐方法）
openssl rand -base64 64

# 或使用在线工具生成128位随机字符串
# 确保密钥长度至少32字符，包含字母数字特殊字符
```

#### Q: 如何防止恶意访问？
**A:** 安全防护措施：
1. **访问控制**：配置防火墙限制访问IP
2. **HTTPS部署**：使用SSL证书加密传输
3. **定期备份**：设置自动备份到安全位置
4. **监控日志**：定期检查访问日志异常
5. **更新及时**：及时更新到最新版本

## 🤝 社区支持

### 获取帮助

- 📖 **使用文档**: [GitHub Wiki](https://github.com/onebooknav/onebooknav/wiki)
- 🐛 **报告问题**: [GitHub Issues](https://github.com/onebooknav/onebooknav/issues)
- 💬 **讨论交流**: [GitHub Discussions](https://github.com/onebooknav/onebooknav/discussions)
- 📧 **邮件支持**: support@onebooknav.com

### 贡献代码

欢迎参与 OneBookNav 的开发！

#### 贡献方式
1. **Fork** 本项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 **Pull Request**

#### 开发规范
- **PHP**: 遵循 PSR-12 编码标准
- **JavaScript**: 使用 ES6+ 语法
- **CSS**: 使用 BEM 命名规范
- **提交信息**: 遵循 Conventional Commits

### 反馈建议

如果您有任何建议或发现了问题，请：

1. **搜索现有 Issues** - 避免重复提交
2. **详细描述问题** - 包含错误信息、环境信息
3. **提供复现步骤** - 帮助我们快速定位问题
4. **建议解决方案** - 如果您有想法请分享

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 详见 LICENSE 文件。

### 开源协议说明

- ✅ **商业使用** - 可用于商业项目
- ✅ **修改分发** - 可以修改并分发
- ✅ **私人使用** - 可以私人使用
- ✅ **专利使用** - 包含专利授权
- ❗ **责任限制** - 不承担使用风险
- ❗ **无担保** - 不提供任何担保

## 🙏 致谢

感谢以下优秀的开源项目和贡献者：

### 核心项目
- **[BookNav](https://github.com/bookmark-nav)** - 提供了多用户架构设计灵感
- **[OneNav](https://github.com/helloxz/onenav)** - 提供了简洁实用的功能设计

### 技术框架
- **[Bootstrap](https://getbootstrap.com/)** - 现代响应式 UI 框架
- **[Font Awesome](https://fontawesome.com/)** - 丰富的图标库
- **[Sortable.js](https://github.com/SortableJS/Sortable)** - 拖拽排序功能

### 部署技术
- **[Docker](https://www.docker.com/)** - 容器化部署支持
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - 边缘计算平台

---

<div align="center">

**如果 OneBookNav 对您有帮助，请给我们一个 ⭐ Star！**

Made with ❤️ by OneBookNav Team | [官网](https://onebooknav.com) | [文档](https://docs.onebooknav.com)

</div>