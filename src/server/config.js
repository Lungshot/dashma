const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const defaultConfig = {
  settings: {
    siteName: 'Dashma',
    backgroundColor: '#212121',
    backgroundImage: null,
    fontFamily: "'Courier New', Courier, monospace",
    titleFontFamily: "'Courier New', Courier, monospace",
    textColor: '#ffffff',
    accentColor: '#888888',
    linkDisplayMode: 'cards',
    columns: 3,
    linkOpenBehavior: 'newTab',
    showLinkIcons: true,
    linkHoverEffect: 'glow',
    categoryHoverEffect: 'fade',
    nestingAnimation: 'slide',
    authMode: 'basic',
    entraId: {
      clientId: '',
      tenantId: '',
      clientSecret: '',
      redirectUri: ''
    }
  },
  admin: {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin', 10),
    mustChangePassword: true
  },
  categories: [],
  links: []
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
    titleSize: config.settings.titleSize,
    titleAlignment: config.settings.titleAlignment,
    showTitle: config.settings.showTitle,
    siteLogo: config.settings.siteLogo,
    siteLogoMode: config.settings.siteLogoMode,
    backgroundColor: config.settings.backgroundColor,
    backgroundImage: config.settings.backgroundImage,
    fontFamily: config.settings.fontFamily,
    titleFontFamily: config.settings.titleFontFamily,
    textColor: config.settings.textColor,
    accentColor: config.settings.accentColor,
    linkDisplayMode: config.settings.linkDisplayMode,
    columns: config.settings.columns,
    linkOpenBehavior: config.settings.linkOpenBehavior,
    showLinkIcons: config.settings.showLinkIcons,
    showCategoryBackground: config.settings.showCategoryBackground,
    linkHoverEffect: config.settings.linkHoverEffect,
    categoryHoverEffect: config.settings.categoryHoverEffect,
    categoryHeadingSize: config.settings.categoryHeadingSize,
    nestingAnimation: config.settings.nestingAnimation,
    authMode: config.settings.authMode
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

// Export/Import
function exportConfig() {
  return getConfig();
}

function importConfig(newConfig) {
  configCache = newConfig;
  saveConfig();
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
  exportConfig,
  importConfig
};
