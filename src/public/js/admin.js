// Dashma Admin JavaScript
(function() {
  'use strict';

  let appConfig = null;

  // Initialize
  async function init() {
    await loadConfig();
    setupNavigation();
    setupEventListeners();
    populateForm();
    renderCategories();
    renderLinks();
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
    document.getElementById('saveAuth').addEventListener('click', saveAuth);

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

    // General
    document.getElementById('siteName').value = s.siteName || 'Dashma';
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

    // Animations
    setSelectValue('linkHoverEffect', s.linkHoverEffect);
    setSelectValue('categoryHoverEffect', s.categoryHoverEffect);
    setSelectValue('nestingAnimation', s.nestingAnimation);

    // Auth
    setSelectValue('authMode', s.authMode);
    if (s.entraId) {
      document.getElementById('entraClientId').value = s.entraId.clientId || '';
      document.getElementById('entraTenantId').value = s.entraId.tenantId || '';
      document.getElementById('entraClientSecret').value = s.entraId.clientSecret || '';
      document.getElementById('entraRedirectUri').value = s.entraId.redirectUri || '';
    }
    toggleEntraSettings();

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
    const entraSettings = document.getElementById('entraIdSettings');
    entraSettings.style.display = authMode === 'entraId' ? 'block' : 'none';
  }

  // Save appearance settings
  async function saveAppearance() {
    const settings = {
      siteName: document.getElementById('siteName').value,
      backgroundColor: document.getElementById('backgroundColor').value,
      textColor: document.getElementById('textColor').value,
      accentColor: document.getElementById('accentColor').value,
      fontFamily: document.getElementById('fontFamily').value,
      titleFontFamily: document.getElementById('titleFontFamily').value,
      columns: parseInt(document.getElementById('columns').value),
      linkDisplayMode: document.getElementById('linkDisplayMode').value,
      linkOpenBehavior: document.getElementById('linkOpenBehavior').value,
      showLinkIcons: document.getElementById('showLinkIcons').checked,
      linkHoverEffect: document.getElementById('linkHoverEffect').value,
      categoryHoverEffect: document.getElementById('categoryHoverEffect').value,
      nestingAnimation: document.getElementById('nestingAnimation').value
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

  // Render categories list
  function renderCategories() {
    const list = document.getElementById('categoryList');
    const categories = (appConfig.categories || []).sort((a, b) => a.order - b.order);

    if (categories.length === 0) {
      list.innerHTML = '<li class="text-muted text-center">No categories yet</li>';
      return;
    }

    list.innerHTML = categories.map(cat => `
      <li class="item-list-item" data-id="${cat.id}">
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
        <li class="item-list-item" data-id="${link.id}">
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
      
      document.getElementById('adminPassword').value = '';
      document.getElementById('adminPasswordConfirm').value = '';
      showToast('Credentials updated');
    } catch (err) {
      showToast('Failed to update credentials', true);
    }
  }

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
