// Dashma - Main JavaScript
(function() {
  'use strict';

  let appData = null;
  let searchOpen = false;
  let selectedSearchIndex = -1;
  let filteredResults = [];
  let collapsedCategories = JSON.parse(localStorage.getItem('dashma-collapsed') || '[]');

  // Initialize app
  async function init() {
    try {
      const response = await fetch('/api/public/data');
      appData = await response.json();
      applySettings();
      renderCategories();
      setupEventListeners();
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  // Apply settings to CSS variables
  function applySettings() {
    const s = appData.settings;
    const root = document.documentElement;
    
    root.style.setProperty('--bg-color', s.backgroundColor);
    root.style.setProperty('--bg-image', s.backgroundImage ? `url(${s.backgroundImage})` : 'none');
    root.style.setProperty('--font-family', s.fontFamily);
    root.style.setProperty('--title-font', s.titleFontFamily);
    root.style.setProperty('--text-color', s.textColor);
    root.style.setProperty('--accent-color', s.accentColor);

    document.querySelector('.site-title').textContent = s.siteName;
    
    const grid = document.querySelector('.categories-grid');
    grid.className = `categories-grid cols-${s.columns}`;
    grid.classList.add(`nest-${s.nestingAnimation}`);
  }

  // Render categories and links
  function renderCategories() {
    const grid = document.querySelector('.categories-grid');
    grid.innerHTML = '';

    const sortedCategories = [...appData.categories].sort((a, b) => a.order - b.order);

    sortedCategories.forEach((category, catIndex) => {
      const categoryLinks = appData.links
        .filter(l => l.categoryId === category.id)
        .sort((a, b) => a.order - b.order);

      const isCollapsed = collapsedCategories.includes(category.id);
      const hoverClass = `cat-hover-${appData.settings.categoryHoverEffect}`;

      const categoryEl = document.createElement('div');
      categoryEl.className = `category ${hoverClass} ${isCollapsed ? 'collapsed' : ''}`;
      categoryEl.dataset.categoryId = category.id;
      categoryEl.dataset.categoryIndex = catIndex + 1;

      categoryEl.innerHTML = `
        <div class="category-header" tabindex="0" role="button" aria-expanded="${!isCollapsed}">
          <h2 class="category-title">${escapeHtml(category.name)}</h2>
          <span class="category-toggle">▼</span>
        </div>
        <div class="category-links">
          ${categoryLinks.map(link => renderLink(link)).join('')}
        </div>
      `;

      grid.appendChild(categoryEl);
    });

    // Add click handlers for category headers
    document.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', toggleCategory);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCategory.call(header);
        }
      });
    });
  }

  // Render a single link
  function renderLink(link) {
    const s = appData.settings;
    const isCard = s.linkDisplayMode === 'cards';
    const hoverClass = `hover-${s.linkHoverEffect}`;
    const target = (link.openBehavior || s.linkOpenBehavior) === 'newTab' ? '_blank' : '_self';
    const rel = target === '_blank' ? 'noopener noreferrer' : '';
    
    let iconHtml = '';
    if (s.showLinkIcons) {
      const iconSrc = link.customIcon || `/api/favicon?url=${encodeURIComponent(link.url)}`;
      iconHtml = `<img class="link-icon" src="${iconSrc}" alt="" loading="lazy" onerror="this.style.display='none'">`;
    }

    const tagsHtml = link.tags && link.tags.length > 0 
      ? `<div class="link-tags">${link.tags.map(t => `<span class="link-tag">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    if (isCard) {
      return `
        <a href="${escapeHtml(link.url)}" class="link-card ${hoverClass}" target="${target}" rel="${rel}" data-link-id="${link.id}">
          ${iconHtml}
          <span class="link-name">${escapeHtml(link.name)}</span>
          ${tagsHtml}
        </a>
      `;
    } else {
      return `
        <a href="${escapeHtml(link.url)}" class="link-text ${hoverClass}" target="${target}" rel="${rel}" data-link-id="${link.id}">
          ${iconHtml}
          <span class="link-name">${escapeHtml(link.name)}</span>
        </a>
      `;
    }
  }

  // Toggle category collapse
  function toggleCategory() {
    const category = this.closest('.category');
    const categoryId = category.dataset.categoryId;
    const isCollapsed = category.classList.toggle('collapsed');
    
    this.setAttribute('aria-expanded', !isCollapsed);

    if (isCollapsed) {
      if (!collapsedCategories.includes(categoryId)) {
        collapsedCategories.push(categoryId);
      }
    } else {
      collapsedCategories = collapsedCategories.filter(id => id !== categoryId);
    }

    localStorage.setItem('dashma-collapsed', JSON.stringify(collapsedCategories));
  }

  // Setup event listeners
  function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);

    // Search input
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);

    // Close search on overlay click
    document.querySelector('.search-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('search-overlay')) {
        closeSearch();
      }
    });
  }

  // Handle global keyboard shortcuts
  function handleKeydown(e) {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        closeSearch();
      }
      return;
    }

    // "/" to open search
    if (e.key === '/') {
      e.preventDefault();
      openSearch();
      return;
    }

    // Escape to close search
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }

    // Number keys 1-9 to jump to categories
    if (e.key >= '1' && e.key <= '9') {
      const catIndex = parseInt(e.key);
      const category = document.querySelector(`[data-category-index="${catIndex}"]`);
      if (category) {
        e.preventDefault();
        category.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const header = category.querySelector('.category-header');
        if (header) header.focus();
      }
      return;
    }
  }

  // Open search overlay
  function openSearch() {
    searchOpen = true;
    selectedSearchIndex = -1;
    const overlay = document.querySelector('.search-overlay');
    const input = document.querySelector('.search-input');
    overlay.classList.add('active');
    input.value = '';
    input.focus();
    document.querySelector('.search-results').innerHTML = '';
    document.body.classList.add('keyboard-nav');
  }

  // Close search overlay
  function closeSearch() {
    if (!searchOpen) return;
    searchOpen = false;
    selectedSearchIndex = -1;
    document.querySelector('.search-overlay').classList.remove('active');
    document.body.classList.remove('keyboard-nav');
  }

  // Handle search input
  function handleSearchInput(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      document.querySelector('.search-results').innerHTML = '';
      filteredResults = [];
      return;
    }

    filteredResults = appData.links.filter(link => {
      const nameMatch = link.name.toLowerCase().includes(query);
      const urlMatch = link.url.toLowerCase().includes(query);
      const tagMatch = link.tags && link.tags.some(t => t.toLowerCase().includes(query));
      return nameMatch || urlMatch || tagMatch;
    });

    renderSearchResults();
  }

  // Render search results
  function renderSearchResults() {
    const container = document.querySelector('.search-results');
    const s = appData.settings;

    if (filteredResults.length === 0) {
      container.innerHTML = '<div class="search-hint">No results found</div>';
      return;
    }

    container.innerHTML = filteredResults.map((link, index) => {
      const category = appData.categories.find(c => c.id === link.categoryId);
      const categoryName = category ? category.name : '';
      
      let iconHtml = '';
      if (s.showLinkIcons) {
        const iconSrc = link.customIcon || `/api/favicon?url=${encodeURIComponent(link.url)}`;
        iconHtml = `<img class="search-result-icon" src="${iconSrc}" alt="" onerror="this.style.display='none'">`;
      }

      return `
        <div class="search-result-item ${index === selectedSearchIndex ? 'selected' : ''}" 
             data-index="${index}" 
             data-url="${escapeHtml(link.url)}"
             data-link-id="${link.id}">
          ${iconHtml}
          <span class="search-result-name">${escapeHtml(link.name)}</span>
          <span class="search-result-category">${escapeHtml(categoryName)}</span>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        navigateToResult(parseInt(item.dataset.index));
      });
    });
  }

  // Handle search keyboard navigation
  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        selectedSearchIndex = Math.min(selectedSearchIndex + 1, filteredResults.length - 1);
        renderSearchResults();
        scrollToSelectedResult();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
        renderSearchResults();
        scrollToSelectedResult();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSearchIndex >= 0 && selectedSearchIndex < filteredResults.length) {
        navigateToResult(selectedSearchIndex);
      } else if (filteredResults.length > 0) {
        navigateToResult(0);
      }
      return;
    }
  }

  // Scroll to selected search result
  function scrollToSelectedResult() {
    const selected = document.querySelector('.search-result-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  // Navigate to search result
  function navigateToResult(index) {
    const link = filteredResults[index];
    if (!link) return;

    const target = (link.openBehavior || appData.settings.linkOpenBehavior) === 'newTab' ? '_blank' : '_self';
    window.open(link.url, target);
    closeSearch();
  }

  // Utility: Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Start the app
  document.addEventListener('DOMContentLoaded', init);
})();
