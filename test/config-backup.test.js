'use strict';

// Unit tests for the configuration backup export/import round-trip (U1, U2).
// Run with: node --test
//
// config.js resolves its store path from DASHMA_CONFIG_PATH, so we point it at a
// throwaway temp file BEFORE requiring the module — the dev/prod config.json is
// never touched.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = path.join(os.tmpdir(), `dashma-test-config-${process.pid}.json`);
process.env.DASHMA_CONFIG_PATH = TMP;

const config = require('../src/server/config');

// Load a known config state into the module cache by writing the temp file and
// reloading from it.
function loadState(obj) {
  fs.writeFileSync(TMP, JSON.stringify(obj, null, 2));
  config.loadConfig();
}

function blankState() {
  if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
  config.loadConfig(); // recreates defaultConfig on disk
}

// A fully-configured source instance: SSO on, roles, mappings, users, widgets,
// per-category role access, and a pending request queue.
function fullSource() {
  return {
    settings: {
      siteName: 'Source',
      authMode: 'entraId',
      mainAuthMode: 'entraId',
      entraId: {
        clientId: 'cid',
        tenantId: 'tid',
        clientSecret: 'super-secret',
        redirectUri: 'https://old-host/callback',
        adminAllowlist: ['boss@example.com']
      },
      roles: [{ id: 'hr', name: 'HR' }],
      entraRoleAssignments: { 'boss@example.com': ['hr'] }
    },
    admin: { username: 'boss', passwordHash: 'BCRYPT_HASH', mustChangePassword: false },
    users: [
      { id: 'u1', username: 'alice', passwordHash: 'h1', roles: ['hr'], createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'u2', username: 'bob', passwordHash: 'h2', roles: [], createdAt: '2026-01-02T00:00:00.000Z' }
    ],
    ssoUsers: [{ email: 'boss@example.com', name: 'Boss', firstSeen: 't0', lastSeen: 't1' }],
    categories: [
      { id: 'c1', name: 'HR Stuff', order: 0, access: { visibility: 'roles', roles: ['hr'] } }
    ],
    links: [{ id: 'l1', name: 'Payroll', url: 'https://payroll', categoryId: 'c1', tags: [], order: 0 }],
    widgets: [{ id: 'w1', type: 'clock', enabled: true, position: 'above-categories', order: 0, title: null, config: {} }],
    requests: { categories: [{ id: 'rq1', name: 'Pending Cat', status: 'pending' }], links: [] }
  };
}

test.afterEach(() => {
  if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
  config.loadConfig(); // reset the module cache so isolation does not depend on each test calling loadState()
});

// --- U1: exportConfig ------------------------------------------------------

test('U1/R1+R2: export carries auth mode and SSO connection', () => {
  loadState(fullSource());
  const out = config.exportConfig();
  assert.strictEqual(out.settings.authMode, 'entraId');
  assert.strictEqual(out.settings.mainAuthMode, 'entraId');
  assert.deepStrictEqual(out.settings.entraId, fullSource().settings.entraId);
});

test('U1/R3: export carries roles and SSO role mappings', () => {
  loadState(fullSource());
  const out = config.exportConfig();
  assert.deepStrictEqual(out.settings.roles, [{ id: 'hr', name: 'HR' }]);
  assert.deepStrictEqual(out.settings.entraRoleAssignments, { 'boss@example.com': ['hr'] });
});

test('U1/R4: export carries users (with hashes) and ssoUsers', () => {
  loadState(fullSource());
  const out = config.exportConfig();
  assert.strictEqual(out.users.length, 2);
  assert.strictEqual(out.users[0].passwordHash, 'h1');
  assert.deepStrictEqual(out.users[0].roles, ['hr']);
  assert.strictEqual(out.ssoUsers.length, 1);
  assert.strictEqual(out.ssoUsers[0].email, 'boss@example.com');
});

test('U1/R5: export carries widgets', () => {
  loadState(fullSource());
  const out = config.exportConfig();
  assert.strictEqual(out.widgets.length, 1);
  assert.strictEqual(out.widgets[0].type, 'clock');
});

test('U1/R11: export omits requests and tags exportVersion', () => {
  loadState(fullSource());
  const out = config.exportConfig();
  assert.strictEqual(Object.prototype.hasOwnProperty.call(out, 'requests'), false);
  assert.strictEqual(out.exportVersion, 2);
});

