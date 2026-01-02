// Dashma Admin JavaScript
(function() {
  'use strict';

  let appConfig = null;

  let users = [];
  let requests = { categories: [], links: [] };

  // Auto-save debounce timer
  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY = 800; // ms

  // Re-authentication handling
  let pendingRequest = null;
  let pendingResolve = null;
  let pendingReject = null;

  // Wrapper for fetch that handles 401 responses
  async function authFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      // Store the request details for retry and return a promise that resolves when re-auth completes
      return new Promise((resolve, reject) => {
        pendingRequest = { url, options };
        pendingResolve = resolve;
        pendingReject = reject;
        showReAuthModal();
      });
    }
    return response;
  }

  function showReAuthModal() {
    document.getElementById('reAuthModal').classList.add('active');
    document.getElementById('reAuthUsername').focus();
    document.getElementById('reAuthError').classList.add('hidden');
  }

  async function handleReAuth() {
    const username = document.getElementById('reAuthUsername').value;
    const password = document.getElementById('reAuthPassword').value;
    const errorEl = document.getElementById('reAuthError');

    if (!username || !password) {
      errorEl.textContent = 'Please enter username and password';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Login failed';
        errorEl.classList.remove('hidden');
        return;
      }

      // Success - close modal and retry pending request
      document.getElementById('reAuthModal').classList.remove('active');
      document.getElementById('reAuthPassword').value = '';
      showToast('Session restored');

      // Retry the pending request if there was one
      if (pendingRequest && pendingResolve) {
        const { url, options } = pendingRequest;
        pendingRequest = null;
        try {
          const retryResponse = await fetch(url, options);
          pendingResolve(retryResponse);
        } catch (err) {
          pendingReject(err);
        }
        pendingResolve = null;
        pendingReject = null;
      }
    } catch (err) {
      errorEl.textContent = 'Login failed: ' + err.message;
      errorEl.classList.remove('hidden');
    }
  }

  // Cancel re-auth (close modal without logging in)
  function cancelReAuth() {
    document.getElementById('reAuthModal').classList.remove('active');
    document.getElementById('reAuthPassword').value = '';
    if (pendingReject) {
      pendingReject(new Error('Authentication cancelled'));
      pendingResolve = null;
      pendingReject = null;
      pendingRequest = null;
    }
  }

  // Initialize
  async function init() {
    await loadConfig();
    await loadUsers();
    await loadRequests();
    setupNavigation();
    populateThemeDropdown();
    setupEventListeners();
    populateForm();
    renderCategories();
    renderLinks();
    renderWidgets();
    renderUsers();
    renderRequests();
    updateRequestsBadge();
  }

  // Populate theme dropdown with available themes
  function populateThemeDropdown() {
    const darkGroup = document.getElementById('darkThemesGroup');
    const lightGroup = document.getElementById('lightThemesGroup');

    if (!darkGroup || !lightGroup || typeof DASHMA_THEMES === 'undefined') return;

    const grouped = getThemesGrouped();

    darkGroup.innerHTML = grouped.dark.map(theme =>
      `<option value="${theme.id}">${theme.name}</option>`
    ).join('');

    lightGroup.innerHTML = grouped.light.map(theme =>
      `<option value="${theme.id}">${theme.name}</option>`
    ).join('');
  }

  // Handle theme selection change
  function handleThemeChange() {
    const themeId = document.getElementById('colorTheme').value;
    const customColorsContainer = document.getElementById('customColorsContainer');

    if (themeId === 'custom') {
      // Show custom color controls
      customColorsContainer.style.display = 'block';
    } else {
      // Hide custom color controls and apply theme colors
      customColorsContainer.style.display = 'none';

      const theme = getTheme(themeId);
      if (theme) {
        applyThemeToForm(theme.colors);
      }
    }
  }

  // Apply theme colors to the form inputs
  function applyThemeToForm(colors) {
    document.getElementById('backgroundColor').value = colors.backgroundColor;
    document.getElementById('bgColorPicker').value = colors.backgroundColor;
    document.getElementById('textColor').value = colors.textColor;
    document.getElementById('textColorPicker').value = colors.textColor;
    document.getElementById('accentColor').value = colors.accentColor;
    document.getElementById('accentColorPicker').value = colors.accentColor;
    document.getElementById('categoryBgColor').value = colors.categoryBgColor;
    document.getElementById('categoryBgColorPicker').value = rgbaToHex(colors.categoryBgColor);
    document.getElementById('categoryTitleColor').value = colors.categoryTitleColor;
    document.getElementById('categoryTitleColorPicker').value = colors.categoryTitleColor;
    document.getElementById('linkCardBgColor').value = colors.linkCardBgColor;
    document.getElementById('linkCardBgColorPicker').value = rgbaToHex(colors.linkCardBgColor);
    document.getElementById('tagBgColor').value = colors.tagBgColor;
    document.getElementById('tagBgColorPicker').value = rgbaToHex(colors.tagBgColor);
  }

  // Load configuration from API
  async function loadConfig() {
    try {
      const response = await authFetch('/api/admin/config');
      if (!response.ok) throw new Error('Failed to load config');
      appConfig = await response.json();
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to load configuration', true);
      }
      console.error(err);
    }
  }

  // Load users
  async function loadUsers() {
    try {
      const response = await authFetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to load users');
      users = await response.json();
    } catch (err) {
      if (err.message !== 'Authentication required') {
        console.error('Failed to load users:', err);
      }
      users = [];
    }
  }

  // Load requests
  async function loadRequests() {
    try {
      const response = await authFetch('/api/admin/requests');
      if (!response.ok) throw new Error('Failed to load requests');
      requests = await response.json();
    } catch (err) {
      console.error('Failed to load requests:', err);
      requests = { categories: [], links: [] };
    }
  }

  // Setup navigation
  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${panel}`).classList.add('active');

        if (panel === 'auth') {
          toggleEntraSettings();
          toggleUserManagement();
          renderUsers();
        }
        if (panel === 'requests') {
          renderRequests();
        }
      });
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Theme selection
    document.getElementById('colorTheme').addEventListener('change', handleThemeChange);

    // Color pickers sync
    setupColorPicker('bgColorPicker', 'backgroundColor');
    setupColorPicker('textColorPicker', 'textColor');
    setupColorPicker('accentColorPicker', 'accentColor');
    setupColorPicker('categoryBgColorPicker', 'categoryBgColor');
    setupColorPicker('categoryTitleColorPicker', 'categoryTitleColor');
    setupColorPicker('linkCardBgColorPicker', 'linkCardBgColor');
    setupColorPicker('tagBgColorPicker', 'tagBgColor');

    // Auto-save appearance on change
    setupAppearanceAutoSave();

    // Save appearance (keep for manual save if needed)
    document.getElementById('saveAppearance').addEventListener('click', saveAppearance);

    // Background image upload
    setupFileUpload('bgImageUpload', 'bgImageInput', handleBgImageUpload);
    document.getElementById('clearBgImage').addEventListener('click', clearBgImage);
    document.getElementById('resetColors').addEventListener('click', resetColors);

    // Logo upload
    setupFileUpload('logoImageUpload', 'logoImageInput', handleLogoImageUpload);
    document.getElementById('clearLogoImage').addEventListener('click', clearLogoImage);
    document.getElementById('siteLogoMode').addEventListener('change', toggleLogoUpload);
    document.getElementById('showLogo').addEventListener('change', toggleLogoOptions);

    // Re-authentication
    document.getElementById('reAuthBtn').addEventListener('click', handleReAuth);
    document.getElementById('reAuthPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleReAuth();
    });

    // Categories
    document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
    document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);

    // Links
    document.getElementById('addLinkBtn').addEventListener('click', () => {
      const filterCategory = document.getElementById('linkCategoryFilter').value;
      openLinkModal(null, filterCategory);
    });
    document.getElementById('saveLinkBtn').addEventListener('click', saveLink);
    document.getElementById('linkCategoryFilter').addEventListener('change', renderLinks);

    // Link monitoring toggle
    document.getElementById('linkMonitoringEnabled').addEventListener('change', toggleMonitoringOptions);

    // Widgets
    document.getElementById('addWidgetBtn').addEventListener('click', () => openWidgetModal());
    document.getElementById('saveWidgetBtn').addEventListener('click', saveWidget);
    document.getElementById('widgetType').addEventListener('change', handleWidgetTypeChange);
    document.getElementById('addServerBtn').addEventListener('click', addServerRow);

    // Widget color pickers
    setupColorPicker('serverItemBgPicker', 'serverItemBgColor');
    setupColorPicker('serverTextColorPicker', 'serverTextColor');
    setupColorPicker('serverContainerBgPicker', 'serverContainerBgColor');

    // Auth
    document.getElementById('authMode').addEventListener('change', toggleEntraSettings);
    document.getElementById('mainAuthMode').addEventListener('change', () => {
      toggleEntraSettings();
      toggleUserManagement();
    });
    document.getElementById('saveAuth').addEventListener('click', saveAuth);

    // Users
    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
    document.getElementById('saveUserBtn').addEventListener('click', saveUser);

    // Backup
    document.getElementById('exportConfig').addEventListener('click', exportConfig);
    setupFileUpload('importConfigUpload', 'importConfigInput', handleConfigImport);

    // Account
    document.getElementById('saveCredentials').addEventListener('click', saveCredentials);

    // Requests filters
    document.getElementById('categoryRequestFilter').addEventListener('change', renderRequests);
    document.getElementById('linkRequestFilter').addEventListener('change', renderRequests);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-overlay').classList.remove('active');
      });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  // Color picker helper
  function setupColorPicker(pickerId, inputId) {
    const picker = document.getElementById(pickerId);
    const input = document.getElementById(inputId);

    picker.addEventListener('input', () => {
      input.value = picker.value;
    });

    input.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
        picker.value = input.value;
      }
    });
  }

  // Auto-save appearance settings
  function setupAppearanceAutoSave() {
    const panel = document.getElementById('panel-appearance');

    // Get all inputs, selects, and checkboxes in the appearance panel
    const inputs = panel.querySelectorAll('input:not([type="file"]), select');

    inputs.forEach(input => {
      const eventType = (input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
      input.addEventListener(eventType, debounceAutoSave);
    });
  }

  function debounceAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveAppearance(true); // true = silent (no toast)
    }, AUTO_SAVE_DELAY);
  }

  // File upload helper
  function setupFileUpload(wrapperId, inputId, handler) {
    const wrapper = document.getElementById(wrapperId);
    const input = document.getElementById(inputId);

    wrapper.addEventListener('click', () => input.click());
    
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      wrapper.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });

    wrapper.addEventListener('dragleave', () => {
      wrapper.style.borderColor = '';
    });

    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.style.borderColor = '';
      if (e.dataTransfer.files.length) {
        handler(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        handler(input.files[0]);
      }
    });
  }

  // Populate form with current settings
  function populateForm() {
    if (!appConfig) return;
    const s = appConfig.settings;

    // Site Title
    document.getElementById('siteName').value = s.siteName || 'Dashma';
    setSelectValue('titleSize', s.titleSize || 'large');
    setSelectValue('titleAlignment', s.titleAlignment || 'center');
    setSelectValue('titleHoverEffect', s.titleHoverEffect || 'none');
    document.getElementById('titleLinkUrl').value = s.titleLinkUrl || '';
    document.getElementById('showTitle').checked = s.showTitle !== false;

    // Site Logo
    document.getElementById('showLogo').checked = s.showLogo !== false;
    setSelectValue('siteLogoMode', s.siteLogoMode || 'none');
    setSelectValue('logoSize', s.logoSize || 'medium');
    setSelectValue('logoPosition', s.logoPosition || 'above');
    setSelectValue('logoAlignment', s.logoAlignment || 'center');
    toggleLogoUpload();
    toggleLogoOptions();
    if (s.siteLogo) {
      document.getElementById('logoImagePreview').innerHTML =
        `<img src="${s.siteLogo}" class="preview-image" alt="Logo" style="max-height: 60px;">`;
    }

    // Color Theme
    const colorTheme = s.colorTheme || 'custom';
    setSelectValue('colorTheme', colorTheme);

    // Show/hide custom colors container based on theme
    const customColorsContainer = document.getElementById('customColorsContainer');
    if (colorTheme === 'custom') {
      customColorsContainer.style.display = 'block';
    } else {
      customColorsContainer.style.display = 'none';
    }

    // Colors
    document.getElementById('backgroundColor').value = s.backgroundColor || '#212121';
    document.getElementById('bgColorPicker').value = s.backgroundColor || '#212121';
    document.getElementById('textColor').value = s.textColor || '#ffffff';
    document.getElementById('textColorPicker').value = s.textColor || '#ffffff';
    document.getElementById('accentColor').value = s.accentColor || '#888888';
    document.getElementById('accentColorPicker').value = s.accentColor || '#888888';
    document.getElementById('categoryBgColor').value = s.categoryBgColor || 'rgba(255,255,255,0.03)';
    document.getElementById('categoryBgColorPicker').value = rgbaToHex(s.categoryBgColor) || '#ffffff';
    document.getElementById('categoryTitleColor').value = s.categoryTitleColor || '#ffffff';
    document.getElementById('categoryTitleColorPicker').value = s.categoryTitleColor || '#ffffff';
    document.getElementById('linkCardBgColor').value = s.linkCardBgColor || 'rgba(255,255,255,0.05)';
    document.getElementById('linkCardBgColorPicker').value = rgbaToHex(s.linkCardBgColor) || '#ffffff';
    document.getElementById('tagBgColor').value = s.tagBgColor || 'rgba(255,255,255,0.1)';
    document.getElementById('tagBgColorPicker').value = rgbaToHex(s.tagBgColor) || '#ffffff';

    // Background image preview
    if (s.backgroundImage) {
      document.getElementById('bgImagePreview').innerHTML = 
        `<img src="${s.backgroundImage}" class="preview-image" alt="Background">`;
    }

    // Typography
    setSelectValue('fontFamily', s.fontFamily);
    setSelectValue('titleFontFamily', s.titleFontFamily);

    // Layout
    setSelectValue('columns', s.columns);
    setSelectValue('linkDisplayMode', s.linkDisplayMode);
    setSelectValue('linkOpenBehavior', s.linkOpenBehavior);
    document.getElementById('showLinkIcons').checked = s.showLinkIcons !== false;
    document.getElementById('showCategoryBackground').checked = s.showCategoryBackground !== false;

    // Animations
    setSelectValue('linkHoverEffect', s.linkHoverEffect);
    setSelectValue('categoryHoverEffect', s.categoryHoverEffect);
    setSelectValue('categoryHeadingSize', s.categoryHeadingSize || 'medium');
    setSelectValue('nestingAnimation', s.nestingAnimation);
    document.getElementById('showCategoryArrow').checked = s.showCategoryArrow !== false;

    // Footer
    document.getElementById('showFooter').checked = s.showFooter === true;
    document.getElementById('footerText').value = s.footerText || '';
    setSelectValue('footerSize', s.footerSize || 'small');
    setSelectValue('footerAlignment', s.footerAlignment || 'center');
    setSelectValue('footerHoverEffect', s.footerHoverEffect || 'none');

    // Request Link
    document.getElementById('showRequestLink').checked = s.showRequestLink === true;
    document.getElementById('requestLinkText').value = s.requestLinkText || 'Request Link Addition';
    document.getElementById('requestLinkUrl').value = s.requestLinkUrl || '/request';

    // Auth
    setSelectValue('authMode', s.authMode || 'basic');
    setSelectValue('mainAuthMode', s.mainAuthMode || 'none');
    if (s.entraId) {
      document.getElementById('entraClientId').value = s.entraId.clientId || '';
      document.getElementById('entraTenantId').value = s.entraId.tenantId || '';
      document.getElementById('entraClientSecret').value = s.entraId.clientSecret || '';
      document.getElementById('entraRedirectUri').value = s.entraId.redirectUri || '';
    }
    toggleEntraSettings();
    toggleUserManagement();

    // Account
    document.getElementById('adminUsername').value = appConfig.admin.username || 'admin';

    // Populate category filters
    populateCategorySelects();
  }

  function setSelectValue(id, value) {
    const select = document.getElementById(id);
    if (select && value) {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value == value) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }

  function populateCategorySelects() {
    const categories = appConfig.categories || [];
    const filterSelect = document.getElementById('linkCategoryFilter');
    const linkCategorySelect = document.getElementById('linkCategory');

    // Filter select
    filterSelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
      filterSelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    });

    // Link modal select
    linkCategorySelect.innerHTML = '';
    categories.forEach(cat => {
      linkCategorySelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    });
  }

  // Toggle EntraID settings visibility
  function toggleEntraSettings() {
    const authMode = document.getElementById('authMode').value;
    const mainAuthMode = document.getElementById('mainAuthMode').value;
    const entraSettings = document.getElementById('entraIdSettings');
    // Show EntraID settings if either admin or main site uses EntraID
    entraSettings.style.display = (authMode === 'entraId' || mainAuthMode === 'entraId') ? 'block' : 'none';
  }

  // Toggle user management visibility
  function toggleUserManagement() {
    const mainAuthMode = document.getElementById('mainAuthMode').value;
    const userManagementCard = document.getElementById('userManagementCard');
    // Show user management only when main site uses basic auth
    userManagementCard.style.display = mainAuthMode === 'basic' ? 'block' : 'none';
  }

  // Toggle monitoring options visibility
  function toggleMonitoringOptions() {
    const enabled = document.getElementById('linkMonitoringEnabled').checked;
    const optionsContainer = document.getElementById('monitoringOptions');
    optionsContainer.style.display = enabled ? 'block' : 'none';
  }

  // Save appearance settings
  async function saveAppearance(silent = false) {
    const settings = {
      siteName: document.getElementById('siteName').value,
      titleSize: document.getElementById('titleSize').value,
      titleAlignment: document.getElementById('titleAlignment').value,
      titleHoverEffect: document.getElementById('titleHoverEffect').value,
      titleLinkUrl: document.getElementById('titleLinkUrl').value.trim() || null,
      showTitle: document.getElementById('showTitle').checked,
      showLogo: document.getElementById('showLogo').checked,
      siteLogoMode: document.getElementById('siteLogoMode').value,
      logoSize: document.getElementById('logoSize').value,
      logoPosition: document.getElementById('logoPosition').value,
      logoAlignment: document.getElementById('logoAlignment').value,
      colorTheme: document.getElementById('colorTheme').value,
      backgroundColor: document.getElementById('backgroundColor').value,
      textColor: document.getElementById('textColor').value,
      accentColor: document.getElementById('accentColor').value,
      categoryBgColor: document.getElementById('categoryBgColor').value,
      categoryTitleColor: document.getElementById('categoryTitleColor').value,
      linkCardBgColor: document.getElementById('linkCardBgColor').value,
      tagBgColor: document.getElementById('tagBgColor').value,
      fontFamily: document.getElementById('fontFamily').value,
      titleFontFamily: document.getElementById('titleFontFamily').value,
      columns: parseInt(document.getElementById('columns').value),
      linkDisplayMode: document.getElementById('linkDisplayMode').value,
      linkOpenBehavior: document.getElementById('linkOpenBehavior').value,
      showLinkIcons: document.getElementById('showLinkIcons').checked,
      showCategoryBackground: document.getElementById('showCategoryBackground').checked,
      linkHoverEffect: document.getElementById('linkHoverEffect').value,
      categoryHoverEffect: document.getElementById('categoryHoverEffect').value,
      categoryHeadingSize: document.getElementById('categoryHeadingSize').value,
      nestingAnimation: document.getElementById('nestingAnimation').value,
      showCategoryArrow: document.getElementById('showCategoryArrow').checked,
      showFooter: document.getElementById('showFooter').checked,
      footerText: document.getElementById('footerText').value.trim(),
      footerSize: document.getElementById('footerSize').value,
      footerAlignment: document.getElementById('footerAlignment').value,
      footerHoverEffect: document.getElementById('footerHoverEffect').value,
      showRequestLink: document.getElementById('showRequestLink').checked,
      requestLinkText: document.getElementById('requestLinkText').value.trim() || 'Request Link Addition',
      requestLinkUrl: document.getElementById('requestLinkUrl').value.trim() || '/requests'
    };

    try {
      const response = await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      appConfig.settings = { ...appConfig.settings, ...settings };
      if (!silent) {
        showToast('Appearance settings saved');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      if (err.message !== 'Authentication required') {
        showToast(err.message || 'Failed to save settings', true);
      }
    }
  }

  // Handle background image upload
  async function handleBgImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authFetch('/api/admin/upload/background', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();

      document.getElementById('bgImagePreview').innerHTML =
        `<img src="${result.url}" class="preview-image" alt="Background">`;
      appConfig.settings.backgroundImage = result.url;
      showToast('Background image uploaded');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to upload image', true);
      }
    }
  }

  // Clear background image
  async function clearBgImage() {
    try {
      await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundImage: null })
      });
      document.getElementById('bgImagePreview').innerHTML = '';
      appConfig.settings.backgroundImage = null;
      showToast('Background image cleared');
    } catch (err) {
      showToast('Failed to clear image', true);
    }
  }

  // Reset colors to default
  function resetColors() {
    const defaults = {
      backgroundColor: '#212121',
      textColor: '#ffffff',
      accentColor: '#888888',
      categoryBgColor: 'rgba(255,255,255,0.03)',
      categoryTitleColor: '#ffffff',
      linkCardBgColor: 'rgba(255,255,255,0.05)',
      tagBgColor: 'rgba(255,255,255,0.1)'
    };

    // Reset theme to custom and show custom colors container
    document.getElementById('colorTheme').value = 'custom';
    document.getElementById('customColorsContainer').style.display = 'block';

    // Update form fields
    document.getElementById('backgroundColor').value = defaults.backgroundColor;
    document.getElementById('bgColorPicker').value = defaults.backgroundColor;
    document.getElementById('textColor').value = defaults.textColor;
    document.getElementById('textColorPicker').value = defaults.textColor;
    document.getElementById('accentColor').value = defaults.accentColor;
    document.getElementById('accentColorPicker').value = defaults.accentColor;
    document.getElementById('categoryBgColor').value = defaults.categoryBgColor;
    document.getElementById('categoryBgColorPicker').value = rgbaToHex(defaults.categoryBgColor);
    document.getElementById('categoryTitleColor').value = defaults.categoryTitleColor;
    document.getElementById('categoryTitleColorPicker').value = defaults.categoryTitleColor;
    document.getElementById('linkCardBgColor').value = defaults.linkCardBgColor;
    document.getElementById('linkCardBgColorPicker').value = rgbaToHex(defaults.linkCardBgColor);
    document.getElementById('tagBgColor').value = defaults.tagBgColor;
    document.getElementById('tagBgColorPicker').value = rgbaToHex(defaults.tagBgColor);

    showToast('Colors reset to defaults (click Save to apply)');
  }

  // Convert rgba to hex for color picker (approximation)
  function rgbaToHex(rgba) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#ffffff';
  }

  // Toggle logo upload visibility based on mode
  function toggleLogoUpload() {
    const mode = document.getElementById('siteLogoMode').value;
    const uploadSection = document.getElementById('customLogoUpload');
    uploadSection.style.display = mode === 'custom' ? 'block' : 'none';
  }

  function toggleLogoOptions() {
    const showLogo = document.getElementById('showLogo').checked;
    const logoOptions = document.getElementById('logoOptionsContainer');
    logoOptions.style.display = showLogo ? 'block' : 'none';
  }

  // Handle logo image upload
  async function handleLogoImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authFetch('/api/admin/upload/logo', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();

      document.getElementById('logoImagePreview').innerHTML =
        `<img src="${result.url}" class="preview-image" alt="Logo" style="max-height: 60px;">`;
      appConfig.settings.siteLogo = result.url;
      showToast('Logo image uploaded');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to upload logo', true);
      }
    }
  }

  // Clear logo image
  async function clearLogoImage() {
    try {
      await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteLogo: null })
      });
      document.getElementById('logoImagePreview').innerHTML = '';
      appConfig.settings.siteLogo = null;
      showToast('Logo image cleared');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to clear logo', true);
      }
    }
  }

  // Drag and drop functionality
  let draggedItem = null;

  function setupDragAndDrop(list, type) {
    const items = list.querySelectorAll('.item-list-item[draggable="true"]');

    items.forEach(item => {
      // Drag start
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
      });

      // Drag end
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        // Remove all drag-over classes
        list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      // Drag over
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedItem && draggedItem !== item) {
          item.classList.add('drag-over');
        }
      });

      // Drag leave
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      // Drop
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');

        if (!draggedItem || draggedItem === item) return;

        // Get the bounding rect to determine if dropping above or below
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        // Reorder in DOM
        if (insertBefore) {
          list.insertBefore(draggedItem, item);
        } else {
          list.insertBefore(draggedItem, item.nextSibling);
        }

        // Get new order of IDs
        const newOrder = Array.from(list.querySelectorAll('.item-list-item[data-id]'))
          .map(el => el.dataset.id);

        // Save new order to server
        await saveReorder(type, newOrder, item.dataset.category);
      });
    });
  }

  // Save reordered items to server
  async function saveReorder(type, ids, categoryId = null) {
    try {
      let endpoint, body;

      if (type === 'categories') {
        endpoint = '/api/admin/categories/reorder';
        body = { ids };
      } else if (type === 'widgets') {
        endpoint = '/api/admin/widgets/reorder';
        body = { ids };
      } else {
        endpoint = '/api/admin/links/reorder';
        // For links, get the category from the filter or the first item
        const filterCategory = document.getElementById('linkCategoryFilter').value;
        body = { categoryId: filterCategory || categoryId, ids };
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to save order');

      // Reload config to sync
      await loadConfig();
      showToast('Order saved');
    } catch (err) {
      showToast('Failed to save order', true);
      // Re-render to reset order
      if (type === 'categories') {
        renderCategories();
      } else if (type === 'widgets') {
        renderWidgets();
      } else {
        renderLinks();
      }
    }
  }

  // Render categories list
  function renderCategories() {
    const list = document.getElementById('categoryList');
    const categories = (appConfig.categories || []).sort((a, b) => a.order - b.order);

    if (categories.length === 0) {
      list.innerHTML = '<li class="text-muted text-center">No categories yet</li>';
      return;
    }

    list.innerHTML = categories.map(cat => `
      <li class="item-list-item" data-id="${cat.id}" draggable="true">
        <span class="item-drag-handle">☰</span>
        <div class="item-info">
          <div class="item-name">${escapeHtml(cat.name)}</div>
          <div class="item-meta">${countLinksInCategory(cat.id)} links</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm" onclick="editCategory('${cat.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">Delete</button>
        </div>
      </li>
    `).join('');

    // Setup drag and drop for categories
    setupDragAndDrop(list, 'categories');
  }

  function countLinksInCategory(categoryId) {
    return (appConfig.links || []).filter(l => l.categoryId === categoryId).length;
  }

  // Open category modal
  window.openCategoryModal = function(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const nameInput = document.getElementById('categoryName');
    const idInput = document.getElementById('categoryId');

    if (categoryId) {
      const category = appConfig.categories.find(c => c.id === categoryId);
      title.textContent = 'Edit Category';
      nameInput.value = category ? category.name : '';
      idInput.value = categoryId;
    } else {
      title.textContent = 'Add Category';
      nameInput.value = '';
      idInput.value = '';
    }

    modal.classList.add('active');
    nameInput.focus();
  };

  window.editCategory = function(id) {
    openCategoryModal(id);
  };

  // Save category
  async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();

    if (!name) {
      showToast('Category name is required', true);
      return;
    }

    try {
      let response;
      if (id) {
        response = await authFetch(`/api/admin/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      } else {
        response = await authFetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      }

      if (!response.ok) throw new Error('Failed to save');

      await loadConfig();
      renderCategories();
      populateCategorySelects();
      closeModal('categoryModal');
      showToast(id ? 'Category updated' : 'Category created');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to save category', true);
      }
    }
  }

  // Delete category
  window.deleteCategory = async function(id) {
    if (!confirm('Delete this category and all its links?')) return;

    try {
      const response = await authFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadConfig();
      renderCategories();
      renderLinks();
      populateCategorySelects();
      showToast('Category deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete category', true);
      }
    }
  };

  // Render links list
  function renderLinks() {
    const list = document.getElementById('linkList');
    const filterCategory = document.getElementById('linkCategoryFilter').value;
    
    let links = appConfig.links || [];
    if (filterCategory) {
      links = links.filter(l => l.categoryId === filterCategory);
    }
    links = links.sort((a, b) => a.order - b.order);

    if (links.length === 0) {
      list.innerHTML = '<li class="text-muted text-center">No links yet</li>';
      return;
    }

    list.innerHTML = links.map(link => {
      const category = appConfig.categories.find(c => c.id === link.categoryId);
      const categoryName = category ? category.name : 'Uncategorized';
      const tags = (link.tags || []).join(', ');

      return `
        <li class="item-list-item" data-id="${link.id}" data-category="${link.categoryId}" draggable="true">
          <span class="item-drag-handle">☰</span>
          <div class="item-info">
            <div class="item-name">${escapeHtml(link.name)}</div>
            <div class="item-meta">${escapeHtml(categoryName)}${tags ? ' • ' + escapeHtml(tags) : ''}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm" onclick="editLink('${link.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLink('${link.id}')">Delete</button>
          </div>
        </li>
      `;
    }).join('');

    // Setup drag and drop for links
    setupDragAndDrop(list, 'links');
  }

  // Open link modal
  window.openLinkModal = function(linkId = null, preselectedCategoryId = null) {
    const modal = document.getElementById('linkModal');
    const title = document.getElementById('linkModalTitle');

    if (linkId) {
      const link = appConfig.links.find(l => l.id === linkId);
      title.textContent = 'Edit Link';
      document.getElementById('linkId').value = linkId;
      document.getElementById('linkName').value = link ? link.name : '';
      document.getElementById('linkUrl').value = link ? link.url : '';
      document.getElementById('linkCategory').value = link ? link.categoryId : '';
      document.getElementById('linkTags').value = link && link.tags ? link.tags.join(', ') : '';
      document.getElementById('linkCustomIcon').value = link ? link.customIcon || '' : '';
      document.getElementById('linkOpenBehaviorModal').value = link ? link.openBehavior || '' : '';

      // Monitoring fields
      const monitoring = link && link.monitoring ? link.monitoring : {};
      document.getElementById('linkMonitoringEnabled').checked = monitoring.enabled || false;
      document.getElementById('linkMonitoringHost').value = monitoring.host || '';
      document.getElementById('linkMonitoringPort').value = monitoring.port || '';
      setSelectValue('linkMonitoringInterval', monitoring.interval || 60);
    } else {
      title.textContent = 'Add Link';
      document.getElementById('linkId').value = '';
      document.getElementById('linkName').value = '';
      document.getElementById('linkUrl').value = '';
      // Use preselected category if provided, otherwise default to first category
      const defaultCategory = preselectedCategoryId || appConfig.categories[0]?.id || '';
      document.getElementById('linkCategory').value = defaultCategory;
      document.getElementById('linkTags').value = '';
      document.getElementById('linkCustomIcon').value = '';
      document.getElementById('linkOpenBehaviorModal').value = '';

      // Reset monitoring fields
      document.getElementById('linkMonitoringEnabled').checked = false;
      document.getElementById('linkMonitoringHost').value = '';
      document.getElementById('linkMonitoringPort').value = '';
      document.getElementById('linkMonitoringInterval').value = '60';
    }

    // Update monitoring options visibility
    toggleMonitoringOptions();

    modal.classList.add('active');
    document.getElementById('linkName').focus();
  };

  window.editLink = function(id) {
    openLinkModal(id);
  };

  // Save link
  async function saveLink() {
    const id = document.getElementById('linkId').value;
    const name = document.getElementById('linkName').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const categoryId = document.getElementById('linkCategory').value;
    const tagsStr = document.getElementById('linkTags').value;
    const customIcon = document.getElementById('linkCustomIcon').value.trim();
    const openBehavior = document.getElementById('linkOpenBehaviorModal').value;

    // Monitoring fields
    const monitoringEnabled = document.getElementById('linkMonitoringEnabled').checked;
    const monitoringHost = document.getElementById('linkMonitoringHost').value.trim();
    const monitoringPort = document.getElementById('linkMonitoringPort').value;
    const monitoringInterval = parseInt(document.getElementById('linkMonitoringInterval').value);

    if (!name || !url) {
      showToast('Name and URL are required', true);
      return;
    }

    if (!categoryId) {
      showToast('Please select a category', true);
      return;
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    const linkData = {
      name,
      url,
      categoryId,
      tags,
      customIcon: customIcon || null,
      openBehavior: openBehavior || null,
      monitoring: {
        enabled: monitoringEnabled,
        host: monitoringHost || null,
        port: monitoringPort ? parseInt(monitoringPort) : null,
        interval: monitoringInterval || 60
      }
    };

    try {
      let response;
      if (id) {
        response = await authFetch(`/api/admin/links/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        });
      } else {
        response = await authFetch('/api/admin/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        });
      }

      if (!response.ok) throw new Error('Failed to save');

      await loadConfig();
      renderLinks();
      closeModal('linkModal');
      showToast(id ? 'Link updated' : 'Link created');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to save link', true);
      }
    }
  }

  // Delete link
  window.deleteLink = async function(id) {
    if (!confirm('Delete this link?')) return;

    try {
      const response = await authFetch(`/api/admin/links/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadConfig();
      renderLinks();
      showToast('Link deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete link', true);
      }
    }
  };

  // ==================== WIDGET MANAGEMENT ====================

  // Render widgets list
  function renderWidgets() {
    const list = document.getElementById('widgetList');
    const widgets = (appConfig.widgets || []).sort((a, b) => a.order - b.order);

    if (widgets.length === 0) {
      list.innerHTML = '<li class="text-muted text-center">No widgets yet</li>';
      return;
    }

    const typeLabels = {
      'server-monitor': 'Server Monitor',
      'clock': 'Clock',
      'weather': 'Weather',
      'iframe': 'Iframe',
      'custom-html': 'Custom HTML'
    };

    list.innerHTML = widgets.map(widget => {
      const typeLabel = typeLabels[widget.type] || widget.type;
      const posLabel = widget.position === 'above-categories' ? 'Above' : 'Below';
      const statusClass = widget.enabled ? '' : 'item-disabled';

      return `
        <li class="item-list-item ${statusClass}" data-id="${widget.id}" draggable="true">
          <span class="item-drag-handle">☰</span>
          <div class="item-info">
            <div class="item-name">${escapeHtml(widget.title || typeLabel)}</div>
            <div class="item-meta">${typeLabel} • ${posLabel} • ${widget.enabled ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm" onclick="editWidget('${widget.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteWidget('${widget.id}')">Delete</button>
          </div>
        </li>
      `;
    }).join('');

    // Setup drag and drop for widgets
    setupDragAndDrop(list, 'widgets');
  }

  // Handle widget type change
  function handleWidgetTypeChange() {
    const type = document.getElementById('widgetType').value;

    // Hide all config sections
    document.querySelectorAll('.widget-config-section').forEach(el => {
      el.style.display = 'none';
    });

    // Show relevant config section
    const configMap = {
      'server-monitor': 'configServerMonitor',
      'clock': 'configClock',
      'weather': 'configWeather',
      'iframe': 'configIframe',
      'custom-html': 'configCustomHtml'
    };

    const configId = configMap[type];
    if (configId) {
      document.getElementById(configId).style.display = 'block';
    }
  }

  // Add server row for server monitor widget
  function addServerRow(serverData = null) {
    const list = document.getElementById('serverMonitorList');
    const rowId = 'server-' + Date.now();

    const row = document.createElement('div');
    row.className = 'server-row';
    row.id = rowId;
    row.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; flex-wrap: wrap;';

    row.innerHTML = `
      <input type="text" class="form-input server-name" placeholder="Name" value="${serverData?.name || ''}" style="flex: 1; min-width: 100px;">
      <input type="text" class="form-input server-host" placeholder="Host/IP" value="${serverData?.host || ''}" style="flex: 1; min-width: 120px;">
      <input type="number" class="form-input server-port" placeholder="Port" value="${serverData?.port || ''}" style="width: 80px;">
      <button type="button" class="btn btn-sm" onclick="testServerRow('${rowId}')" style="padding: 0.3rem 0.5rem;">Test</button>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeServerRow('${rowId}')" style="padding: 0.3rem 0.5rem;">×</button>
      <span class="server-test-result" style="width: 100%; font-size: 0.8rem; margin-top: 0.25rem; display: none;"></span>
    `;

    list.appendChild(row);
  }

  window.removeServerRow = function(rowId) {
    document.getElementById(rowId)?.remove();
  };

  // Test a server from the widget config
  window.testServerRow = async function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const host = row.querySelector('.server-host').value.trim();
    const port = row.querySelector('.server-port').value;
    const resultEl = row.querySelector('.server-test-result');

    if (!host) {
      resultEl.textContent = '⚠️ Enter a host/IP first';
      resultEl.style.display = 'block';
      resultEl.style.color = '#fbbf24';
      return;
    }

    resultEl.textContent = '⏳ Testing...';
    resultEl.style.display = 'block';
    resultEl.style.color = '#a1a1aa';

    try {
      const response = await authFetch('/api/admin/monitoring/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: port ? parseInt(port) : null })
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      const result = await response.json();

      if (result.status === 'online') {
        resultEl.innerHTML = `✅ Online (${result.method}) - ${result.latency}ms`;
        resultEl.style.color = '#4ade80';
      } else {
        resultEl.innerHTML = `❌ Offline (${result.method})${result.error ? ' - ' + result.error : ''}`;
        resultEl.style.color = '#f87171';
      }
    } catch (err) {
      resultEl.textContent = '❌ Test failed: ' + err.message;
      resultEl.style.color = '#f87171';
    }
  };

  // Get servers from modal
  function getServersFromModal() {
    const servers = [];
    document.querySelectorAll('#serverMonitorList .server-row').forEach(row => {
      const name = row.querySelector('.server-name').value.trim();
      const host = row.querySelector('.server-host').value.trim();
      const port = row.querySelector('.server-port').value;

      if (host) {
        servers.push({
          id: 'srv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          name: name || host,
          host,
          port: port ? parseInt(port) : null
        });
      }
    });
    return servers;
  }

  // Get widget config based on type
  function getWidgetConfig(type) {
    switch (type) {
      case 'server-monitor':
        return {
          servers: getServersFromModal(),
          displayMode: document.getElementById('serverDisplayMode').value,
          columns: document.getElementById('serverColumns').value,
          itemStyle: document.getElementById('serverItemStyle').value,
          textSize: document.getElementById('serverTextSize').value,
          itemBgColor: document.getElementById('serverItemBgColor').value || null,
          textColor: document.getElementById('serverTextColor').value || null,
          hoverEffect: document.getElementById('serverHoverEffect').value,
          borderRadius: document.getElementById('serverBorderRadius').value,
          containerStyle: document.getElementById('serverContainerStyle').value,
          containerBgColor: document.getElementById('serverContainerBgColor').value || null,
          showLatency: document.getElementById('serverShowLatency').checked,
          showLastChecked: document.getElementById('serverShowLastChecked').checked
        };
      case 'clock':
        return {
          format: document.getElementById('clockFormat').value,
          timezone: document.getElementById('clockTimezone').value,
          showDate: document.getElementById('clockShowDate').checked,
          showSeconds: document.getElementById('clockShowSeconds').checked
        };
      case 'weather':
        return {
          apiKey: document.getElementById('weatherApiKey').value.trim(),
          location: document.getElementById('weatherLocation').value.trim(),
          units: document.getElementById('weatherUnits').value
        };
      case 'iframe':
        return {
          url: document.getElementById('iframeUrl').value.trim(),
          height: parseInt(document.getElementById('iframeHeight').value) || 300
        };
      case 'custom-html':
        return {
          html: document.getElementById('customHtmlContent').value
        };
      default:
        return {};
    }
  }

  // Set widget config in modal
  function setWidgetConfig(type, config) {
    if (!config) return;

    switch (type) {
      case 'server-monitor':
        document.getElementById('serverMonitorList').innerHTML = '';
        (config.servers || []).forEach(server => addServerRow(server));
        // Display options
        setSelectValue('serverDisplayMode', config.displayMode || 'list');
        setSelectValue('serverColumns', config.columns || '2');
        // Item styling
        setSelectValue('serverItemStyle', config.itemStyle || 'card');
        setSelectValue('serverTextSize', config.textSize || 'medium');
        document.getElementById('serverItemBgColor').value = config.itemBgColor || '';
        document.getElementById('serverItemBgPicker').value = config.itemBgColor ? rgbaToHex(config.itemBgColor) : '#ffffff';
        document.getElementById('serverTextColor').value = config.textColor || '';
        document.getElementById('serverTextColorPicker').value = config.textColor ? rgbaToHex(config.textColor) : '#ffffff';
        setSelectValue('serverHoverEffect', config.hoverEffect || 'none');
        setSelectValue('serverBorderRadius', config.borderRadius || 'small');
        // Container styling
        setSelectValue('serverContainerStyle', config.containerStyle || 'card');
        document.getElementById('serverContainerBgColor').value = config.containerBgColor || '';
        document.getElementById('serverContainerBgPicker').value = config.containerBgColor ? rgbaToHex(config.containerBgColor) : '#ffffff';
        // Show options
        document.getElementById('serverShowLatency').checked = config.showLatency !== false;
        document.getElementById('serverShowLastChecked').checked = config.showLastChecked || false;
        break;
      case 'clock':
        setSelectValue('clockFormat', config.format || '12');
        setSelectValue('clockTimezone', config.timezone || 'local');
        document.getElementById('clockShowDate').checked = config.showDate !== false;
        document.getElementById('clockShowSeconds').checked = config.showSeconds || false;
        break;
      case 'weather':
        document.getElementById('weatherApiKey').value = config.apiKey || '';
        document.getElementById('weatherLocation').value = config.location || '';
        setSelectValue('weatherUnits', config.units || 'imperial');
        break;
      case 'iframe':
        document.getElementById('iframeUrl').value = config.url || '';
        document.getElementById('iframeHeight').value = config.height || 300;
        break;
      case 'custom-html':
        document.getElementById('customHtmlContent').value = config.html || '';
        break;
    }
  }

  // Open widget modal
  window.openWidgetModal = function(widgetId = null) {
    const modal = document.getElementById('widgetModal');
    const title = document.getElementById('widgetModalTitle');

    if (widgetId) {
      const widget = (appConfig.widgets || []).find(w => w.id === widgetId);
      title.textContent = 'Edit Widget';
      document.getElementById('widgetId').value = widgetId;
      document.getElementById('widgetType').value = widget?.type || 'server-monitor';
      document.getElementById('widgetPosition').value = widget?.position || 'above-categories';
      document.getElementById('widgetTitle').value = widget?.title || '';
      document.getElementById('widgetEnabled').checked = widget?.enabled !== false;

      // Set config
      handleWidgetTypeChange();
      setWidgetConfig(widget?.type, widget?.config);
    } else {
      title.textContent = 'Add Widget';
      document.getElementById('widgetId').value = '';
      document.getElementById('widgetType').value = 'server-monitor';
      document.getElementById('widgetPosition').value = 'above-categories';
      document.getElementById('widgetTitle').value = '';
      document.getElementById('widgetEnabled').checked = true;

      // Reset configs
      handleWidgetTypeChange();
      document.getElementById('serverMonitorList').innerHTML = '';
      // Server monitor defaults
      document.getElementById('serverDisplayMode').value = 'list';
      document.getElementById('serverColumns').value = '2';
      document.getElementById('serverItemStyle').value = 'card';
      document.getElementById('serverTextSize').value = 'medium';
      document.getElementById('serverItemBgColor').value = '';
      document.getElementById('serverItemBgPicker').value = '#ffffff';
      document.getElementById('serverTextColor').value = '';
      document.getElementById('serverTextColorPicker').value = '#ffffff';
      document.getElementById('serverHoverEffect').value = 'none';
      document.getElementById('serverBorderRadius').value = 'small';
      document.getElementById('serverContainerStyle').value = 'card';
      document.getElementById('serverContainerBgColor').value = '';
      document.getElementById('serverContainerBgPicker').value = '#ffffff';
      document.getElementById('serverShowLatency').checked = true;
      document.getElementById('serverShowLastChecked').checked = false;
      // Clock defaults
      document.getElementById('clockFormat').value = '12';
      document.getElementById('clockTimezone').value = 'local';
      document.getElementById('clockShowDate').checked = true;
      document.getElementById('clockShowSeconds').checked = false;
      // Weather defaults
      document.getElementById('weatherApiKey').value = '';
      document.getElementById('weatherLocation').value = '';
      document.getElementById('weatherUnits').value = 'imperial';
      // Iframe defaults
      document.getElementById('iframeUrl').value = '';
      document.getElementById('iframeHeight').value = '300';
      // Custom HTML defaults
      document.getElementById('customHtmlContent').value = '';
    }

    modal.classList.add('active');
  };

  window.editWidget = function(id) {
    openWidgetModal(id);
  };

  // Save widget
  async function saveWidget() {
    const id = document.getElementById('widgetId').value;
    const type = document.getElementById('widgetType').value;
    const position = document.getElementById('widgetPosition').value;
    const widgetTitle = document.getElementById('widgetTitle').value.trim();
    const enabled = document.getElementById('widgetEnabled').checked;
    const config = getWidgetConfig(type);

    const widgetData = {
      type,
      position,
      title: widgetTitle || null,
      enabled,
      config
    };

    try {
      let response;
      if (id) {
        response = await authFetch(`/api/admin/widgets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(widgetData)
        });
      } else {
        response = await authFetch('/api/admin/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(widgetData)
        });
      }

      if (!response.ok) throw new Error('Failed to save');

      await loadConfig();
      renderWidgets();
      closeModal('widgetModal');
      showToast(id ? 'Widget updated' : 'Widget created');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to save widget', true);
      }
    }
  }

  // Delete widget
  window.deleteWidget = async function(id) {
    if (!confirm('Delete this widget?')) return;

    try {
      const response = await authFetch(`/api/admin/widgets/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadConfig();
      renderWidgets();
      showToast('Widget deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete widget', true);
      }
    }
  };

  // ==================== END WIDGET MANAGEMENT ====================

  // Save auth settings
  async function saveAuth() {
    const settings = {
      authMode: document.getElementById('authMode').value,
      mainAuthMode: document.getElementById('mainAuthMode').value,
      entraId: {
        clientId: document.getElementById('entraClientId').value,
        tenantId: document.getElementById('entraTenantId').value,
        clientSecret: document.getElementById('entraClientSecret').value,
        redirectUri: document.getElementById('entraRedirectUri').value
      }
    };

    try {
      const response = await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      appConfig.settings = { ...appConfig.settings, ...settings };
      showToast('Authentication settings saved');
    } catch (err) {
      console.error('Save auth settings error:', err);
      if (err.message !== 'Authentication required') {
        showToast(err.message || 'Failed to save settings', true);
      }
    }
  }

  // Export config
  async function exportConfig() {
    try {
      const response = await authFetch('/api/admin/export');
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dashma-config.json';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Config exported');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to export config', true);
      }
    }
  }

  // Import config
  async function handleConfigImport(file) {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      const response = await authFetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Import failed');

      await loadConfig();
      populateForm();
      renderCategories();
      renderLinks();
      showToast('Config imported successfully');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to import config', true);
      }
    }
  }

  // Save credentials
  async function saveCredentials() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const confirm = document.getElementById('adminPasswordConfirm').value;

    if (password && password !== confirm) {
      showToast('Passwords do not match', true);
      return;
    }

    if (password && password.length < 8) {
      showToast('Password must be at least 8 characters', true);
      return;
    }

    try {
      const response = await authFetch('/api/admin/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username || null,
          password: password || null
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      const result = await response.json();

      document.getElementById('adminPassword').value = '';
      document.getElementById('adminPasswordConfirm').value = '';

      // If password was changed, force re-login
      if (result.requireRelogin) {
        showToast('Credentials updated. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 1500);
      } else {
        showToast('Credentials updated');
      }
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to update credentials', true);
      }
    }
  }

  // Render users list
  function renderUsers() {
    const list = document.getElementById('userList');

    if (users.length === 0) {
      list.innerHTML = '<li class="text-muted text-center">No users yet. Add users to allow access to the main site.</li>';
      return;
    }

    list.innerHTML = users.map(user => {
      const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
      return `
        <li class="item-list-item" data-id="${user.id}">
          <div class="item-info">
            <div class="item-name">${escapeHtml(user.username)}</div>
            <div class="item-meta">Created: ${createdDate}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm" onclick="editUser('${user.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
          </div>
        </li>
      `;
    }).join('');
  }

  // Open user modal
  window.openUserModal = function(userId = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const usernameInput = document.getElementById('newUsername');
    const passwordInput = document.getElementById('newUserPassword');
    const confirmInput = document.getElementById('newUserPasswordConfirm');
    const idInput = document.getElementById('userId');

    if (userId) {
      const user = users.find(u => u.id === userId);
      title.textContent = 'Edit User';
      usernameInput.value = user ? user.username : '';
      passwordInput.value = '';
      confirmInput.value = '';
      passwordInput.placeholder = 'Leave blank to keep current';
      idInput.value = userId;
    } else {
      title.textContent = 'Add User';
      usernameInput.value = '';
      passwordInput.value = '';
      confirmInput.value = '';
      passwordInput.placeholder = 'Enter password';
      idInput.value = '';
    }

    modal.classList.add('active');
    usernameInput.focus();
  };

  window.editUser = function(id) {
    openUserModal(id);
  };

  // Save user
  async function saveUser() {
    const id = document.getElementById('userId').value;
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const confirmPassword = document.getElementById('newUserPasswordConfirm').value;

    if (!username) {
      showToast('Username is required', true);
      return;
    }

    if (!id && !password) {
      showToast('Password is required for new users', true);
      return;
    }

    if (password && password !== confirmPassword) {
      showToast('Passwords do not match', true);
      return;
    }

    if (password && password.length < 4) {
      showToast('Password must be at least 4 characters', true);
      return;
    }

    const userData = { username };
    if (password) {
      userData.password = password;
    }

    try {
      let response;
      if (id) {
        response = await authFetch(`/api/admin/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      } else {
        response = await authFetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      await loadUsers();
      renderUsers();
      closeModal('userModal');
      showToast(id ? 'User updated' : 'User created');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast(err.message || 'Failed to save user', true);
      }
    }
  }

  // Delete user
  window.deleteUser = async function(id) {
    if (!confirm('Delete this user?')) return;

    try {
      const response = await authFetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadUsers();
      renderUsers();
      showToast('User deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete user', true);
      }
    }
  };

  // Close modal helper
  window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
  };

  // Toast notification
  function showToast(message, isError = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Escape HTML helper
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convert rgba to hex for color picker (approximate)
  function rgbaToHex(rgba) {
    if (!rgba) return '#ffffff';
    if (rgba.startsWith('#')) return rgba;
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return '#' + r + g + b;
    }
    return '#ffffff';
  }

  // Update requests badge
  function updateRequestsBadge() {
    const badge = document.getElementById('requestsBadge');
    const pendingCount = (requests.categories || []).filter(r => r.status === 'pending').length +
                         (requests.links || []).filter(r => r.status === 'pending').length;
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  // Render requests
  function renderRequests() {
    renderCategoryRequests();
    renderLinkRequests();
  }

  function renderCategoryRequests() {
    const list = document.getElementById('categoryRequestList');
    const filter = document.getElementById('categoryRequestFilter').value;

    let categoryRequests = requests.categories || [];
    if (filter !== 'all') {
      categoryRequests = categoryRequests.filter(r => r.status === filter);
    }

    if (categoryRequests.length === 0) {
      list.innerHTML = `<li class="no-items">No ${filter === 'all' ? '' : filter + ' '}category requests</li>`;
      return;
    }

    list.innerHTML = categoryRequests.map(req => {
      const date = new Date(req.submittedAt).toLocaleDateString();
      const statusClass = req.status === 'approved' ? 'status-approved' : req.status === 'denied' ? 'status-denied' : 'status-pending';

      let actions = '';
      if (req.status === 'pending') {
        actions = `
          <button class="btn btn-sm btn-success" onclick="approveCategoryRequest('${req.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="denyCategoryRequest('${req.id}')">Deny</button>
        `;
      } else {
        actions = `
          <button class="btn btn-sm btn-danger" onclick="deleteCategoryRequest('${req.id}')">Delete</button>
        `;
      }

      return `
        <li class="item-list-item">
          <div class="item-info">
            <div class="item-name">${escapeHtml(req.name)}</div>
            <div class="item-meta">
              <span class="request-status ${statusClass}">${req.status}</span>
              Submitted: ${date} by ${escapeHtml(req.submittedBy || 'anonymous')}
            </div>
          </div>
          <div class="item-actions">
            ${actions}
          </div>
        </li>
      `;
    }).join('');
  }

  function renderLinkRequests() {
    const list = document.getElementById('linkRequestList');
    const filter = document.getElementById('linkRequestFilter').value;

    let linkRequests = requests.links || [];
    if (filter !== 'all') {
      linkRequests = linkRequests.filter(r => r.status === filter);
    }

    if (linkRequests.length === 0) {
      list.innerHTML = `<li class="no-items">No ${filter === 'all' ? '' : filter + ' '}link requests</li>`;
      return;
    }

    list.innerHTML = linkRequests.map(req => {
      const date = new Date(req.submittedAt).toLocaleDateString();
      const statusClass = req.status === 'approved' ? 'status-approved' : req.status === 'denied' ? 'status-denied' : 'status-pending';

      // Get category name
      let categoryName = 'Unknown';
      if (req.categoryId) {
        const cat = appConfig.categories.find(c => c.id === req.categoryId);
        categoryName = cat ? cat.name : 'Unknown';
      } else if (req.pendingCategoryId) {
        const pendingCat = requests.categories.find(c => c.id === req.pendingCategoryId);
        categoryName = pendingCat ? `${pendingCat.name} (pending)` : 'Pending category';
      }

      const tags = (req.tags || []).join(', ');

      let actions = '';
      if (req.status === 'pending') {
        const canApprove = req.categoryId || (req.pendingCategoryId && requests.categories.find(c => c.id === req.pendingCategoryId && c.status === 'approved'));
        if (canApprove) {
          actions = `
            <button class="btn btn-sm btn-success" onclick="approveLinkRequest('${req.id}')">Approve</button>
            <button class="btn btn-sm btn-danger" onclick="denyLinkRequest('${req.id}')">Deny</button>
          `;
        } else {
          actions = `
            <button class="btn btn-sm btn-success" disabled title="Approve the category first">Approve</button>
            <button class="btn btn-sm btn-danger" onclick="denyLinkRequest('${req.id}')">Deny</button>
          `;
        }
      } else {
        actions = `
          <button class="btn btn-sm btn-danger" onclick="deleteLinkRequest('${req.id}')">Delete</button>
        `;
      }

      return `
        <li class="item-list-item">
          <div class="item-info">
            <div class="item-name">${escapeHtml(req.name)}</div>
            <div class="item-meta">
              <span class="request-status ${statusClass}">${req.status}</span>
              ${escapeHtml(req.url)} | ${escapeHtml(categoryName)}${tags ? ' | ' + escapeHtml(tags) : ''}
            </div>
            <div class="item-meta">Submitted: ${date} by ${escapeHtml(req.submittedBy || 'anonymous')}</div>
          </div>
          <div class="item-actions">
            ${actions}
          </div>
        </li>
      `;
    }).join('');
  }

  // Approve category request
  window.approveCategoryRequest = async function(id) {
    try {
      const response = await authFetch(`/api/admin/requests/category/${id}/approve`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      await loadRequests();
      await loadConfig();
      renderRequests();
      updateRequestsBadge();
      populateCategorySelects();
      renderCategories();
      showToast('Category request approved');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast(err.message || 'Failed to approve request', true);
      }
    }
  };

  // Approve link request
  window.approveLinkRequest = async function(id) {
    try {
      const response = await authFetch(`/api/admin/requests/link/${id}/approve`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      await loadRequests();
      await loadConfig();
      renderRequests();
      updateRequestsBadge();
      renderLinks();
      showToast('Link request approved');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast(err.message || 'Failed to approve request', true);
      }
    }
  };

  // Deny category request
  window.denyCategoryRequest = async function(id) {
    if (!confirm('Deny this category request? Any link requests that depend on this category will also be denied.')) return;

    try {
      const response = await authFetch(`/api/admin/requests/category/${id}/deny`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to deny');

      await loadRequests();
      renderRequests();
      updateRequestsBadge();
      showToast('Category request denied');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to deny request', true);
      }
    }
  };

  // Deny link request
  window.denyLinkRequest = async function(id) {
    if (!confirm('Deny this link request?')) return;

    try {
      const response = await authFetch(`/api/admin/requests/link/${id}/deny`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to deny');

      await loadRequests();
      renderRequests();
      updateRequestsBadge();
      showToast('Link request denied');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to deny request', true);
      }
    }
  };

  // Delete category request
  window.deleteCategoryRequest = async function(id) {
    if (!confirm('Delete this category request?')) return;

    try {
      const response = await authFetch(`/api/admin/requests/category/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadRequests();
      renderRequests();
      updateRequestsBadge();
      showToast('Category request deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete request', true);
      }
    }
  };

  // Delete link request
  window.deleteLinkRequest = async function(id) {
    if (!confirm('Delete this link request?')) return;

    try {
      const response = await authFetch(`/api/admin/requests/link/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadRequests();
      renderRequests();
      updateRequestsBadge();
      showToast('Link request deleted');
    } catch (err) {
      if (err.message !== 'Authentication required') {
        showToast('Failed to delete request', true);
      }
    }
  };

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
