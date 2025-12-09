const fastify = require('fastify')({ logger: true });
const path = require('path');
const config = require('./config');
const { registerRoutes } = require('./routes');
const auth = require('./auth');
const FileSessionStore = require('./session-store');

// Register plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'dashma-secret-change-in-production-min-32-chars',
  store: new FileSessionStore({
    path: path.join(__dirname, '..', '..', 'data', 'sessions'),
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

// Serve static files (but not index.html at root - we handle that with auth)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
  index: false // Don't serve index.html automatically
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