test('U1: export of a minimal config returns [] for users/ssoUsers/widgets', () => {
  loadState({
    settings: { siteName: 'Min' },
    categories: [],
    links: [],
    admin: { username: 'admin', passwordHash: 'h' }
    // no users / ssoUsers / widgets keys
  });
  const out = config.exportConfig();
  assert.deepStrictEqual(out.users, []);
  assert.deepStrictEqual(out.ssoUsers, []);
  assert.deepStrictEqual(out.widgets, []);
});

// --- U2: importConfig ------------------------------------------------------

test('U2/R7: round-trip restores the full instance into a blank config', () => {
  // Export from a fully-configured source...
  loadState(fullSource());
  const exported = config.exportConfig();

  // ...then import into a blank/default instance.
  blankState();
  config.importConfig(exported);
  const result = config.getConfig();

  const src = fullSource();
  assert.strictEqual(result.settings.authMode, 'entraId');
  assert.strictEqual(result.settings.mainAuthMode, 'entraId');
  assert.deepStrictEqual(result.settings.entraId, src.settings.entraId);
  assert.deepStrictEqual(result.settings.roles, src.settings.roles);
  assert.deepStrictEqual(result.settings.entraRoleAssignments, src.settings.entraRoleAssignments);
  assert.deepStrictEqual(result.admin, src.admin);
  assert.deepStrictEqual(result.users, src.users);
  assert.deepStrictEqual(result.ssoUsers, src.ssoUsers);
  assert.deepStrictEqual(result.categories, src.categories); // includes access rules
  assert.deepStrictEqual(result.links, src.links);
  assert.deepStrictEqual(result.widgets, src.widgets);
});

test('U2/R8: v1 backup without auth/users does not blank a configured target', () => {
  loadState(fullSource()); // target already has SSO + 2 users
  const v1 = {
    settings: { siteName: 'V1 Appearance', backgroundColor: '#000000' },
    categories: [{ id: 'c9', name: 'New', order: 0 }],
    links: [],
    admin: { username: 'boss', passwordHash: 'BCRYPT_HASH', mustChangePassword: false }
  };
  config.importConfig(v1);
  const result = config.getConfig();

  // Auth + users retained from the target (absent from the v1 file).
  assert.strictEqual(result.settings.authMode, 'entraId');
  assert.deepStrictEqual(result.settings.entraId, fullSource().settings.entraId);
  assert.strictEqual(result.users.length, 2);
  // Settings still merged — siteName updated from the file.
  assert.strictEqual(result.settings.siteName, 'V1 Appearance');
  assert.strictEqual(result.settings.backgroundColor, '#000000');
});

test('U2/R11: import never overwrites pending requests', () => {
  loadState(fullSource());
  const before = JSON.stringify(config.getConfig().requests);
  config.importConfig({ settings: { siteName: 'X' }, users: [] });
  assert.strictEqual(JSON.stringify(config.getConfig().requests), before);
});

test('U2 edge: explicit empty users array replaces current users', () => {
  loadState(fullSource());
  config.importConfig({ users: [] });
  assert.deepStrictEqual(config.getConfig().users, []);
});

test('U2 edge: importConfig({}) leaves every section unchanged', () => {
  const src = fullSource();
  loadState(src);
  config.importConfig({});
  const r = config.getConfig();
  assert.deepStrictEqual(r.users, src.users);
  assert.deepStrictEqual(r.admin, src.admin);
  assert.strictEqual(r.settings.authMode, 'entraId');
});

test('U2 error path: null / non-object / array throw and do not mutate', () => {
  loadState(fullSource());
  const snapshot = JSON.stringify(config.getConfig());
  assert.throws(() => config.importConfig(null), /Invalid config file/);
  assert.throws(() => config.importConfig('not an object'), /Invalid config file/);
  assert.throws(() => config.importConfig([]), /Invalid config file/);
  assert.strictEqual(JSON.stringify(config.getConfig()), snapshot);
});

test('U2 validation: malformed sections are rejected before any mutation', () => {
  loadState(fullSource());
  const snapshot = JSON.stringify(config.getConfig());

  // A null/!object admin would break admin login if persisted.
  assert.throws(() => config.importConfig({ admin: null }), /admin must include/);
  assert.throws(() => config.importConfig({ admin: { username: 'x' } }), /admin must include/);
  // Non-array list sections would crash the dashboard / admin API if persisted.
  assert.throws(() => config.importConfig({ users: 'not-an-array' }), /users must be an array/);
  assert.throws(() => config.importConfig({ categories: {} }), /categories must be an array/);
  // settings must be an object.
  assert.throws(() => config.importConfig({ settings: [] }), /settings must be an object/);

  // None of the rejected imports mutated the live config.
  assert.strictEqual(JSON.stringify(config.getConfig()), snapshot);
});
