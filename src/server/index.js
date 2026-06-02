const path = require('path');
const config = require('./config');
const { registerRoutes } = require('./routes');
const auth = require('./auth');
const FileSessionStore = require('./session-store');
const pingService = require('./ping-service');
const mqttService = require('./mqtt-service');
const DEFAULT_SESSION_SECRET = 'inventordash-secret-change-in-production-min-32-chars';
const isProduction = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
if (isProduction && (!process.env.SESSION_SECRET || sessionSecret.length < 32 || sessionSecret === DEFAULT_SESSION_SECRET)) {
  throw new Error('SESSION_SECRET must be explicitly set to a strong value (>= 32 chars) in production');
}

const fastify = require('fastify')({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === 'true'
});

// Register plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/multipart'), {
  limits: {
    files: 1,
    fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024 // 5MB default
  }
});
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: sessionSecret,
  store: new FileSessionStore({
    path: path.join(__dirname, '..', 'data', 'sessions'), // Store in src/data/sessions (persisted by Docker volume)
    ttl: 86400, // 24 hours in seconds
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

// Baseline hardening headers
fastify.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  return payload;
});

// Serve static files (but not index.html at root - we handle that with auth)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
  index: false // Don't serve index.html automatically
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', '..', 'node_modules', 'mqtt', 'dist'),
  prefix: '/js/vendor/',
  decorateReply: false,
  index: false
});

// Register routes
fastify.register(registerRoutes);

// Main page route (protected by main auth if enabled)
fastify.get('/', { preHandler: auth.requireMainAuth }, async (request, reply) => {
  return reply.sendFile('index.html');
});

// Initialize config on startup
config.loadConfig();

// Start ping service for monitoring
pingService.startService(() => config.getConfig());
mqttService.startService(() => config.getConfig());

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    console.log(`InventorDash running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  pingService.stopService();
  mqttService.stopService();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
