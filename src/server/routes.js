const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const config = require('./config');
const auth = require('./auth');
const pingService = require('./ping-service');

// Helper to fetch a URL and check if it returns a valid image
function fetchImage(url, timeout = 3000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { timeout }, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImage(response.headers.location, timeout).then(resolve);
        return;
      }

      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const contentType = response.headers['content-type'] || '';
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Check if we got actual image data (not empty or error page)
        if (buffer.length > 100 && (contentType.includes('image') || buffer[0] === 0x89 || buffer[0] === 0x47 || buffer[0] === 0xFF || buffer[0] === 0x00)) {
          resolve({ buffer, contentType });
        } else {
          resolve(null);
        }
      });
      response.on('error', () => resolve(null));
    });

    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

// Extract app name variants from a link title for fuzzy matching
// "Portainer - Local" -> ["portainerlocal", "portainer-local", "portainer"]
// "SFTP-GO" -> ["sftpgo", "sftp-go", "sftp"]
// "Arctic Wolf" -> ["arcticwolf", "arctic-wolf", "arctic"]
// Note: No-hyphen version comes FIRST for domain lookups (arcticwolf.com not arctic-wolf.com)
function getAppNameVariants(appName) {
  if (!appName) return [];

  const variants = [];
  const cleaned = appName.toLowerCase().trim();

  // Full name as slug (with hyphens)
  const fullSlug = cleaned.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Without hyphens FIRST (e.g., "arcticwolf" before "arctic-wolf")
  // This is important because arcticwolf.com is correct, arctic-wolf.com is wrong
  const noHyphens = fullSlug.replace(/-/g, '');
  if (noHyphens) variants.push(noHyphens);

  // Then with hyphens
  if (fullSlug && fullSlug !== noHyphens) variants.push(fullSlug);

  // First word only (usually the app name)
  const firstWord = cleaned.split(/[\s\-_:,]+/)[0].replace(/[^a-z0-9]/g, '');
  if (firstWord && firstWord !== fullSlug && firstWord !== noHyphens) {
    variants.push(firstWord);
  }

  return variants;
}

