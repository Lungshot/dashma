const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const defaultConfig = {
  settings: {
    siteName: 'Dashma',
    colorTheme: 'custom', // 'custom' means use individual color settings, otherwise theme ID
    backgroundColor: '#212121',
    backgroundImage: null,
    fontFamily: "'Courier New', Courier, monospace",
    titleFontFamily: "'Courier New', Courier, monospace",
    textColor: '#ffffff',
    accentColor: '#888888',
    categoryBgColor: 'rgba(255,255,255,0.03)',
    categoryTitleColor: '#ffffff',
    linkCardBgColor: 'rgba(255,255,255,0.05)',
    tagBgColor: 'rgba(255,255,255,0.1)',
    linkDisplayMode: 'cards',
    columns: 3,
    linkOpenBehavior: 'newTab',
    showLinkIcons: true,
    linkHoverEffect: 'glow',
    categoryHoverEffect: 'fade',
    nestingAnimation: 'slide',
    authMode: 'basic', // Admin auth: basic, entraId
    mainAuthMode: 'none', // Main site auth: none, basic, entraId
    entraId: {
      clientId: '',
      tenantId: '',
      clientSecret: '',
      redirectUri: ''
    },
    showRequestLink: false,
    requestLinkText: 'Request Link Addition',
    requestLinkUrl: '/request'
  },
  admin: {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin', 10),
    mustChangePassword: true
  },
  users: [], // Regular users for main site auth: { id, username, passwordHash, createdAt }
  categories: [],
  links: [],
  requests: {
    categories: [], // { id, name, status: 'pending'|'approved'|'denied', submittedAt, submittedBy, reviewedAt, reviewedBy }
    links: [] // { id, name, url, categoryId, tags, status: 'pending'|'approved'|'denied', submittedAt, submittedBy, reviewedAt, reviewedBy }
  }
};

let configCache = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      configCache = JSON.parse(data);
    } else {
      configCache = JSON.parse(JSON.stringify(defaultConfig));
      saveConfig();
    }
  } catch (err) {
    console.error('Error loading config:', err);
    configCache = JSON.parse(JSON.stringify(defaultConfig));
  }
  return configCache;
}

function saveConfig() {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
  } catch (err) {
    console.error('Error saving config:', err);
    throw err;
  }
}

function getConfig() {
  if (!configCache) {
    loadConfig();
  }
  return configCache;
}

function updateSettings(newSettings) {
  const config = getConfig();
  config.settings = { ...config.settings, ...newSettings };
  saveConfig();
  return config.settings;
}

function getPublicSettings() {
  const config = getConfig();
  return {
    siteName: config.settings.siteName,
    colorTheme: config.settings.colorTheme,
    titleSize: config.settings.titleSize,
    titleAlignment: config.settings.titleAlignment,
    titleHoverEffect: config.settings.titleHoverEffect,
    titleLinkUrl: config.settings.titleLinkUrl,
    showTitle: config.settings.showTitle,
    showLogo: config.settings.showLogo,
    siteLogo: config.settings.siteLogo,
    siteLogoMode: config.settings.siteLogoMode,
    logoSize: config.settings.logoSize,
    logoPosition: config.settings.logoPosition,
    logoAlignment: config.settings.logoAlignment,
    backgroundColor: config.settings.backgroundColor,
    backgroundImage: config.settings.backgroundImage,
    fontFamily: config.settings.fontFamily,
    titleFontFamily: config.settings.titleFontFamily,
    textColor: config.settings.textColor,
    accentColor: config.settings.accentColor,
    categoryBgColor: config.settings.categoryBgColor,
    categoryTitleColor: config.settings.categoryTitleColor,
    linkCardBgColor: config.settings.linkCardBgColor,
    tagBgColor: config.settings.tagBgColor,
    linkDisplayMode: config.settings.linkDisplayMode,
    columns: config.settings.columns,
    linkOpenBehavior: config.settings.linkOpenBehavior,
    showLinkIcons: config.settings.showLinkIcons,
    showCategoryBackground: config.settings.showCategoryBackground,
    showCategoryArrow: config.settings.showCategoryArrow,
    linkHoverEffect: config.settings.linkHoverEffect,
    categoryHoverEffect: config.settings.categoryHoverEffect,
    categoryHeadingSize: config.settings.categoryHeadingSize,
    nestingAnimation: config.settings.nestingAnimation,
    showFooter: config.settings.showFooter,
    footerText: config.settings.footerText,
    footerSize: config.settings.footerSize,
    footerAlignment: config.settings.footerAlignment,
    footerHoverEffect: config.settings.footerHoverEffect,
    authMode: config.settings.authMode,
    mainAuthMode: config.settings.mainAuthMode,
    showRequestLink: config.settings.showRequestLink,
    requestLinkText: config.settings.requestLinkText,
    requestLinkUrl: config.settings.requestLinkUrl
  };
}

// Category functions
function getCategories() {
  return getConfig().categories;
}

