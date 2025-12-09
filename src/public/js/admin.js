// Dashma Admin JavaScript
(function() {
  'use strict';

  let appConfig = null;

  let users = [];

  // Initialize
  async function init() {
    await loadConfig();
    await loadUsers();
    setupNavigation();
    setupEventListeners();
    populateForm();
    renderCategories();
    renderLinks();
    renderUsers();
  }

  // Load configuration from API
  async function loadConfig() {
    try {
      const response = await fetch('/api/admin/config');
      if (!response.ok) throw new Error('Failed to load config');
      appConfig = await response.json();
    } catch (err) {
      showToast('Failed to load configuration', true);
      console.error(err);
    }
  }

  // Load users
  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to load users');
      users = await response.json();
    } catch (err) {
      console.error('Failed to load users:', err);
      users = [];
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
      });
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Color pickers sync
    setupColorPicker('bgColorPicker', 'backgroundColor');
    setupColorPicker('textColorPicker', 'textColor');
    setupColorPicker('accentColorPicker', 'accentColor');

    // Save appearance
    document.getElementById('saveAppearance').addEventListener('click', saveAppearance);

    // Background image upload
    setupFileUpload('bgImageUpload', 'bgImageInput', handleBgImageUpload);
    document.getElementById('clearBgImage').addEventListener('click', clearBgImage);

    // Logo upload
    setupFileUpload('logoImageUpload', 'logoImageInput', handleLogoImageUpload);
    document.getElementById('clearLogoImage').addEventListener('click', clearLogoImage);
    document.getElementById('siteLogoMode').addEventListener('change', toggleLogoUpload);

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
    setSelectValue('siteLogoMode', s.siteLogoMode || 'none');
    setSelectValue('logoPosition', s.logoPosition || 'above');
    setSelectValue('logoAlignment', s.logoAlignment || 'center');
    toggleLogoUpload();
    if (s.siteLogo) {
      document.getElementById('logoImagePreview').innerHTML =
        `<img src="${s.siteLogo}" class="preview-image" alt="Logo" style="max-height: 60px;">`;
    }

    // Colors
    document.getElementById('backgroundColor').value = s.backgroundColor || '#212121';
    document.getElementById('bgColorPicker').value = s.backgroundColor || '#212121';
    document.getElementById('textColor').value = s.textColor || '#ffffff';
    document.getElementById('textColorPicker').value = s.textColor || '#ffffff';
    document.getElementById('accentColor').value = s.accentColor || '#888888';
    document.getElementById('accentColorPicker').value = s.accentColor || '#888888';

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

  // Save appearance settings
  async function saveAppearance() {
    const settings = {
      siteName: document.getElementById('siteName').value,
      titleSize: document.getElementById('titleSize').value,
      titleAlignment: document.getElementById('titleAlignment').value,
      titleHoverEffect: document.getElementById('titleHoverEffect').value,
      titleLinkUrl: document.getElementById('titleLinkUrl').value.trim() || null,
      showTitle: document.getElementById('showTitle').checked,
      siteLogoMode: document.getElementById('siteLogoMode').value,
      logoPosition: document.getElementById('logoPosition').value,
      logoAlignment: document.getElementById('logoAlignment').value,
      backgroundColor: document.getElementById('backgroundColor').value,
      textColor: document.getElementById('textColor').value,
      accentColor: document.getElementById('accentColor').value,
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
      footerHoverEffect: document.getElementById('footerHoverEffect').value
    };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save');
      appConfig.settings = { ...appConfig.settings, ...settings };
      showToast('Appearance settings saved');
    } catch (err) {
      showToast('Failed to save settings', true);
    }
  }

  // Handle background image upload
  async function handleBgImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload/background', {
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
      showToast('Failed to upload image', true);
    }
  }

  // Clear background image
  async function clearBgImage() {
    try {
      await fetch('/api/admin/settings', {
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

  // Toggle logo upload visibility based on mode
  function toggleLogoUpload() {
    const mode = document.getElementById('siteLogoMode').value;
    const uploadSection = document.getElementById('customLogoUpload');
    uploadSection.style.display = mode === 'custom' ? 'block' : 'none';
  }

  // Handle logo image upload
  async function handleLogoImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload/logo', {
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
      showToast('Failed to upload logo', true);
    }
  }

  // Clear logo image
  async function clearLogoImage() {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteLogo: null })
      });
      document.getElementById('logoImagePreview').innerHTML = '';
      appConfig.settings.siteLogo = null;
      showToast('Logo image cleared');
    } catch (err) {
      showToast('Failed to clear logo', true);
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
        response = await fetch(`/api/admin/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      } else {
        response = await fetch('/api/admin/categories', {
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
      showToast('Failed to save category', true);
    }
  }

  // Delete category
  window.deleteCategory = async function(id) {
    if (!confirm('Delete this category and all its links?')) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      
      await loadConfig();
      renderCategories();
      renderLinks();
      populateCategorySelects();
      showToast('Category deleted');
    } catch (err) {
      showToast('Failed to delete category', true);
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
    }

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
      openBehavior: openBehavior || null
    };

    try {
      let response;
      if (id) {
        response = await fetch(`/api/admin/links/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        });
      } else {
        response = await fetch('/api/admin/links', {
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
      showToast('Failed to save link', true);
    }
  }

  // Delete link
  window.deleteLink = async function(id) {
    if (!confirm('Delete this link?')) return;

    try {
      const response = await fetch(`/api/admin/links/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      
      await loadConfig();
      renderLinks();
      showToast('Link deleted');
    } catch (err) {
      showToast('Failed to delete link', true);
    }
  };

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
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save');
      appConfig.settings = { ...appConfig.settings, ...settings };
      showToast('Authentication settings saved');
    } catch (err) {
      showToast('Failed to save settings', true);
    }
  }

  // Export config
  async function exportConfig() {
    try {
      const response = await fetch('/api/admin/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dashma-config.json';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Config exported');
    } catch (err) {
      showToast('Failed to export config', true);
    }
  }

  // Import config
  async function handleConfigImport(file) {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      const response = await fetch('/api/admin/import', {
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
      showToast('Failed to import config', true);
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
      const response = await fetch('/api/admin/credentials', {
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
      showToast('Failed to update credentials', true);
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
        response = await fetch(`/api/admin/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      } else {
        response = await fetch('/api/admin/users', {
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
      showToast(err.message || 'Failed to save user', true);
    }
  }

  // Delete user
  window.deleteUser = async function(id) {
    if (!confirm('Delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');

      await loadUsers();
      renderUsers();
      showToast('User deleted');
    } catch (err) {
      showToast('Failed to delete user', true);
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

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
