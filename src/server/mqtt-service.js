const mqtt = require('mqtt');

const clients = new Map();
const widgetStates = new Map();

let configGetter = null;
let isRunning = false;

const DEFAULT_PORTS = {
  ws: 80,
  wss: 443,
  mqtt: 1883,
  mqtts: 8883
};

function getWidgetKey(widgetId) {
  return `mqtt-${widgetId}`;
}

function normalizePayload(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer ?? '');

  try {
    const parsed = JSON.parse(raw);
    return {
      raw,
      pretty: JSON.stringify(parsed, null, 2),
      isJson: true
    };
  } catch (err) {
    return {
      raw,
      pretty: raw,
      isJson: false
    };
  }
}

function updateWidgetState(widgetId, partialState) {
  const key = getWidgetKey(widgetId);
  const previous = widgetStates.get(key) || {
    widgetId,
    status: 'offline',
    topic: null,
    protocol: null,
    host: null,
    port: null,
    clientId: null,
    username: null,
    password: null,
    qos: 0,
    messageCount: 0,
    lastMessageAt: null,
    lastError: null,
    payloadRaw: '',
    payloadPretty: '',
    payloadIsJson: false
  };

  const next = { ...previous, ...partialState };
  widgetStates.set(key, next);
  return next;
}

function buildBrokerUrl(widgetConfig) {
  const protocol = widgetConfig.protocol || 'ws';
  const host = widgetConfig.host;
  const port = widgetConfig.port || DEFAULT_PORTS[protocol];

  if (!host) {
    throw new Error('MQTT host is required');
  }

  if (!DEFAULT_PORTS[protocol]) {
    throw new Error(`Unsupported MQTT protocol: ${protocol}`);
  }

  return `${protocol}://${host}:${port}`;
}

function connectWidget(widget) {
  const cfg = widget.config || {};
  const key = getWidgetKey(widget.id);

  try {
    if (!cfg.host || !cfg.topic) {
      updateWidgetState(widget.id, {
        status: 'offline',
        protocol: cfg.protocol || 'ws',
        host: cfg.host || null,
        port: cfg.port || null,
        clientId: cfg.clientId || null,
        username: cfg.username || null,
        password: cfg.password || null,
        qos: Number(cfg.qos || 0),
        topic: cfg.topic || null,
        lastError: !cfg.host ? 'MQTT host is required' : 'MQTT topic is required'
      });
      return;
    }

    const brokerUrl = buildBrokerUrl(cfg);
    const clientId = cfg.clientId || `inventordash-${widget.id.slice(0, 8)}`;
    const options = {
      clientId,
      username: cfg.username || undefined,
      password: cfg.password || undefined,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      clean: true
    };

    updateWidgetState(widget.id, {
      status: 'connecting',
      protocol: cfg.protocol || 'ws',
      host: cfg.host,
      port: cfg.port || DEFAULT_PORTS[cfg.protocol || 'ws'],
      clientId,
      username: cfg.username || null,
      password: cfg.password || null,
      qos: Number(cfg.qos || 0),
      topic: cfg.topic,
      lastError: null
    });

    const client = mqtt.connect(brokerUrl, options);
    clients.set(key, client);

    client.on('connect', () => {
      updateWidgetState(widget.id, {
        status: 'online',
        lastError: null
      });

      client.subscribe(cfg.topic, { qos: Number(cfg.qos || 0) }, (err) => {
        if (err) {
          updateWidgetState(widget.id, {
            status: 'error',
            lastError: err.message
          });
        }
      });
    });

    client.on('reconnect', () => {
      updateWidgetState(widget.id, {
        status: 'connecting'
      });
    });

    client.on('offline', () => {
      updateWidgetState(widget.id, {
        status: 'offline'
      });
    });

    client.on('error', (err) => {
      updateWidgetState(widget.id, {
        status: 'error',
        lastError: err.message
      });
    });

    client.on('message', (topic, payload) => {
      const normalized = normalizePayload(payload);
      const current = widgetStates.get(key);

      updateWidgetState(widget.id, {
        status: 'online',
        topic,
        lastMessageAt: new Date().toISOString(),
        lastError: null,
        messageCount: (current?.messageCount || 0) + 1,
        payloadRaw: normalized.raw,
        payloadPretty: normalized.pretty,
        payloadIsJson: normalized.isJson
      });
    });
  } catch (err) {
    updateWidgetState(widget.id, {
      status: 'error',
      protocol: cfg.protocol || 'ws',
      host: cfg.host || null,
      port: cfg.port || null,
      clientId: cfg.clientId || null,
      username: cfg.username || null,
      password: cfg.password || null,
      qos: Number(cfg.qos || 0),
      topic: cfg.topic || null,
      lastError: err.message
    });
  }
}

function disconnectWidget(widgetId) {
  const key = getWidgetKey(widgetId);
  const client = clients.get(key);
  if (client) {
    client.end(true);
    clients.delete(key);
  }
}

function getConfiguredWidgets() {
  if (!configGetter) return [];
  const cfg = configGetter();
  return (cfg.widgets || []).filter(widget => {
    const protocol = widget.config?.protocol || 'ws';
    return widget.enabled && widget.type === 'mqtt' && protocol !== 'ws' && protocol !== 'wss';
  });
}

function refreshWidgets() {
  if (!isRunning) return;

  const widgets = getConfiguredWidgets();
  const activeKeys = new Set(widgets.map(widget => getWidgetKey(widget.id)));

  for (const [key, client] of clients.entries()) {
    if (!activeKeys.has(key)) {
      client.end(true);
      clients.delete(key);
      widgetStates.delete(key);
    }
  }

  for (const widget of widgets) {
    const key = getWidgetKey(widget.id);
    const existing = widgetStates.get(key);
    const cfg = widget.config || {};

    const hasRelevantChange = !existing ||
      existing.topic !== (cfg.topic || null) ||
      existing.protocol !== (cfg.protocol || 'ws') ||
      existing.host !== (cfg.host || null) ||
      existing.port !== (cfg.port || DEFAULT_PORTS[cfg.protocol || 'ws']) ||
      existing.clientId !== (cfg.clientId || `inventordash-${widget.id.slice(0, 8)}`) ||
      existing.username !== (cfg.username || null) ||
      existing.password !== (cfg.password || null) ||
      existing.qos !== Number(cfg.qos || 0);

    if (hasRelevantChange) {
      disconnectWidget(widget.id);
      connectWidget(widget);
    }
  }
}

function startService(getConfigFn) {
  if (isRunning) return;
  configGetter = getConfigFn;
  isRunning = true;
  refreshWidgets();
}

function stopService() {
  isRunning = false;
  for (const client of clients.values()) {
    client.end(true);
  }
  clients.clear();
  widgetStates.clear();
}

function getAllStates() {
  return Object.fromEntries(widgetStates.entries());
}

module.exports = {
  startService,
  stopService,
  refreshWidgets,
  getAllStates
};
