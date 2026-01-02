/**
 * Ping Service - Background server monitoring
 * Handles ICMP ping and TCP port checks for link and widget monitoring
 */

const ping = require('ping');
const net = require('net');

// In-memory cache of monitoring statuses
const statusCache = new Map();

// Active interval timers
const intervals = new Map();

// Service state
let isRunning = false;
let configGetter = null;

// Default settings
const defaultSettings = {
  defaultInterval: 60,
  timeout: 5000,
  retries: 2
};

/**
 * Perform an ICMP ping to a host
 */
async function icmpPing(host, timeout) {
  try {
    const result = await ping.promise.probe(host, {
      timeout: Math.ceil(timeout / 1000)
      // Let the ping package handle platform-specific flags automatically
    });
    return {
      alive: result.alive,
      latency: result.alive ? Math.round(parseFloat(result.time)) : null
    };
  } catch (err) {
    return { alive: false, latency: null, error: err.message };
  }
}

/**
 * Perform a TCP port check
 */
function tcpCheck(host, port, timeout) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      resolve({ alive: true, latency });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ alive: false, latency: null, error: 'timeout' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ alive: false, latency: null, error: err.message });
    });

    socket.connect(port, host);
  });
}

/**
 * Check a single host
 */
async function checkHost(hostConfig, settings) {
  const timeout = settings?.timeout || defaultSettings.timeout;
  const retries = settings?.retries || defaultSettings.retries;

  let lastResult = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (hostConfig.port) {
      lastResult = await tcpCheck(hostConfig.host, hostConfig.port, timeout);
    } else {
      lastResult = await icmpPing(hostConfig.host, timeout);
    }

    if (lastResult.alive) break;
  }

  return lastResult;
}

/**
 * Update status for a host
 */
async function updateHostStatus(hostId, hostConfig, settings) {
  const result = await checkHost(hostConfig, settings);
  const now = new Date().toISOString();

  const previousStatus = statusCache.get(hostId);
  const statusChanged = !previousStatus || previousStatus.status !== (result.alive ? 'online' : 'offline');

  const status = {
    hostId,
    host: hostConfig.host,
    port: hostConfig.port || null,
    status: result.alive ? 'online' : 'offline',
    latency: result.latency,
    lastChecked: now,
    lastStatusChange: statusChanged ? now : (previousStatus?.lastStatusChange || now),
    consecutiveFailures: result.alive ? 0 : ((previousStatus?.consecutiveFailures || 0) + 1),
    error: result.error || null
  };

  statusCache.set(hostId, status);
  return status;
}

/**
 * Schedule monitoring for a host
 */
function scheduleHost(hostId, hostConfig, settings) {
  // Clear any existing interval
  if (intervals.has(hostId)) {
    clearInterval(intervals.get(hostId));
  }

  const interval = (hostConfig.interval || settings?.defaultInterval || defaultSettings.defaultInterval) * 1000;

  // Do initial check
  updateHostStatus(hostId, hostConfig, settings);

  // Schedule periodic checks
  const timer = setInterval(() => {
    updateHostStatus(hostId, hostConfig, settings);
  }, interval);

  intervals.set(hostId, timer);
}

/**
 * Get all hosts to monitor from config
 */
function getAllMonitoredHosts() {
  if (!configGetter) return [];

  const config = configGetter();
  const hosts = [];
  const settings = config.settings?.monitoringSettings || defaultSettings;

  // Get monitored links
  const links = config.links || [];
  for (const link of links) {
    if (link.monitoring?.enabled) {
      let host = link.monitoring.host;

      // If no host specified, extract from URL
      if (!host && link.url) {
        try {
          host = new URL(link.url).hostname;
        } catch (e) {
          continue;
        }
      }

      if (host) {
        hosts.push({
          id: `link-${link.id}`,
          host,
          port: link.monitoring.port || null,
          interval: link.monitoring.interval || settings.defaultInterval,
          type: 'link',
          linkId: link.id
        });
      }
    }
  }

  // Get widget servers
  const widgets = config.widgets || [];
  for (const widget of widgets) {
    if (widget.type === 'server-monitor' && widget.enabled && widget.config?.servers) {
      for (const server of widget.config.servers) {
        hosts.push({
          id: `widget-${widget.id}-${server.id}`,
          host: server.host,
          port: server.port || null,
          interval: server.interval || settings.defaultInterval,
          type: 'widget',
          widgetId: widget.id,
          serverId: server.id,
          name: server.name
        });
      }
    }
  }

  return hosts;
}

