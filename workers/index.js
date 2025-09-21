/**
 * OneBookNav Cloudflare Workers Implementation
 * Edge computing version with D1 Database and R2 Storage
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main request handler
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize database if needed
      await initializeDatabase(env.DB);

      // Route the request
      const response = await handleRequest(request, env);

      // Add CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ success: false, error: 'Internal server error' }, 500);
    }
  }
};

/**
 * Handle incoming requests
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Serve static assets from R2
  if (path.startsWith('/assets/') || path.match(/\.(css|js|png|jpg|svg|ico)$/)) {
    return serveStaticAsset(path, env.STORAGE);
  }

  // API routes
  if (path.startsWith('/api/')) {
    return handleAPI(request, env);
  }

  // Main application
  if (path === '/' || path === '/index.html') {
    return serveHTML(env);
  }

  // PWA files
  if (path === '/manifest.json') {
    return serveManifest(env);
  }

  if (path === '/sw.js') {
    return serveServiceWorker(env);
  }

  // Installation page
  if (path === '/install.php') {
    return serveInstallPage(env);
  }

  // 404
  return new Response('Not Found', { status: 404 });
}

/**
 * Initialize database tables
 */
async function initializeDatabase(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      avatar_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      is_active INTEGER DEFAULT 1,
      settings TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      user_id INTEGER NOT NULL,
      icon TEXT,
      color TEXT,
      weight INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      keywords TEXT,
      icon_url TEXT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      weight INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      last_checked TEXT,
      status_code INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type TEXT DEFAULT 'string',
      is_public INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      payload TEXT,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ];

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_user_category ON bookmarks(user_id, category_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)',
    'CREATE INDEX IF NOT EXISTS idx_categories_user_parent ON categories(user_id, parent_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key)'
  ];

  try {
    // Create tables
    for (const sql of tables) {
      await db.prepare(sql).run();
    }

    // Create indexes
    for (const sql of indexes) {
      await db.prepare(sql).run();
    }

    // Insert default settings if not exists
    const settingsCount = await db.prepare('SELECT COUNT(*) as count FROM settings').first();
    if (settingsCount.count === 0) {
      const defaultSettings = [
        ['site_title', 'OneBookNav', 'string', 1],
        ['site_description', 'Personal bookmark management system', 'string', 1],
        ['site_keywords', 'bookmarks, navigation, links', 'string', 1],
        ['allow_registration', '1', 'boolean', 1],
        ['default_theme', 'default', 'string', 1],
        ['version', '1.0.0', 'string', 1]
      ];

      for (const [key, value, type, isPublic] of defaultSettings) {
        await db.prepare('INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)')
          .bind(key, value, type, isPublic).run();
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

/**
 * Handle API requests
 */
async function handleAPI(request, env) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const endpoint = pathSegments[1]; // Remove 'api' prefix

  switch (endpoint) {
    case 'auth':
      return handleAuth(request, env);
    case 'categories':
      return handleCategories(request, env);
    case 'bookmarks':
      return handleBookmarks(request, env);
    case 'search':
      return handleSearch(request, env);
    case 'stats':
      return handleStats(request, env);
    case 'settings':
      return handleSettings(request, env);
    case 'admin':
      return handleAdmin(request, env);
    default:
      return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);
  }
}

/**
 * Handle authentication endpoints
 */
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const action = pathSegments[2];

  switch (request.method) {
    case 'POST':
      switch (action) {
        case 'login':
          return handleLogin(request, env);
        case 'register':
          return handleRegister(request, env);
        case 'logout':
          return handleLogout(request, env);
        default:
          return jsonResponse({ success: false, error: 'Auth endpoint not found' }, 404);
      }
    case 'GET':
      switch (action) {
        case 'user':
          return handleGetCurrentUser(request, env);
        case 'check':
          return handleCheckAuth(request, env);
        default:
          return jsonResponse({ success: false, error: 'Auth endpoint not found' }, 404);
      }
    default:
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
}

/**
 * Handle login
 */
async function handleLogin(request, env) {
  try {
    const data = await request.json();
    const { username, password, remember_me } = data;

    if (!username || !password) {
      return jsonResponse({ success: false, error: 'Username and password required' }, 400);
    }

    // Find user
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .bind(username, username).first();

    if (!user) {
      return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password (Note: In real implementation, use proper password hashing)
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Update last login
    await env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?')
      .bind(user.id).run();

    // Generate JWT token
    const token = await generateJWT(user, env.JWT_SECRET);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ success: false, error: 'Login failed' }, 500);
  }
}

