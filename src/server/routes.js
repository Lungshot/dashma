const path = require('path');
const fs = require('fs');
const config = require('./config');
const auth = require('./auth');

async function registerRoutes(fastify) {
  
  // Public API - get settings and links for homepage
  fastify.get('/api/public/data', async (request, reply) => {
    return {
      settings: config.getPublicSettings(),
      categories: config.getCategories(),
      links: config.getLinks()
    };
  });

  // Favicon proxy - fetch favicon for a URL
  fastify.get('/api/favicon', async (request, reply) => {
    const { url } = request.query;
    if (!url) {
      return reply.code(400).send({ error: 'URL required' });
    }
    try {
      const domain = new URL(url).hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      reply.redirect(faviconUrl);
    } catch (err) {
      return reply.code(400).send({ error: 'Invalid URL' });
    }
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
        admin: {
          username: cfg.admin.username,
          mustChangePassword: cfg.admin.mustChangePassword
        }
      };
    });

    // Update settings
    fastify.put('/api/admin/settings', async (request) => {
      return config.updateSettings(request.body);
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
    fastify.put('/api/admin/credentials', async (request) => {
      const { username, password } = request.body;
      config.updateAdminCredentials(username, password);
      return { success: true };
    });
  });
}

module.exports = { registerRoutes };
