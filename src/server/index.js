const fastify = require('fastify')({ logger: true });
const path = require('path');
const config = require('./config');
const { registerRoutes } = require('./routes');

// Register plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'dashma-secret-change-in-production-min-32-chars',
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true', // Set COOKIE_SECURE=true if not behind a reverse proxy
    maxAge: 86400000 // 24 hours
  }
});

// Serve static files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/'
});

// Register routes
fastify.register(registerRoutes);

// Main page route
fastify.get('/', async (request, reply) => {
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
