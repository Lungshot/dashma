const { ConfidentialClientApplication } = require('@azure/msal-node');
const config = require('./config');

let msalClient = null;

function initMsal() {
  const settings = config.getConfig().settings;
  if (settings.authMode === 'entraId' && settings.entraId.clientId) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: settings.entraId.clientId,
        authority: `https://login.microsoftonline.com/${settings.entraId.tenantId}`,
        clientSecret: settings.entraId.clientSecret
      }
    });
  }
  return msalClient;
}

function getMsalClient() {
  if (!msalClient) {
    initMsal();
  }
  return msalClient;
}

function getAuthUrl(redirectUri) {
  const client = getMsalClient();
  if (!client) return null;
  
  return client.getAuthCodeUrl({
    scopes: ['user.read'],
    redirectUri: redirectUri
  });
}

async function handleCallback(code, redirectUri) {
  const client = getMsalClient();
  if (!client) return null;
  
  try {
    const response = await client.acquireTokenByCode({
      code: code,
      scopes: ['user.read'],
      redirectUri: redirectUri
    });
    return response;
  } catch (err) {
    console.error('MSAL error:', err);
    return null;
  }
}

function requireAuth(request, reply, done) {
  const settings = config.getConfig().settings;
  
  if (settings.authMode === 'none') {
    done();
    return;
  }
  
  if (!request.session || !request.session.authenticated) {
    reply.redirect('/admin/login');
    return;
  }
  
  done();
}

function requireMainAuth(request, reply, done) {
  const settings = config.getConfig().settings;
  
  if (settings.authMode === 'none') {
    done();
    return;
  }
  
  if (settings.mainPageAuth && (!request.session || !request.session.authenticated)) {
    reply.redirect('/admin/login?redirect=/');
    return;
  }
  
  done();
}

module.exports = {
  initMsal,
  getMsalClient,
  getAuthUrl,
  handleCallback,
  requireAuth,
  requireMainAuth
};
