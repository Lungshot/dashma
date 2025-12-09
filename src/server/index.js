const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { registerRoutes } = require('./routes');
const auth = require('./auth');

// Setup file-based session store for persistence across server restarts
const FileStore = require('session-file-store')(require('@fastify/session'));
const sessionPath = path.join(__dirname, '..', '..', 'data', 'sessions');

// Ensure session directory exists
if (!fs.existsSync(sessionPath)) {
  fs.mkdirSync(sessionPath, { recursive: true });
}

// Register plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'dashma-secret-change-in-production-min-32-chars',
  store: new FileStore({
    path: sessionPath,
    ttl: 86400, // 24 hours in seconds
    retries: 0,
    reapInterval: 3600 // Clean up expired sessions every hour
  }),
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true', // Set COOKIE_SECURE=true if not behind a reverse proxy
    httpOnly: true,
    sameSite: 'lax', // Prevents session loss when switching tabs
    maxAge: 86400000 // 24 hours in milliseconds
  },
  saveUninitialized: false,
  rolling: true // Reset cookie maxAge on every response, keeping session alive while user is active
});

// Serve static files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/'
});

// Register routes
fastify.register(registerRoutes);

// Main page route (protected by main auth if enabled)
fastify.get('/', { preHandler: auth.requireMainAuth }, async (request, reply) => {
  return reply.sendFile('index.html');
});

// Initialize config on startup
config.loadConfig();

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    console.log(`Dashma running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
