// trustProxy makes Fastify honor X-Forwarded-Proto from a TLS-terminating
// reverse proxy, so Secure session cookies work when the browser uses HTTPS.
const fastify = require('fastify')({ logger: true, trustProxy: true });
const path = require('path');
const config = require('./config');
const { registerRoutes } = require('./routes');
const auth = require('./auth');
const FileSessionStore = require('./session-store');
const pingService = require('./ping-service');

// Register plugins
fastify.register(require('@fastify/formbody'));
// Raise the multipart file-size limit to 25 MB; the default 1 MB silently
// truncates larger uploads (e.g. background images).
fastify.register(require('@fastify/multipart'), { limits: { fileSize: 26214400 } });
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'dashma-secret-change-in-production-min-32-chars',
  store: new FileSessionStore({
    path: path.join(__dirname, '..', 'data', 'sessions'), // Store in src/data/sessions (persisted by Docker volume)
    ttl: 86400, // 24 hours in seconds
    reapInterval: 3600 // Clean up expired sessions every hour
  }),
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true', // Set COOKIE_SECURE=true whenever the browser reaches Dashma over HTTPS (direct or via a TLS-terminating proxy)
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

// Warn loudly if running in production without a strong, custom SESSION_SECRET.
// The session secret signs the session cookie; using the shipped default makes
// sessions forgeable. Set a random value >= 32 chars (e.g. `openssl rand -base64 48`).
const DEFAULT_SESSION_SECRET = 'dashma-secret-change-in-production-min-32-chars';
if (process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEFAULT_SESSION_SECRET)) {
  console.warn(
    '[dashma] WARNING: SESSION_SECRET is unset or using the default value in production. ' +
    'Set a strong, unique SESSION_SECRET of at least 32 characters (e.g. `openssl rand -base64 48`) ' +
    'so session cookies cannot be forged.'
  );
}

// Initialize config on startup
config.loadConfig();

// Start ping service for monitoring
pingService.startService(() => config.getConfig());

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

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  pingService.stopService();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