function addCategory(category) {
  const config = getConfig();
  const newCategory = {
    id: uuidv4(),
    name: category.name,
    order: config.categories.length,
    ...category
  };
  config.categories.push(newCategory);
  saveConfig();
  return newCategory;
}

function updateCategory(id, updates) {
  const config = getConfig();
  const index = config.categories.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Category not found');
  config.categories[index] = { ...config.categories[index], ...updates };
  saveConfig();
  return config.categories[index];
}

function deleteCategory(id) {
  const config = getConfig();
  config.categories = config.categories.filter(c => c.id !== id);
  config.links = config.links.filter(l => l.categoryId !== id);
  saveConfig();
}

function reorderCategories(orderedIds) {
  const config = getConfig();
  config.categories = orderedIds.map((id, index) => {
    const cat = config.categories.find(c => c.id === id);
    if (cat) cat.order = index;
    return cat;
  }).filter(Boolean);
  saveConfig();
}

// Link functions
function getLinks() {
  return getConfig().links;
}

function addLink(link) {
  const config = getConfig();
  const newLink = {
    id: uuidv4(),
    name: link.name,
    url: link.url,
    categoryId: link.categoryId,
    tags: link.tags || [],
    icon: link.icon || null,
    customIcon: link.customIcon || null,
    openBehavior: link.openBehavior || null,
    order: config.links.filter(l => l.categoryId === link.categoryId).length,
    ...link
  };
  config.links.push(newLink);
  saveConfig();
  return newLink;
}

function updateLink(id, updates) {
  const config = getConfig();
  const index = config.links.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Link not found');
  config.links[index] = { ...config.links[index], ...updates };
  saveConfig();
  return config.links[index];
}

function deleteLink(id) {
  const config = getConfig();
  config.links = config.links.filter(l => l.id !== id);
  saveConfig();
}

function reorderLinks(categoryId, orderedIds) {
  const config = getConfig();
  orderedIds.forEach((id, index) => {
    const link = config.links.find(l => l.id === id);
    if (link) link.order = index;
  });
  saveConfig();
}

// Admin functions
function verifyAdmin(username, password) {
  const config = getConfig();
  if (config.admin.username !== username) return false;
  return bcrypt.compareSync(password, config.admin.passwordHash);
}

function updateAdminCredentials(username, newPassword) {
  const config = getConfig();
  if (username) config.admin.username = username;
  if (newPassword) {
    config.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
    config.admin.mustChangePassword = false;
  }
  saveConfig();
}

function mustChangePassword() {
  return getConfig().admin.mustChangePassword;
}

function getAdminUsername() {
  return getConfig().admin.username;
}

// User management functions
function getUsers() {
  const config = getConfig();
  if (!config.users) {
    config.users = [];
    saveConfig();
  }
  return config.users;
}

function addUser(username, password) {
  const config = getConfig();
  if (!config.users) {
    config.users = [];
  }

  // Check if username already exists
  if (config.users.some(u => u.username === username)) {
    throw new Error('Username already exists');
  }

  const newUser = {
    id: uuidv4(),
    username: username,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };

  config.users.push(newUser);
  saveConfig();
  return { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt };
}

function updateUser(id, updates) {
  const config = getConfig();
  const index = config.users.findIndex(u => u.id === id);
  if (index === -1) throw new Error('User not found');

  if (updates.username) {
    // Check if new username conflicts with existing
    const existing = config.users.find(u => u.username === updates.username && u.id !== id);
    if (existing) throw new Error('Username already exists');
    config.users[index].username = updates.username;
  }

  if (updates.password) {
    config.users[index].passwordHash = bcrypt.hashSync(updates.password, 10);
  }

  saveConfig();
  return { id: config.users[index].id, username: config.users[index].username, createdAt: config.users[index].createdAt };
}

function deleteUser(id) {
  const config = getConfig();
  config.users = config.users.filter(u => u.id !== id);
  saveConfig();
}

function verifyUser(username, password) {
  const config = getConfig();
  const user = config.users.find(u => u.username === username);
  if (!user) return null;
  if (bcrypt.compareSync(password, user.passwordHash)) {
    return { id: user.id, username: user.username };
  }
  return null;
}

// Export/Import
function exportConfig() {
  const config = getConfig();

  // Create a copy of settings without auth-related fields
  const { authMode, mainAuthMode, entraId, ...appearanceSettings } = config.settings;

  // Return only Appearance, Categories, Links, and Account settings
  // Excludes: authMode, mainAuthMode, entraId, users, requests
  return {
    settings: appearanceSettings,
    categories: config.categories,
    links: config.links,
    admin: config.admin
  };
}

