<?php
/**
 * OneBookNav Deployment Test
 * Simple test to verify the system is working
 */

echo "<!DOCTYPE html>\n";
echo "<html>\n<head>\n";
echo "<title>OneBookNav Deployment Test</title>\n";
echo "<meta charset='UTF-8'>\n";
echo "<style>body{font-family:Arial,sans-serif;margin:40px;} .ok{color:green;} .error{color:red;}</style>\n";
echo "</head>\n<body>\n";
echo "<h1>OneBookNav Deployment Test</h1>\n";

$errors = [];
$warnings = [];

// Test 1: Check PHP version
echo "<h2>1. PHP Version Check</h2>\n";
$phpVersion = phpversion();
if (version_compare($phpVersion, '7.4', '>=')) {
    echo "<p class='ok'>✓ PHP Version: $phpVersion (OK)</p>\n";
} else {
    echo "<p class='error'>✗ PHP Version: $phpVersion (需要 7.4+)</p>\n";
    $errors[] = "PHP版本过低";
}

// Test 2: Check required extensions
echo "<h2>2. PHP Extensions</h2>\n";
$required_extensions = ['pdo', 'json', 'mbstring', 'openssl', 'curl'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p class='ok'>✓ $ext extension loaded</p>\n";
    } else {
        echo "<p class='error'>✗ $ext extension missing</p>\n";
        $errors[] = "缺少 $ext 扩展";
    }
}

// Test 3: Check config file
echo "<h2>3. Configuration</h2>\n";
if (file_exists(__DIR__ . '/config/config.php')) {
    echo "<p class='ok'>✓ Config file exists</p>\n";
    require_once __DIR__ . '/config/config.php';

    if (defined('DB_TYPE')) {
        echo "<p class='ok'>✓ Database configuration loaded</p>\n";
    } else {
        echo "<p class='error'>✗ Database configuration not found</p>\n";
        $errors[] = "数据库配置错误";
    }
} else {
    echo "<p class='error'>✗ Config file missing (需要先运行安装)</p>\n";
    $errors[] = "配置文件不存在";
}

// Test 4: Check directories
echo "<h2>4. Directory Permissions</h2>\n";
$dirs = ['data', 'data/logs', 'data/cache', 'data/backups', 'data/uploads'];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (is_dir($path)) {
        if (is_writable($path)) {
            echo "<p class='ok'>✓ Directory $dir is writable</p>\n";
        } else {
            echo "<p class='error'>✗ Directory $dir is not writable</p>\n";
            $errors[] = "目录 $dir 不可写";
        }
    } else {
        echo "<p class='error'>✗ Directory $dir does not exist</p>\n";
        $errors[] = "目录 $dir 不存在";
    }
}

// Test 5: Database connection (if config exists)
if (defined('DB_TYPE')) {
    echo "<h2>5. Database Connection</h2>\n";
    try {
        require_once __DIR__ . '/includes/Database.php';
        $db = Database::getInstance();
        echo "<p class='ok'>✓ Database connection successful</p>\n";

        // Test basic query
        $result = $db->fetchOne("SELECT COUNT(*) FROM users");
        echo "<p class='ok'>✓ Database query test successful (Users: $result)</p>\n";
    } catch (Exception $e) {
        echo "<p class='error'>✗ Database connection failed: " . htmlspecialchars($e->getMessage()) . "</p>\n";
        $errors[] = "数据库连接失败";
    }
}

// Summary
echo "<h2>Test Summary</h2>\n";
if (empty($errors)) {
    echo "<p class='ok'><strong>✓ All tests passed! OneBookNav is ready to use.</strong></p>\n";
    echo "<p><a href='index.php'>Go to OneBookNav</a></p>\n";
} else {
    echo "<p class='error'><strong>✗ Found " . count($errors) . " error(s):</strong></p>\n";
    echo "<ul>\n";
    foreach ($errors as $error) {
        echo "<li class='error'>$error</li>\n";
    }
    echo "</ul>\n";
    echo "<p>Please fix these issues before using OneBookNav.</p>\n";
}

if (!empty($warnings)) {
    echo "<h3>Warnings</h3>\n";
    echo "<ul>\n";
    foreach ($warnings as $warning) {
        echo "<li style='color:orange;'>$warning</li>\n";
    }
    echo "</ul>\n";
}

echo "</body>\n</html>\n";
?>