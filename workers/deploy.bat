@echo off
setlocal enabledelayedexpansion

REM OneBookNav Cloudflare Workers 部署脚本 (Windows)
REM 这个脚本将帮助您自动设置和部署 OneBookNav 到 Cloudflare Workers

echo 🚀 OneBookNav Cloudflare Workers 部署脚本
echo ==========================================

REM 检查 wrangler 是否安装
wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: wrangler CLI 未安装
    echo 请运行: npm install -g wrangler
    pause
    exit /b 1
)

REM 检查是否已登录
wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未登录 Cloudflare
    echo 请运行: wrangler auth login
    pause
    exit /b 1
)

echo ✅ wrangler CLI 已安装并已登录

REM 步骤 1: 创建数据库
echo.
echo 📍 步骤 1: 创建 D1 数据库
echo 正在创建数据库 'onebooknav'...

wrangler d1 create onebooknav > temp_db_output.txt 2>&1
set db_create_result=%errorlevel%

findstr /C:"already exists" temp_db_output.txt >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  数据库 'onebooknav' 已存在
    for /f "tokens=2" %%i in ('wrangler d1 list ^| findstr "onebooknav"') do set DB_ID=%%i
) else (
    for /f "tokens=*" %%i in ('findstr "database_id" temp_db_output.txt') do (
        set line=%%i
        for /f "tokens=3 delims= " %%j in ("!line!") do (
            set DB_ID=%%j
            set DB_ID=!DB_ID:"=!
        )
    )
    echo ✅ 数据库创建成功!
)

del temp_db_output.txt

if "%DB_ID%"=="" (
    echo ❌ 错误: 无法获取数据库 ID
    echo 请手动运行: wrangler d1 create onebooknav
    pause
    exit /b 1
)

echo 📋 数据库 ID: %DB_ID%

REM 步骤 2: 更新配置文件
echo.
echo 📍 步骤 2: 更新配置文件

if exist "wrangler.toml" (
    powershell -Command "(Get-Content 'wrangler.toml') -replace 'YOUR_DATABASE_ID_HERE', '%DB_ID%' | Set-Content 'wrangler.toml'"
    echo ✅ 已更新 wrangler.toml
) else (
    echo ❌ 错误: 找不到 wrangler.toml 文件
    pause
    exit /b 1
)

REM 步骤 3: 初始化数据库
echo.
echo 📍 步骤 3: 初始化数据库结构

if exist "..\data\schema.sql" (
    wrangler d1 execute onebooknav --file=../data/schema.sql
    echo ✅ 数据库结构初始化完成
) else (
    echo ⚠️  警告: 找不到 schema.sql，跳过数据库初始化
)

REM 步骤 4: 设置密钥
echo.
echo 📍 步骤 4: 设置安全密钥

wrangler secret list 2>nul | findstr "JWT_SECRET" >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 请设置 JWT_SECRET（用于身份验证）
    echo 建议使用 64 位随机字符串，例如：
    echo abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890
    echo.
    wrangler secret put JWT_SECRET
    echo ✅ JWT_SECRET 设置完成
) else (
    echo ✅ JWT_SECRET 已存在
)

wrangler secret list 2>nul | findstr "DEFAULT_ADMIN_PASSWORD" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo 🔐 请设置管理员密码
    echo 要求: 至少 8 个字符，建议包含大小写字母、数字和特殊字符
    echo.
    wrangler secret put DEFAULT_ADMIN_PASSWORD
    echo ✅ DEFAULT_ADMIN_PASSWORD 设置完成
) else (
    echo ✅ DEFAULT_ADMIN_PASSWORD 已存在
)

REM 步骤 5: 部署
echo.
echo 📍 步骤 5: 部署到 Cloudflare Workers

wrangler deploy

echo.
echo 🎉 部署完成!
echo.
echo 📋 部署信息:
echo    - 数据库 ID: %DB_ID%
echo    - 管理员用户名: admin
echo    - 管理员密码: 您刚才设置的密码
echo.
echo 🌐 访问您的应用程序并使用管理员账户登录
echo.
echo 📝 提示:
echo    - 查看日志: wrangler tail
echo    - 查看数据库: wrangler d1 execute onebooknav --command="SELECT * FROM users"
echo    - 本地开发: wrangler dev

pause