/**
 * Refresh all monitored hosts (call after config changes)
 */
function refreshHosts() {
  if (!isRunning) return;

  const config = configGetter ? configGetter() : {};
  const settings = config.settings?.monitoringSettings || defaultSettings;
  const hosts = getAllMonitoredHosts();

  // Get current host IDs
  const currentHostIds = new Set(hosts.map(h => h.id));

  // Remove hosts that are no longer monitored
  for (const hostId of intervals.keys()) {
    if (!currentHostIds.has(hostId)) {
      clearInterval(intervals.get(hostId));
      intervals.delete(hostId);
      statusCache.delete(hostId);
    }
  }

  // Add/update hosts
  for (const hostConfig of hosts) {
    // Only reschedule if not already scheduled or interval changed
    const existingStatus = statusCache.get(hostConfig.id);
    if (!intervals.has(hostConfig.id) ||
        (existingStatus && existingStatus._interval !== hostConfig.interval)) {
      scheduleHost(hostConfig.id, hostConfig, settings);
      // Store interval for comparison
      if (statusCache.has(hostConfig.id)) {
        statusCache.get(hostConfig.id)._interval = hostConfig.interval;
      }
    }
  }
}

/**
 * Start the ping service
 */
function startService(getConfigFn) {
  if (isRunning) return;

  configGetter = getConfigFn;
  isRunning = true;

  console.log('Ping service started');
  refreshHosts();
}

/**
 * Stop the ping service
 */
function stopService() {
  isRunning = false;

  // Clear all intervals
  for (const timer of intervals.values()) {
    clearInterval(timer);
  }
  intervals.clear();
  statusCache.clear();

  console.log('Ping service stopped');
}

/**
 * Get status for a specific host
 */
function getStatus(hostId) {
  const status = statusCache.get(hostId);
  if (status) {
    // Remove internal properties
    const { _interval, ...cleanStatus } = status;
    return cleanStatus;
  }
  return null;
}

/**
 * Get all statuses
 */
function getAllStatuses() {
  const statuses = {};
  for (const [hostId, status] of statusCache) {
    const { _interval, ...cleanStatus } = status;
    statuses[hostId] = cleanStatus;
  }
  return statuses;
}

/**
 * Force an immediate check for a host
 */
async function forceCheck(hostId) {
  const hosts = getAllMonitoredHosts();
  const hostConfig = hosts.find(h => h.id === hostId);

  if (!hostConfig) {
    return null;
  }

  const config = configGetter ? configGetter() : {};
  const settings = config.settings?.monitoringSettings || defaultSettings;

  return await updateHostStatus(hostId, hostConfig, settings);
}

/**
 * Add a new host to monitor
 */
function addHost(hostId, hostConfig) {
  if (!isRunning) return;

  const config = configGetter ? configGetter() : {};
  const settings = config.settings?.monitoringSettings || defaultSettings;

  scheduleHost(hostId, hostConfig, settings);
}

/**
 * Remove a host from monitoring
 */
function removeHost(hostId) {
  if (intervals.has(hostId)) {
    clearInterval(intervals.get(hostId));
    intervals.delete(hostId);
  }
  statusCache.delete(hostId);
}

/**
 * Check if service is running
 */
function isServiceRunning() {
  return isRunning;
}

/**
 * Test a host directly (for admin testing)
 * @param {string} host - Host/IP to test
 * @param {number|null} port - Port for TCP check, null for ICMP
 * @returns {Promise<object>} - Test result
 */
async function testHost(host, port = null) {
  const timeout = defaultSettings.timeout;
  const startTime = Date.now();

  let result;
  if (port) {
    result = await tcpCheck(host, port, timeout);
  } else {
    result = await icmpPing(host, timeout);
  }

  return {
    host,
    port,
    status: result.alive ? 'online' : 'offline',
    latency: result.latency,
    error: result.error || null,
    checkedAt: new Date().toISOString(),
    method: port ? 'TCP' : 'ICMP'
  };
}

module.exports = {
  startService,
  stopService,
  getStatus,
  getAllStatuses,
  forceCheck,
  addHost,
  removeHost,
  refreshHosts,
  isServiceRunning,
  testHost
};