function importConfig(newConfig) {
  const currentConfig = getConfig();

  // Preserve auth settings if not in imported config
  const mergedSettings = {
    ...newConfig.settings,
    authMode: newConfig.settings?.authMode || currentConfig.settings.authMode,
    mainAuthMode: newConfig.settings?.mainAuthMode || currentConfig.settings.mainAuthMode,
    entraId: newConfig.settings?.entraId || currentConfig.settings.entraId
  };

  // Merge imported config with preserved auth settings
  configCache = {
    ...currentConfig,
    settings: mergedSettings,
    categories: newConfig.categories || currentConfig.categories,
    links: newConfig.links || currentConfig.links,
    admin: newConfig.admin || currentConfig.admin
    // users and requests are preserved from current config
  };

  saveConfig();
}

// Request management functions
function getRequests() {
  const config = getConfig();
  if (!config.requests) {
    config.requests = { categories: [], links: [] };
    saveConfig();
  }
  return config.requests;
}

function addCategoryRequest(categoryData, submittedBy = 'anonymous') {
  const config = getConfig();
  if (!config.requests) {
    config.requests = { categories: [], links: [] };
  }

  const newRequest = {
    id: uuidv4(),
    name: categoryData.name,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    submittedBy: submittedBy,
    reviewedAt: null,
    reviewedBy: null
  };

  config.requests.categories.push(newRequest);
  saveConfig();
  return newRequest;
}

function addLinkRequest(linkData, submittedBy = 'anonymous') {
  const config = getConfig();
  if (!config.requests) {
    config.requests = { categories: [], links: [] };
  }

  const newRequest = {
    id: uuidv4(),
    name: linkData.name,
    url: linkData.url,
    categoryId: linkData.categoryId,
    pendingCategoryId: linkData.pendingCategoryId || null, // Reference to pending category request
    tags: linkData.tags || [],
    status: 'pending',
    submittedAt: new Date().toISOString(),
    submittedBy: submittedBy,
    reviewedAt: null,
    reviewedBy: null
  };

  config.requests.links.push(newRequest);
  saveConfig();
  return newRequest;
}

function approveCategoryRequest(requestId, reviewedBy = 'admin') {
  const config = getConfig();
  const request = config.requests.categories.find(r => r.id === requestId);
  if (!request) throw new Error('Request not found');

  // Create the actual category
  const newCategory = addCategory({ name: request.name });

  // Update request status
  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = reviewedBy;
  request.approvedCategoryId = newCategory.id;

  // Update any pending link requests that reference this category
  config.requests.links.forEach(linkReq => {
    if (linkReq.pendingCategoryId === requestId) {
      linkReq.categoryId = newCategory.id;
      linkReq.pendingCategoryId = null;
    }
  });

  saveConfig();
  return { request, category: newCategory };
}

function approveLinkRequest(requestId, reviewedBy = 'admin') {
  const config = getConfig();
  const request = config.requests.links.find(r => r.id === requestId);
  if (!request) throw new Error('Request not found');

  // Check if categoryId is valid
  if (!request.categoryId) {
    throw new Error('Link request has no valid category. Approve the category request first.');
  }

  // Create the actual link
  const newLink = addLink({
    name: request.name,
    url: request.url,
    categoryId: request.categoryId,
    tags: request.tags
  });

  // Update request status
  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = reviewedBy;
  request.approvedLinkId = newLink.id;

  saveConfig();
  return { request, link: newLink };
}

function denyRequest(type, requestId, reviewedBy = 'admin') {
  const config = getConfig();
  const requestList = type === 'category' ? config.requests.categories : config.requests.links;
  const request = requestList.find(r => r.id === requestId);
  if (!request) throw new Error('Request not found');

  request.status = 'denied';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = reviewedBy;

  // If denying a category, also deny any link requests that depend on it
  if (type === 'category') {
    config.requests.links.forEach(linkReq => {
      if (linkReq.pendingCategoryId === requestId && linkReq.status === 'pending') {
        linkReq.status = 'denied';
        linkReq.reviewedAt = new Date().toISOString();
        linkReq.reviewedBy = reviewedBy;
      }
    });
  }

  saveConfig();
  return request;
}

function deleteRequest(type, requestId) {
  const config = getConfig();
  if (type === 'category') {
    config.requests.categories = config.requests.categories.filter(r => r.id !== requestId);
  } else {
    config.requests.links = config.requests.links.filter(r => r.id !== requestId);
  }
  saveConfig();
}

function getPendingCategoryRequests() {
  const config = getConfig();
  if (!config.requests) return [];
  return config.requests.categories.filter(r => r.status === 'pending');
}

module.exports = {
  loadConfig,
  getConfig,
  updateSettings,
  getPublicSettings,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getLinks,
  addLink,
  updateLink,
  deleteLink,
  reorderLinks,
  verifyAdmin,
  updateAdminCredentials,
  mustChangePassword,
  getAdminUsername,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  verifyUser,
  exportConfig,
  importConfig,
  // Request management
  getRequests,
  addCategoryRequest,
  addLinkRequest,
  approveCategoryRequest,
  approveLinkRequest,
  denyRequest,
  deleteRequest,
  getPendingCategoryRequests
};