async function registerRoutes(fastify) {
  
  // Public API - get settings and links for homepage
  fastify.get('/api/public/data', async (request, reply) => {
    return {
      settings: config.getPublicSettings(),
      categories: config.getCategories(),
      links: config.getLinks(),
      widgets: config.getWidgets().filter(w => w.enabled)
    };
  });

  // Public API - get monitoring status for all hosts
  fastify.get('/api/public/monitoring/status', async (request, reply) => {
    return pingService.getAllStatuses();
  });

  // Favicon proxy - fetch favicon for a URL with fallback chain and fuzzy app name matching
  fastify.get('/api/favicon', async (request, reply) => {
    const { url, app } = request.query;
    if (!url) {
      return reply.code(400).send({ error: 'URL required' });
    }

    let domain;
    let isIpAddress = false;
    try {
      domain = new URL(url).hostname;
      // Check if domain is an IP address
      isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain === 'localhost';
    } catch (err) {
      return reply.code(400).send({ error: 'Invalid URL' });
    }

    // Get app name variants for fuzzy matching
    const appVariants = getAppNameVariants(app);

    // Helper to send successful response
    const sendImage = (result) => {
      reply.header('Content-Type', result.contentType || 'image/png');
      reply.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      return reply.send(result.buffer);
    };

    // 1. Try selfh.st icons with fuzzy app name matching (fast, 2s timeout each)
    for (const variant of appVariants) {
      const selfhstUrl = `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${variant}.png`;
      const result = await fetchImage(selfhstUrl, 2000);
      if (result) return sendImage(result);
    }

    // 2. Try app name as domain FIRST (e.g., "arcticwolf.com" for "Arctic Wolf")
    // This catches cases where the URL is a subdomain but the main domain has the favicon
    if (appVariants.length > 0) {
      for (const variant of appVariants) {
        const brandDomain = `${variant}.com`;
        // Skip only if the variant domain is exactly the same as the URL domain
        // (allow trying arcticwolf.com when URL is dashboard.arcticwolf.com)
        if (brandDomain !== domain) {
          const googleBrandUrl = `https://www.google.com/s2/favicons?domain=${brandDomain}&sz=64`;
          const googleResult = await fetchImage(googleBrandUrl, 2000);
          if (googleResult) return sendImage(googleResult);
        }
      }
    }

    // 3. Try domain-based sources (only if not an IP address)
    if (!isIpAddress) {
      const domainSources = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://f1.allesedv.com/64/${domain}`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`
      ];

      for (const sourceUrl of domainSources) {
        const result = await fetchImage(sourceUrl, 2000);
        if (result) return sendImage(result);
      }
    }

    // 4. Try Simple Icons with different variants
    if (appVariants.length > 0) {
      for (const variant of appVariants) {
        const simpleIconsUrl = `https://cdn.simpleicons.org/${variant}`;
        const simpleResult = await fetchImage(simpleIconsUrl, 2000);
        if (simpleResult) return sendImage(simpleResult);
      }
    }

    // 4. Final fallback - return a generic icon or Google's default
    reply.redirect(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  });

  // User login page (for main site auth)
  fastify.get('/login', async (request, reply) => {
    const settings = config.getConfig().settings;
    // If main auth is disabled, redirect to main page
    if (!settings.mainAuthMode || settings.mainAuthMode === 'none') {
      return reply.redirect('/');
    }
    return reply.sendFile('login.html');
  });

  // User login POST (for main site auth)
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;
    const settings = config.getConfig().settings;
    const redirect = request.query.redirect || '/';

    if (settings.mainAuthMode === 'basic') {
      // Try regular user first
      const user = config.verifyUser(username, password);
      if (user) {
        request.session.userAuthenticated = true;
        request.session.userId = user.id;
        request.session.username = user.username;
        return reply.redirect(redirect);
      }

      // Also allow admin to log in to main site
      if (config.verifyAdmin(username, password)) {
        request.session.authenticated = true;
        request.session.username = username;
        return reply.redirect(redirect);
      }
    }

    return reply.redirect(`/login?error=1&redirect=${encodeURIComponent(redirect)}`);
  });

  // User logout
  fastify.get('/logout', async (request, reply) => {
    request.session.destroy();
    return reply.redirect('/');
  });

  // EntraID login for main site
  fastify.get('/login/entra', async (request, reply) => {
    const settings = config.getConfig().settings;
    if (settings.mainAuthMode !== 'entraId') {
      return reply.redirect('/login');
    }

    const redirect = request.query.redirect || '/';
    const redirectUri = settings.entraId.redirectUri || `${request.protocol}://${request.hostname}/callback`;
    const authUrl = await auth.getAuthUrl(redirectUri);

    if (authUrl) {
      // Store redirect in session for callback
      request.session.loginRedirect = redirect;
      return reply.redirect(authUrl);
    }
    return reply.redirect('/login?error=entra');
  });

  // EntraID callback for main site
  fastify.get('/callback', async (request, reply) => {
    const { code } = request.query;
    const settings = config.getConfig().settings;
    const redirectUri = settings.entraId.redirectUri || `${request.protocol}://${request.hostname}/callback`;

    const result = await auth.handleCallback(code, redirectUri);
    if (result) {
      request.session.userAuthenticated = true;
      request.session.username = result.account.username;
      request.session.entraUser = true;
      const redirect = request.session.loginRedirect || '/';
      delete request.session.loginRedirect;
      return reply.redirect(redirect);
    }

    return reply.redirect('/login?error=entra');
  });

  // Admin login page
  fastify.get('/admin/login', async (request, reply) => {
    return reply.sendFile('admin-login.html');
  });

  // Admin login POST
  fastify.post('/admin/login', async (request, reply) => {
    const { username, password } = request.body;
    const settings = config.getConfig().settings;

    if (settings.authMode === 'basic' || settings.authMode === 'none') {
      if (config.verifyAdmin(username, password)) {
        request.session.authenticated = true;
        request.session.username = username;
        
        if (config.mustChangePassword()) {
          return reply.redirect('/admin/change-password');
        }
        
        const redirect = request.query.redirect || '/admin';
        return reply.redirect(redirect);
      }
    }

    return reply.redirect('/admin/login?error=1');
  });

  // Admin login API (JSON-based for AJAX re-authentication)
  fastify.post('/api/admin/login', async (request, reply) => {
    const { username, password } = request.body;
    const settings = config.getConfig().settings;

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    if (settings.authMode === 'basic' || settings.authMode === 'none') {
      if (config.verifyAdmin(username, password)) {
        request.session.authenticated = true;
        request.session.username = username;

        // Check if password change is required
        if (config.mustChangePassword()) {
          return { success: true, mustChangePassword: true };
        }

        return { success: true };
      }
    }

    return reply.code(401).send({ error: 'Invalid username or password' });
  });

  // EntraID login redirect
  fastify.get('/admin/login/entra', async (request, reply) => {
    const settings = config.getConfig().settings;
    if (settings.authMode !== 'entraId') {
      return reply.redirect('/admin/login');
    }

    const redirectUri = settings.entraId.redirectUri || `${request.protocol}://${request.hostname}/admin/callback`;
    const authUrl = await auth.getAuthUrl(redirectUri);
    
    if (authUrl) {
      return reply.redirect(authUrl);
    }
    return reply.redirect('/admin/login?error=entra');
  });

  // EntraID callback
  fastify.get('/admin/callback', async (request, reply) => {
    const { code } = request.query;
    const settings = config.getConfig().settings;
    const redirectUri = settings.entraId.redirectUri || `${request.protocol}://${request.hostname}/admin/callback`;

    const result = await auth.handleCallback(code, redirectUri);
    if (result) {
      request.session.authenticated = true;
      request.session.username = result.account.username;
      request.session.entraUser = true;
      return reply.redirect('/admin');
    }

    return reply.redirect('/admin/login?error=entra');
  });

  // Admin logout
  fastify.get('/admin/logout', async (request, reply) => {
    request.session.destroy();
    return reply.redirect('/');
  });

  // Change password page
  fastify.get('/admin/change-password', async (request, reply) => {
    if (!request.session.authenticated) {
      return reply.redirect('/admin/login');
    }
    return reply.sendFile('admin-change-password.html');
  });

  // Change password POST
  fastify.post('/admin/change-password', async (request, reply) => {
    if (!request.session.authenticated) {
      return reply.redirect('/admin/login');
    }

    const { username, newPassword, confirmPassword } = request.body;
    
    if (newPassword !== confirmPassword) {
      return reply.redirect('/admin/change-password?error=mismatch');
    }

    if (newPassword.length < 8) {
      return reply.redirect('/admin/change-password?error=short');
    }

    config.updateAdminCredentials(username || null, newPassword);
    return reply.redirect('/admin');
  });

  // Admin page (protected)
  fastify.get('/admin', { preHandler: auth.requireAuth }, async (request, reply) => {
    if (config.mustChangePassword() && !request.session.entraUser) {
      return reply.redirect('/admin/change-password');
    }
    return reply.sendFile('admin.html');
  });

  // Protected Admin API routes
  fastify.register(async function adminApi(fastify) {
    fastify.addHook('preHandler', auth.requireAuth);

    // Get full config (admin only)
    fastify.get('/api/admin/config', async () => {
      const cfg = config.getConfig();
      return {
        settings: cfg.settings,
        categories: cfg.categories,
        links: cfg.links,
        widgets: cfg.widgets || [],
        admin: {
          username: cfg.admin.username,
          mustChangePassword: cfg.admin.mustChangePassword
        }
      };
    });

    // Update settings
    fastify.put('/api/admin/settings', async (request, reply) => {
      try {
        return config.updateSettings(request.body);
      } catch (err) {
        console.error('Failed to update settings:', err);
        return reply.code(500).send({ error: err.message || 'Failed to save settings' });
      }
    });

    // Categories CRUD
    fastify.post('/api/admin/categories', async (request) => {
      return config.addCategory(request.body);
    });

    fastify.put('/api/admin/categories/:id', async (request) => {
      return config.updateCategory(request.params.id, request.body);
    });

    fastify.delete('/api/admin/categories/:id', async (request, reply) => {
      config.deleteCategory(request.params.id);
      return { success: true };
    });

    fastify.put('/api/admin/categories/reorder', async (request) => {
      config.reorderCategories(request.body.ids);
      return { success: true };
    });

    // Links CRUD
    fastify.post('/api/admin/links', async (request) => {
      return config.addLink(request.body);
    });

    fastify.put('/api/admin/links/:id', async (request) => {
      return config.updateLink(request.params.id, request.body);
    });

    fastify.delete('/api/admin/links/:id', async (request) => {
      config.deleteLink(request.params.id);
      return { success: true };
    });

    fastify.put('/api/admin/links/reorder', async (request) => {
      config.reorderLinks(request.body.categoryId, request.body.ids);
      return { success: true };
    });

    // Export config
    fastify.get('/api/admin/export', async (request, reply) => {
      const cfg = config.exportConfig();
      reply.header('Content-Disposition', 'attachment; filename="dashma-config.json"');
      reply.header('Content-Type', 'application/json');
      return cfg;
    });

    // Import config
    fastify.post('/api/admin/import', async (request) => {
      config.importConfig(request.body);
      return { success: true };
    });

    // Upload background image
    fastify.post('/api/admin/upload/background', async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const filename = `background-${Date.now()}${path.extname(data.filename)}`;
      const uploadPath = path.join(__dirname, '..', 'public', 'uploads', filename);
      
      const writeStream = fs.createWriteStream(uploadPath);
      await data.file.pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const imageUrl = `/uploads/${filename}`;
      config.updateSettings({ backgroundImage: imageUrl });
      
      return { success: true, url: imageUrl };
    });

    // Upload custom link icon
    fastify.post('/api/admin/upload/icon', async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const filename = `icon-${Date.now()}${path.extname(data.filename)}`;
      const uploadPath = path.join(__dirname, '..', 'public', 'uploads', filename);

      const writeStream = fs.createWriteStream(uploadPath);
      await data.file.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return { success: true, url: `/uploads/${filename}` };
    });

    // Upload site logo
    fastify.post('/api/admin/upload/logo', async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const filename = `logo-${Date.now()}${path.extname(data.filename)}`;
      const uploadPath = path.join(__dirname, '..', 'public', 'uploads', filename);

      const writeStream = fs.createWriteStream(uploadPath);
      await data.file.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const logoUrl = `/uploads/${filename}`;
      config.updateSettings({ siteLogo: logoUrl });

      return { success: true, url: logoUrl };
    });

    // Update admin credentials
    fastify.put('/api/admin/credentials', async (request, reply) => {
      const { username, password } = request.body;
      config.updateAdminCredentials(username, password);
      // If password was changed, force logout by destroying session
      if (password) {
        request.session.destroy();
        return { success: true, requireRelogin: true };
      }
      return { success: true };
    });

    // User management
    fastify.get('/api/admin/users', async () => {
      const users = config.getUsers();
      // Return users without password hashes
      return users.map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }));
    });

    fastify.post('/api/admin/users', async (request, reply) => {
      const { username, password } = request.body;
      if (!username || !password) {
        return reply.code(400).send({ error: 'Username and password required' });
      }
      if (password.length < 4) {
        return reply.code(400).send({ error: 'Password must be at least 4 characters' });
      }
      try {
        return config.addUser(username, password);
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.put('/api/admin/users/:id', async (request, reply) => {
      const { username, password } = request.body;
      try {
        return config.updateUser(request.params.id, { username, password });
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.delete('/api/admin/users/:id', async (request) => {
      config.deleteUser(request.params.id);
      return { success: true };
    });

    // Request management (admin)
    fastify.get('/api/admin/requests', async () => {
      return config.getRequests();
    });

    fastify.post('/api/admin/requests/category/:id/approve', async (request, reply) => {
      try {
        const result = config.approveCategoryRequest(request.params.id, request.session.username);
        return result;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.post('/api/admin/requests/link/:id/approve', async (request, reply) => {
      try {
        const result = config.approveLinkRequest(request.params.id, request.session.username);
        return result;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.post('/api/admin/requests/category/:id/deny', async (request, reply) => {
      try {
        const result = config.denyRequest('category', request.params.id, request.session.username);
        return result;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.post('/api/admin/requests/link/:id/deny', async (request, reply) => {
      try {
        const result = config.denyRequest('link', request.params.id, request.session.username);
        return result;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.delete('/api/admin/requests/category/:id', async (request) => {
      config.deleteRequest('category', request.params.id);
      return { success: true };
    });

    fastify.delete('/api/admin/requests/link/:id', async (request) => {
      config.deleteRequest('link', request.params.id);
      return { success: true };
    });

    // Widget management (admin)
    fastify.get('/api/admin/widgets', async () => {
      return config.getWidgets();
    });

    fastify.post('/api/admin/widgets', async (request, reply) => {
      try {
        const widget = config.addWidget(request.body);
        pingService.refreshHosts();
        return widget;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.put('/api/admin/widgets/:id', async (request, reply) => {
      try {
        const widget = config.updateWidget(request.params.id, request.body);
        pingService.refreshHosts();
        return widget;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    fastify.delete('/api/admin/widgets/:id', async (request) => {
      config.deleteWidget(request.params.id);
      pingService.refreshHosts();
      return { success: true };
    });

    fastify.put('/api/admin/widgets/reorder', async (request, reply) => {
      const { position, ids } = request.body;
      if (!position || !ids) {
        return reply.code(400).send({ error: 'Position and ids required' });
      }
      config.reorderWidgets(position, ids);
      return { success: true };
    });

    // Link monitoring (admin)
    fastify.put('/api/admin/links/:id/monitoring', async (request, reply) => {
      try {
        const link = config.updateLinkMonitoring(request.params.id, request.body);
        pingService.refreshHosts();
        return link;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    // Monitoring management (admin)
    fastify.get('/api/admin/monitoring/status', async () => {
      return pingService.getAllStatuses();
    });

    fastify.post('/api/admin/monitoring/check/:hostId', async (request, reply) => {
      const status = await pingService.forceCheck(request.params.hostId);
      if (!status) {
        return reply.code(404).send({ error: 'Host not found' });
      }
      return status;
    });

    // Test an arbitrary host/port (for admin testing in widget config)
    fastify.post('/api/admin/monitoring/test', async (request, reply) => {
      const { host, port } = request.body;
      if (!host) {
        return reply.code(400).send({ error: 'Host is required' });
      }
      try {
        const result = await pingService.testHost(host, port || null);
        return result;
      } catch (err) {
        return reply.code(500).send({ error: err.message });
      }
    });

    fastify.get('/api/admin/monitoring/settings', async () => {
      return config.getMonitoringSettings();
    });

    fastify.put('/api/admin/monitoring/settings', async (request, reply) => {
      try {
        const settings = config.updateMonitoringSettings(request.body);
        pingService.refreshHosts();
        return settings;
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });
  });

  // Public request submission page
  fastify.get('/request', async (request, reply) => {
    return reply.sendFile('request.html');
  });

  // Public API for submitting requests (no auth required)
  fastify.get('/api/public/categories-for-request', async () => {
    // Return both existing categories and pending category requests
    const categories = config.getCategories();
    const pendingCategories = config.getPendingCategoryRequests();
    return {
      categories: categories,
      pendingCategories: pendingCategories
    };
  });

  fastify.post('/api/public/request/category', async (request, reply) => {
    const { name, submittedBy } = request.body;
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existing = config.getCategories().find(c => c.name.toLowerCase() === name.toLowerCase().trim());
    if (existing) {
      return reply.code(400).send({ error: 'A category with this name already exists' });
    }

    // Check if there's already a pending request for this category
    const pendingRequests = config.getPendingCategoryRequests();
    const pendingExisting = pendingRequests.find(r => r.name.toLowerCase() === name.toLowerCase().trim());
    if (pendingExisting) {
      return reply.code(400).send({ error: 'A request for this category is already pending' });
    }

    const result = config.addCategoryRequest({ name: name.trim() }, submittedBy || 'anonymous');
    return result;
  });

  fastify.post('/api/public/request/link', async (request, reply) => {
    const { name, url, categoryId, pendingCategoryId, tags, submittedBy } = request.body;

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Link name is required' });
    }
    if (!url || !url.trim()) {
      return reply.code(400).send({ error: 'URL is required' });
    }
    if (!categoryId && !pendingCategoryId) {
      return reply.code(400).send({ error: 'Category is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      return reply.code(400).send({ error: 'Invalid URL format' });
    }

    const result = config.addLinkRequest({
      name: name.trim(),
      url: url.trim(),
      categoryId: categoryId || null,
      pendingCategoryId: pendingCategoryId || null,
      tags: tags || []
    }, submittedBy || 'anonymous');

    return result;
  });
}

module.exports = { registerRoutes };