/**
 * Handle categories endpoint
 */
async function handleCategories(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  switch (request.method) {
    case 'GET':
      const categories = await env.DB.prepare(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY parent_id, weight, name'
      ).bind(user.id).all();
      return jsonResponse({ success: true, data: categories.results });

    case 'POST':
      const data = await request.json();
      const { name, parent_id, icon, color, is_private } = data;

      const result = await env.DB.prepare(
        'INSERT INTO categories (name, parent_id, user_id, icon, color, is_private) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(name, parent_id, user.id, icon, color, is_private ? 1 : 0).run();

      return jsonResponse({ success: true, data: { id: result.meta.last_row_id } });

    default:
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
}

/**
 * Handle bookmarks endpoint
 */
async function handleBookmarks(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  switch (request.method) {
    case 'GET':
      const bookmarks = await env.DB.prepare(
        'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY weight, title'
      ).bind(user.id).all();
      return jsonResponse({ success: true, data: bookmarks.results });

    case 'POST':
      const data = await request.json();
      const { title, url, category_id, description, keywords, is_private } = data;

      const result = await env.DB.prepare(
        'INSERT INTO bookmarks (title, url, category_id, user_id, description, keywords, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(title, url, category_id, user.id, description, keywords, is_private ? 1 : 0).run();

      return jsonResponse({ success: true, data: { id: result.meta.last_row_id } });

    default:
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
}

/**
 * Serve static assets from R2
 */
async function serveStaticAsset(path, storage) {
  try {
    const object = await storage.get(path.substring(1)); // Remove leading slash
    if (object === null) {
      return new Response('Asset not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', getContentType(path));
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response('Asset not found', { status: 404 });
  }
}

/**
 * Serve main HTML application
 */
async function serveHTML(env) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${env.SITE_TITLE || 'OneBookNav'}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <div id="app">
        <div class="d-flex justify-content-center align-items-center" style="height: 100vh;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="/assets/js/app.js"></script>
    <script>
        // Initialize app
        window.OneBookNav = {
            apiBase: '/api',
            user: null,
            categories: [],
            bookmarks: []
        };

        const app = new OneBookNavApp();
        app.init();
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * Serve PWA manifest
 */
async function serveManifest(env) {
  const manifest = {
    name: env.SITE_TITLE || 'OneBookNav',
    short_name: 'OBN',
    description: 'Personal bookmark management system',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#007bff',
    icons: []
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Utility functions
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

// Placeholder implementations for missing functions
async function getCurrentUser(request, env) {
  // Implementation would check JWT token from Authorization header
  return null;
}

async function verifyPassword(password, hash) {
  // Implementation would use proper password verification
  return password === 'demo'; // Placeholder
}

async function generateJWT(user, secret) {
  // Implementation would generate proper JWT token
  return 'demo-token'; // Placeholder
}

// Additional handlers
async function handleRegister(request, env) {
  return jsonResponse({ success: false, error: 'Registration not implemented' }, 501);
}

async function handleLogout(request, env) {
  return jsonResponse({ success: true });
}

async function handleGetCurrentUser(request, env) {
  const user = await getCurrentUser(request, env);
  if (user) {
    return jsonResponse({ success: true, data: user });
  }
  return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
}

async function handleCheckAuth(request, env) {
  const user = await getCurrentUser(request, env);
  return jsonResponse({ success: true, authenticated: !!user });
}

async function handleSearch(request, env) {
  return jsonResponse({ success: false, error: 'Search not implemented' }, 501);
}

async function handleStats(request, env) {
  return jsonResponse({ success: false, error: 'Stats not implemented' }, 501);
}

async function handleSettings(request, env) {
  return jsonResponse({ success: false, error: 'Settings not implemented' }, 501);
}

async function handleAdmin(request, env) {
  return jsonResponse({ success: false, error: 'Admin not implemented' }, 501);
}

async function serveServiceWorker(env) {
  return new Response('// Service Worker placeholder', {
    headers: { 'Content-Type': 'application/javascript' }
  });
}

async function serveInstallPage(env) {
  return new Response('Installation not needed for Workers deployment', {
    headers: { 'Content-Type': 'text/plain' }
  });
}