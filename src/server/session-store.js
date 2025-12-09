const fs = require('fs');
const path = require('path');

/**
 * Custom file-based session store for @fastify/session
 * Sessions are stored as JSON files with TTL support
 */
class FileSessionStore {
  constructor(options = {}) {
    this.path = options.path || path.join(__dirname, '..', '..', 'data', 'sessions');
    this.ttl = options.ttl || 86400; // Default 24 hours in seconds

    // Ensure directory exists
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path, { recursive: true });
    }

    // Clean up expired sessions periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, (options.reapInterval || 3600) * 1000); // Default every hour
  }

  getFilePath(sessionId) {
    // Sanitize session ID to prevent path traversal
    const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.path, `${safeId}.json`);
  }

  set(sessionId, session, callback) {
    try {
      const filePath = this.getFilePath(sessionId);
      const data = {
        session: session,
        expires: Date.now() + (this.ttl * 1000)
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      callback(null);
    } catch (err) {
      console.error('Session store set error:', err);
      callback(err);
    }
  }

  get(sessionId, callback) {
    try {
      const filePath = this.getFilePath(sessionId);

      if (!fs.existsSync(filePath)) {
        return callback(null, null);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Check if session has expired
      if (data.expires && data.expires < Date.now()) {
        // Session expired, delete it
        this.destroy(sessionId, () => {});
        return callback(null, null);
      }

      callback(null, data.session);
    } catch (err) {
      console.error('Session store get error:', err);
      callback(null, null);
    }
  }

  destroy(sessionId, callback) {
    try {
      const filePath = this.getFilePath(sessionId);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      callback(null);
    } catch (err) {
      console.error('Session store destroy error:', err);
      callback(err);
    }
  }

  // Touch method to extend session TTL (called when rolling is true)
  touch(sessionId, session, callback) {
    // Just re-save the session to update the expiry
    this.set(sessionId, session, callback);
  }

  // Cleanup expired sessions
  cleanup() {
    try {
      if (!fs.existsSync(this.path)) return;

      const files = fs.readdirSync(this.path);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.path, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent);

          if (data.expires && data.expires < now) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          // Ignore individual file errors
        }
      }
    } catch (err) {
      console.error('Session cleanup error:', err);
    }
  }

  // Stop the cleanup interval (for graceful shutdown)
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = FileSessionStore;
