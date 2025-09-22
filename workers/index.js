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
      // Validate environment
      const validationError = validateEnvironment(env);
      if (validationError) {
        console.error('Environment validation failed:', validationError);
        return jsonResponse({ success: false, error: 'Service unavailable - Configuration error' }, 503);
      }

      // Initialize database if needed
      await initializeDatabase(env.DB);

      // Initialize default admin account if enabled
      await initializeDefaultAdmin(env);

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
    const user = await env.DB.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1')
      .bind(username, username).first();

    if (!user) {
      return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
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
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
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

  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const categoryId = pathSegments[2];

  switch (request.method) {
    case 'GET':
      try {
        if (categoryId) {
          // Get single category
          const category = await env.DB.prepare(
            'SELECT * FROM categories WHERE id = ? AND user_id = ?'
          ).bind(categoryId, user.id).first();

          if (!category) {
            return jsonResponse({ success: false, error: 'Category not found' }, 404);
          }

          return jsonResponse({ success: true, data: category });
        } else {
          // Get all categories with hierarchy
          const categories = await env.DB.prepare(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY parent_id, weight DESC, name'
          ).bind(user.id).all();

          // Build hierarchy
          const categoryMap = new Map();
          const rootCategories = [];

          (categories.results || []).forEach(cat => {
            cat.children = [];
            categoryMap.set(cat.id, cat);
          });

          (categories.results || []).forEach(cat => {
            if (cat.parent_id && categoryMap.has(cat.parent_id)) {
              categoryMap.get(cat.parent_id).children.push(cat);
            } else {
              rootCategories.push(cat);
            }
          });

          return jsonResponse({ success: true, data: rootCategories });
        }
      } catch (error) {
        console.error('Get categories error:', error);
        return jsonResponse({ success: false, error: 'Failed to get categories' }, 500);
      }

    case 'POST':
      try {
        const data = await request.json();
        const { name, parent_id, icon, color, is_private } = data;

        if (!name || name.trim().length === 0) {
          return jsonResponse({ success: false, error: 'Category name is required' }, 400);
        }

        // Validate parent category if provided
        if (parent_id) {
          const parentCategory = await env.DB.prepare(
            'SELECT id FROM categories WHERE id = ? AND user_id = ?'
          ).bind(parent_id, user.id).first();

          if (!parentCategory) {
            return jsonResponse({ success: false, error: 'Invalid parent category' }, 400);
          }
        }

        const result = await env.DB.prepare(
          'INSERT INTO categories (name, parent_id, user_id, icon, color, is_private, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
        ).bind(name.trim(), parent_id || null, user.id, icon || '', color || '', is_private ? 1 : 0).run();

        return jsonResponse({
          success: true,
          data: { id: result.meta.last_row_id },
          message: 'Category created successfully'
        });
      } catch (error) {
        console.error('Create category error:', error);
        return jsonResponse({ success: false, error: 'Failed to create category' }, 500);
      }

    case 'PUT':
      try {
        if (!categoryId) {
          return jsonResponse({ success: false, error: 'Category ID required' }, 400);
        }

        const data = await request.json();
        const { name, parent_id, icon, color, is_private } = data;

        if (!name || name.trim().length === 0) {
          return jsonResponse({ success: false, error: 'Category name is required' }, 400);
        }

        // Check if category belongs to user
        const category = await env.DB.prepare(
          'SELECT id FROM categories WHERE id = ? AND user_id = ?'
        ).bind(categoryId, user.id).first();

        if (!category) {
          return jsonResponse({ success: false, error: 'Category not found' }, 404);
        }

        // Validate parent category if provided (and not self-referencing)
        if (parent_id && parent_id != categoryId) {
          const parentCategory = await env.DB.prepare(
            'SELECT id FROM categories WHERE id = ? AND user_id = ?'
          ).bind(parent_id, user.id).first();

          if (!parentCategory) {
            return jsonResponse({ success: false, error: 'Invalid parent category' }, 400);
          }
        }

        await env.DB.prepare(
          'UPDATE categories SET name = ?, parent_id = ?, icon = ?, color = ?, is_private = ? WHERE id = ? AND user_id = ?'
        ).bind(
          name.trim(),
          (parent_id && parent_id != categoryId) ? parent_id : null,
          icon || '',
          color || '',
          is_private ? 1 : 0,
          categoryId,
          user.id
        ).run();

        return jsonResponse({ success: true, message: 'Category updated successfully' });
      } catch (error) {
        console.error('Update category error:', error);
        return jsonResponse({ success: false, error: 'Failed to update category' }, 500);
      }

    case 'DELETE':
      try {
        if (!categoryId) {
          return jsonResponse({ success: false, error: 'Category ID required' }, 400);
        }

        // Check if category has bookmarks
        const bookmarkCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM bookmarks WHERE category_id = ? AND user_id = ?'
        ).bind(categoryId, user.id).first();

        if (bookmarkCount.count > 0) {
          return jsonResponse({
            success: false,
            error: `Cannot delete category with ${bookmarkCount.count} bookmarks. Please move or delete bookmarks first.`
          }, 400);
        }

        // Check if category has child categories
        const childCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND user_id = ?'
        ).bind(categoryId, user.id).first();

        if (childCount.count > 0) {
          return jsonResponse({
            success: false,
            error: `Cannot delete category with ${childCount.count} subcategories. Please move or delete subcategories first.`
          }, 400);
        }

        const result = await env.DB.prepare(
          'DELETE FROM categories WHERE id = ? AND user_id = ?'
        ).bind(categoryId, user.id).run();

        if (result.changes === 0) {
          return jsonResponse({ success: false, error: 'Category not found' }, 404);
        }

        return jsonResponse({ success: true, message: 'Category deleted successfully' });
      } catch (error) {
        console.error('Delete category error:', error);
        return jsonResponse({ success: false, error: 'Failed to delete category' }, 500);
      }

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

  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const bookmarkId = pathSegments[2];

  switch (request.method) {
    case 'GET':
      try {
        if (bookmarkId) {
          // Get single bookmark
          const bookmark = await env.DB.prepare(
            'SELECT * FROM bookmarks WHERE id = ? AND user_id = ?'
          ).bind(bookmarkId, user.id).first();

          if (!bookmark) {
            return jsonResponse({ success: false, error: 'Bookmark not found' }, 404);
          }

          return jsonResponse({ success: true, data: bookmark });
        } else {
          // Get all bookmarks
          const categoryId = url.searchParams.get('category_id');
          let query = 'SELECT b.*, c.name as category_name FROM bookmarks b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ?';
          let params = [user.id];

          if (categoryId) {
            query += ' AND b.category_id = ?';
            params.push(categoryId);
          }

          query += ' ORDER BY b.weight DESC, b.title ASC';

          const bookmarks = await env.DB.prepare(query).bind(...params).all();
          return jsonResponse({ success: true, data: bookmarks.results || [] });
        }
      } catch (error) {
        console.error('Get bookmarks error:', error);
        return jsonResponse({ success: false, error: 'Failed to get bookmarks' }, 500);
      }

    case 'POST':
      try {
        if (pathSegments[2] === 'reorder') {
          // Handle bookmark reordering
          const data = await request.json();
          const { bookmark_ids } = data;

          if (!Array.isArray(bookmark_ids)) {
            return jsonResponse({ success: false, error: 'Invalid bookmark_ids' }, 400);
          }

          // Update weights based on order
          for (let i = 0; i < bookmark_ids.length; i++) {
            await env.DB.prepare(
              'UPDATE bookmarks SET weight = ? WHERE id = ? AND user_id = ?'
            ).bind(bookmark_ids.length - i, bookmark_ids[i], user.id).run();
          }

          return jsonResponse({ success: true, message: 'Bookmarks reordered successfully' });
        } else if (bookmarkId && pathSegments[3] === 'click') {
          // Handle click tracking
          await env.DB.prepare(
            'UPDATE bookmarks SET click_count = click_count + 1 WHERE id = ? AND user_id = ?'
          ).bind(bookmarkId, user.id).run();

          return jsonResponse({ success: true, message: 'Click recorded' });
        } else {
          // Create new bookmark
          const data = await request.json();
          const { title, url, category_id, description, keywords, is_private } = data;

          if (!title || !url || !category_id) {
            return jsonResponse({ success: false, error: 'Title, URL and category are required' }, 400);
          }

          // Validate URL
          try {
            new URL(url);
          } catch {
            return jsonResponse({ success: false, error: 'Invalid URL format' }, 400);
          }

          // Check if category belongs to user
          const category = await env.DB.prepare(
            'SELECT id FROM categories WHERE id = ? AND user_id = ?'
          ).bind(category_id, user.id).first();

          if (!category) {
            return jsonResponse({ success: false, error: 'Invalid category' }, 400);
          }

          const result = await env.DB.prepare(
            'INSERT INTO bookmarks (title, url, category_id, user_id, description, keywords, is_private, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
          ).bind(title, url, category_id, user.id, description || '', keywords || '', is_private ? 1 : 0).run();

          return jsonResponse({ success: true, data: { id: result.meta.last_row_id }, message: 'Bookmark created successfully' });
        }
      } catch (error) {
        console.error('Create bookmark error:', error);
        return jsonResponse({ success: false, error: 'Failed to create bookmark' }, 500);
      }

    case 'PUT':
      try {
        if (!bookmarkId) {
          return jsonResponse({ success: false, error: 'Bookmark ID required' }, 400);
        }

        const data = await request.json();
        const { title, url, category_id, description, keywords, is_private } = data;

        // Validate required fields
        if (!title || !url || !category_id) {
          return jsonResponse({ success: false, error: 'Title, URL and category are required' }, 400);
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          return jsonResponse({ success: false, error: 'Invalid URL format' }, 400);
        }

        // Check if bookmark belongs to user
        const bookmark = await env.DB.prepare(
          'SELECT id FROM bookmarks WHERE id = ? AND user_id = ?'
        ).bind(bookmarkId, user.id).first();

        if (!bookmark) {
          return jsonResponse({ success: false, error: 'Bookmark not found' }, 404);
        }

        // Check if category belongs to user
        const category = await env.DB.prepare(
          'SELECT id FROM categories WHERE id = ? AND user_id = ?'
        ).bind(category_id, user.id).first();

        if (!category) {
          return jsonResponse({ success: false, error: 'Invalid category' }, 400);
        }

        await env.DB.prepare(
          'UPDATE bookmarks SET title = ?, url = ?, category_id = ?, description = ?, keywords = ?, is_private = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?'
        ).bind(title, url, category_id, description || '', keywords || '', is_private ? 1 : 0, bookmarkId, user.id).run();

        return jsonResponse({ success: true, message: 'Bookmark updated successfully' });
      } catch (error) {
        console.error('Update bookmark error:', error);
        return jsonResponse({ success: false, error: 'Failed to update bookmark' }, 500);
      }

    case 'DELETE':
      try {
        if (!bookmarkId) {
          return jsonResponse({ success: false, error: 'Bookmark ID required' }, 400);
        }

        const result = await env.DB.prepare(
          'DELETE FROM bookmarks WHERE id = ? AND user_id = ?'
        ).bind(bookmarkId, user.id).run();

        if (result.changes === 0) {
          return jsonResponse({ success: false, error: 'Bookmark not found' }, 404);
        }

        return jsonResponse({ success: true, message: 'Bookmark deleted successfully' });
      } catch (error) {
        console.error('Delete bookmark error:', error);
        return jsonResponse({ success: false, error: 'Failed to delete bookmark' }, 500);
      }

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

/**
 * JWT and Authentication utilities
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Base64URL encoding/decoding
function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlUnescape(str) {
  str += new Array(5 - str.length % 4).join('=');
  return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function base64urlDecode(str) {
  return atob(base64urlUnescape(str));
}

function base64urlEncode(str) {
  return base64urlEscape(btoa(str));
}

// JWT implementation
async function generateJWT(user, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    user_id: user.id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${data}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    const data = `${header}.${payload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array([...base64urlDecode(signature)].map(c => c.charCodeAt(0))),
      encoder.encode(data)
    );

    if (!isValid) return null;

    const decodedPayload = JSON.parse(base64urlDecode(payload));

    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

// Password hashing and verification
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return base64urlEncode(String.fromCharCode(...combined));
}

async function verifyPassword(password, hash) {
  try {
    const combined = new Uint8Array([...base64urlDecode(hash)].map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedHash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    const derivedArray = new Uint8Array(derivedHash);

    // Constant time comparison
    let result = 0;
    for (let i = 0; i < storedHash.length; i++) {
      result |= storedHash[i] ^ derivedArray[i];
    }

    return result === 0;
  } catch (error) {
    return false;
  }
}

// Get current user from request
async function getCurrentUser(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);

  if (!payload) {
    return null;
  }

  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(payload.user_id).first();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Additional API handlers
 */
async function handleRegister(request, env) {
  try {
    // Check if registration is allowed
    const allowRegistration = await env.DB.prepare(
      'SELECT setting_value FROM settings WHERE setting_key = "allow_registration"'
    ).first();

    if (!allowRegistration || allowRegistration.setting_value !== '1') {
      return jsonResponse({ success: false, error: 'Registration is disabled' }, 403);
    }

    const data = await request.json();
    const { username, email, password, password_confirm } = data;

    // Validation
    if (!username || !email || !password) {
      return jsonResponse({ success: false, error: 'Username, email and password are required' }, 400);
    }

    if (password !== password_confirm) {
      return jsonResponse({ success: false, error: 'Passwords do not match' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existingUser) {
      return jsonResponse({ success: false, error: 'Username or email already exists' }, 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare(
      'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
    ).bind(username, email, passwordHash, 'user').run();

    return jsonResponse({
      success: true,
      message: 'User registered successfully',
      user_id: result.meta.last_row_id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return jsonResponse({ success: false, error: 'Registration failed' }, 500);
  }
}

async function handleLogout(request, env) {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token. Server-side, we could maintain a blacklist.
  return jsonResponse({ success: true, message: 'Logged out successfully' });
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
  return jsonResponse({ success: true, authenticated: !!user, user: user || null });
}

async function handleSearch(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return jsonResponse({ success: false, error: 'Search query must be at least 2 characters' }, 400);
  }

  try {
    const searchPattern = `%${query.trim()}%`;
    const bookmarks = await env.DB.prepare(`
      SELECT b.*, c.name as category_name
      FROM bookmarks b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
        AND (b.is_private = 0 OR b.user_id = ?)
        AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ? OR b.url LIKE ?)
      ORDER BY b.weight DESC, b.title ASC
      LIMIT 50
    `).bind(
      user.id, user.id,
      searchPattern, searchPattern, searchPattern, searchPattern
    ).all();

    return jsonResponse({ success: true, data: bookmarks.results || [] });
  } catch (error) {
    console.error('Search error:', error);
    return jsonResponse({ success: false, error: 'Search failed' }, 500);
  }
}

async function handleStats(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  try {
    const stats = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?').bind(user.id).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id = ?').bind(user.id).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ? AND is_private = 1').bind(user.id).first(),
      env.DB.prepare('SELECT SUM(click_count) as total FROM bookmarks WHERE user_id = ?').bind(user.id).first()
    ]);

    return jsonResponse({
      success: true,
      data: {
        total_bookmarks: stats[0].count,
        total_categories: stats[1].count,
        private_bookmarks: stats[2].count,
        total_clicks: stats[3].total || 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return jsonResponse({ success: false, error: 'Failed to get statistics' }, 500);
  }
}

async function handleSettings(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  switch (request.method) {
    case 'GET':
      try {
        const settings = await env.DB.prepare(
          'SELECT setting_key, setting_value, setting_type FROM settings WHERE is_public = 1'
        ).all();

        const userSettings = user.settings ? JSON.parse(user.settings) : {};

        return jsonResponse({
          success: true,
          data: {
            public_settings: settings.results || [],
            user_settings: userSettings
          }
        });
      } catch (error) {
        return jsonResponse({ success: false, error: 'Failed to get settings' }, 500);
      }

    case 'PUT':
      try {
        const data = await request.json();
        const settingsJson = JSON.stringify(data);

        await env.DB.prepare(
          'UPDATE users SET settings = ? WHERE id = ?'
        ).bind(settingsJson, user.id).run();

        return jsonResponse({ success: true, message: 'Settings updated successfully' });
      } catch (error) {
        return jsonResponse({ success: false, error: 'Failed to update settings' }, 500);
      }

    default:
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
}

async function handleAdmin(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user || user.role !== 'admin') {
    return jsonResponse({ success: false, error: 'Admin access required' }, 403);
  }

  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const action = pathSegments[2];

  switch (action) {
    case 'users':
      if (request.method === 'GET') {
        try {
          const users = await env.DB.prepare(
            'SELECT id, username, email, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC'
          ).all();
          return jsonResponse({ success: true, data: users.results || [] });
        } catch (error) {
          return jsonResponse({ success: false, error: 'Failed to get users' }, 500);
        }
      }
      break;

    case 'system':
      if (request.method === 'GET') {
        try {
          const stats = await Promise.all([
            env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM categories').first()
          ]);

          return jsonResponse({
            success: true,
            data: {
              total_users: stats[0].count,
              total_bookmarks: stats[1].count,
              total_categories: stats[2].count,
              version: '1.0.0'
            }
          });
        } catch (error) {
          return jsonResponse({ success: false, error: 'Failed to get system stats' }, 500);
        }
      }
      break;

    default:
      return jsonResponse({ success: false, error: 'Admin endpoint not found' }, 404);
  }

  return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
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

/**
 * Initialize default admin account if configured
 */
async function initializeDefaultAdmin(env) {
  // Check if auto-create admin is enabled
  if (!env.AUTO_CREATE_ADMIN || env.AUTO_CREATE_ADMIN !== 'true') {
    return;
  }

  try {
    // Check if any admin user exists
    const adminCheck = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role IN (?, ?)'
    ).bind('admin', 'superadmin').first();

    if (adminCheck.count > 0) {
      return; // Admin already exists
    }

    // Get default admin credentials - password must come from secrets
    const username = env.DEFAULT_ADMIN_USERNAME || 'admin';
    const password = env.DEFAULT_ADMIN_PASSWORD;
    const email = env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';

    // Validate that password is set via secrets
    if (!password) {
      console.error('OneBookNav: DEFAULT_ADMIN_PASSWORD secret not set. Cannot create admin account.');
      console.error('Run: wrangler secret put DEFAULT_ADMIN_PASSWORD');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('OneBookNav: Admin password must be at least 8 characters long.');
      return;
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the default admin user
    await env.DB.prepare(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
    ).bind(username, email, passwordHash, 'admin').run();

    console.log(`OneBookNav: Default admin account created - Username: ${username}`);

    // Insert default settings if not exists
    const defaultSettings = [
      ['site_title', env.SITE_TITLE || 'OneBookNav', 'string', 1],
      ['allow_registration', '1', 'boolean', 1],
      ['version', '1.0.0', 'string', 1],
      ['installation_date', new Date().toISOString(), 'string', 0]
    ];

    for (const setting of defaultSettings) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)'
      ).bind(...setting).run();
    }

  } catch (error) {
    console.error('OneBookNav: Failed to create default admin account:', error);
  }
}

/**
 * Validate environment configuration
 */
function validateEnvironment(env) {
  // Check required bindings
  if (!env.DB) {
    return 'D1 Database binding (DB) is not configured. Please check your wrangler.toml file.';
  }

  // Check required secrets for admin creation
  if (env.AUTO_CREATE_ADMIN === 'true' && !env.DEFAULT_ADMIN_PASSWORD) {
    return 'DEFAULT_ADMIN_PASSWORD secret is required when AUTO_CREATE_ADMIN is enabled. Run: wrangler secret put DEFAULT_ADMIN_PASSWORD';
  }

  // Check JWT secret for authentication
  if (!env.JWT_SECRET) {
    return 'JWT_SECRET is required for authentication. Run: wrangler secret put JWT_SECRET';
  }

  return null; // No validation errors
}