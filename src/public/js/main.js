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

    // Check if a theme is selected (not 'custom')
    let colors = {
      backgroundColor: s.backgroundColor,
      textColor: s.textColor,
      accentColor: s.accentColor,
      categoryBgColor: s.categoryBgColor,
      categoryTitleColor: s.categoryTitleColor,
      linkCardBgColor: s.linkCardBgColor,
      tagBgColor: s.tagBgColor
    };

    if (s.colorTheme && s.colorTheme !== 'custom' && typeof getTheme === 'function') {
      const theme = getTheme(s.colorTheme);
      if (theme && theme.colors) {
        colors = { ...colors, ...theme.colors };
      }
    }

    root.style.setProperty('--bg-color', colors.backgroundColor);
    root.style.setProperty('--bg-image', s.backgroundImage ? `url(${s.backgroundImage})` : 'none');
    root.style.setProperty('--font-family', s.fontFamily);
    root.style.setProperty('--title-font', s.titleFontFamily);
    root.style.setProperty('--text-color', colors.textColor);
    root.style.setProperty('--accent-color', colors.accentColor);
    if (colors.categoryBgColor) root.style.setProperty('--category-bg-color', colors.categoryBgColor);
    if (colors.categoryTitleColor) root.style.setProperty('--category-title-color', colors.categoryTitleColor);
    if (colors.linkCardBgColor) root.style.setProperty('--link-card-bg-color', colors.linkCardBgColor);
    if (colors.tagBgColor) root.style.setProperty('--tag-bg-color', colors.tagBgColor);

    // Apply title settings
    const header = document.querySelector('.header');
    const headerContent = document.querySelector('.header-content');
    const titleWrapper = document.querySelector('.title-wrapper');
    const siteLogo = document.querySelector('.site-logo');

    // Build title element with optional link
    const titleHoverClass = s.titleHoverEffect && s.titleHoverEffect !== 'none' ? `title-hover-${s.titleHoverEffect}` : '';
    if (s.titleLinkUrl) {
      titleWrapper.innerHTML = `<a href="${escapeHtml(s.titleLinkUrl)}" class="site-title-link ${titleHoverClass}"><h1 class="site-title size-${s.titleSize || 'large'}">${escapeHtml(s.siteName)}</h1></a>`;
    } else {
      titleWrapper.innerHTML = `<h1 class="site-title ${titleHoverClass} size-${s.titleSize || 'large'}">${escapeHtml(s.siteName)}</h1>`;
    }

    // Site logo
    const logoPosition = s.logoPosition || 'above';
    const logoAlignment = s.logoAlignment || 'center';
    const logoSize = s.logoSize || 'medium';
    const showLogo = s.showLogo !== false;
    let logoVisible = false;

    // Apply logo size class
    siteLogo.className = `site-logo size-${logoSize}`;

    if (showLogo && s.siteLogoMode === 'favicon') {
      const firstLink = appData.links && appData.links[0];
      if (firstLink) {
        siteLogo.src = `/api/favicon?url=${encodeURIComponent(firstLink.url)}`;
        siteLogo.style.display = 'block';
        logoVisible = true;
      } else {
        siteLogo.style.display = 'none';
      }
    } else if (showLogo && s.siteLogoMode === 'custom' && s.siteLogo) {
      siteLogo.src = s.siteLogo;
      siteLogo.style.display = 'block';
      logoVisible = true;
    } else {
      siteLogo.style.display = 'none';
    }

    // Apply logo position and alignment only when logo is visible
    headerContent.className = 'header-content';
    if (logoVisible) {
      headerContent.classList.add(`logo-${logoPosition}`);
      headerContent.classList.add(`logo-align-${logoAlignment}`);
    }

    // Reorder elements based on position and alignment
    // For inline + right: logo goes after title (on the right side)
    // For below: logo goes after title
    // Otherwise: logo goes before title
    if (logoPosition === 'below' || (logoPosition === 'inline' && logoAlignment === 'right')) {
      headerContent.appendChild(siteLogo);
    } else {
      headerContent.insertBefore(siteLogo, titleWrapper);
    }

    // Title alignment
    header.className = 'header';
    header.classList.add(`align-${s.titleAlignment || 'center'}`);

    // Show/hide title text (not the whole header)
    const titleEl = titleWrapper.querySelector('.site-title');
    if (titleEl && s.showTitle === false) {
      titleWrapper.style.display = 'none';
    } else {
      titleWrapper.style.display = '';
    }

    // Hide header only if both title and logo are hidden
    if (s.showTitle === false && !logoVisible) {
      header.classList.add('hidden');
    }

    const grid = document.querySelector('.categories-grid');
    grid.className = `categories-grid cols-${s.columns}`;
    grid.classList.add(`nest-${s.nestingAnimation}`);

    // Apply compact mode if category background is disabled
    if (s.showCategoryBackground === false) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }

    // Apply footer settings
    const footer = document.querySelector('.site-footer');
    const footerText = document.querySelector('.footer-text');
    if (s.showFooter && s.footerText) {
      footerText.textContent = s.footerText;
      footer.className = `site-footer align-${s.footerAlignment || 'center'} size-${s.footerSize || 'small'}`;
      if (s.footerHoverEffect && s.footerHoverEffect !== 'none') {
        footer.classList.add(`footer-hover-${s.footerHoverEffect}`);
      }
      footer.style.display = 'block';
    } else {
      footer.style.display = 'none';
    }

    // Apply request link settings
    const requestLinkContainer = document.querySelector('.request-link-container');
    const requestLink = document.querySelector('.request-link');
    if (s.showRequestLink) {
      requestLink.textContent = s.requestLinkText || 'Request Link Addition';
      requestLink.href = s.requestLinkUrl || '/request';
      requestLinkContainer.style.display = 'block';
    } else {
      requestLinkContainer.style.display = 'none';
    }

    // Setup hacked text effect for title if enabled
    if (s.titleHoverEffect === 'hacked') {
      const titleEl = document.querySelector('.site-title');
      if (titleEl && !titleEl.dataset.value) {
        titleEl.dataset.value = titleEl.innerText;
      }
      const titleParent = titleEl?.parentElement;
      if (titleParent) {
        titleParent.addEventListener('mouseenter', () => hackedTextEffect(titleEl));
        titleParent.addEventListener('mouseleave', () => resetHackedText(titleEl));
      }
    }

    // Update browser tab title
    document.title = s.siteName || 'Dashma';

    // Show header now that settings are applied (was hidden to prevent FOUC)
    header.style.visibility = 'visible';
  }

  // Render categories and links
  function renderCategories() {
    const grid = document.querySelector('.categories-grid');
    grid.innerHTML = '';

    const sortedCategories = [...appData.categories].sort((a, b) => a.order - b.order);
    const numColumns = parseInt(appData.settings.columns) || 1;

    // Create column containers
    const columns = [];
    for (let i = 0; i < numColumns; i++) {
      const column = document.createElement('div');
      column.className = 'category-column';
      columns.push(column);
      grid.appendChild(column);
    }

    // Distribute categories into columns (round-robin distribution)
    sortedCategories.forEach((category, catIndex) => {
      const categoryLinks = appData.links
        .filter(l => l.categoryId === category.id)
        .sort((a, b) => a.order - b.order);

      const isCollapsed = collapsedCategories.includes(category.id);
      const hoverClass = `cat-hover-${appData.settings.categoryHoverEffect}`;
      const headingSizeClass = `size-${appData.settings.categoryHeadingSize || 'medium'}`;
      const showArrow = appData.settings.showCategoryArrow !== false;

      const categoryEl = document.createElement('div');
      categoryEl.className = `category ${hoverClass} ${isCollapsed ? 'collapsed' : ''}`;
      categoryEl.dataset.categoryId = category.id;
      categoryEl.dataset.categoryIndex = catIndex + 1;

      categoryEl.innerHTML = `
        <div class="category-header" tabindex="0" role="button" aria-expanded="${!isCollapsed}">
          ${showArrow ? '<span class="category-toggle">▼</span>' : ''}
          <h2 class="category-title ${headingSizeClass}">${escapeHtml(category.name)}</h2>
        </div>
        <div class="category-links">
          ${categoryLinks.map(link => renderLink(link)).join('')}
        </div>
      `;

      // Add to appropriate column (round-robin)
      const columnIndex = catIndex % numColumns;
      columns[columnIndex].appendChild(categoryEl);
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

    // Setup hacked text effect listeners if enabled
    if (appData.settings.linkHoverEffect === 'hacked') {
      setupHackedTextListeners('.hover-hacked .link-name');
    }
    if (appData.settings.categoryHoverEffect === 'hacked') {
      setupHackedTextListeners('.cat-hover-hacked .category-title');
    }
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
      // Pass link name as app hint for selfh.st icon lookup
      const iconSrc = link.customIcon || `/api/favicon?url=${encodeURIComponent(link.url)}&app=${encodeURIComponent(link.name)}`;
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

    // Mobile search button
    const mobileSearchBtn = document.querySelector('.mobile-search-btn');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', openSearch);
    }
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

    // "e" to expand all categories
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      expandAllCategories();
      return;
    }

    // "c" to collapse all categories
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      collapseAllCategories();
      return;
    }
  }

  // Expand all categories
  function expandAllCategories() {
    document.querySelectorAll('.category.collapsed').forEach(category => {
      category.classList.remove('collapsed');
      const header = category.querySelector('.category-header');
      if (header) header.setAttribute('aria-expanded', 'true');
    });
    collapsedCategories = [];
    localStorage.setItem('dashma-collapsed', JSON.stringify(collapsedCategories));
  }

  // Collapse all categories
  function collapseAllCategories() {
    const allCategoryIds = [];
    document.querySelectorAll('.category').forEach(category => {
      category.classList.add('collapsed');
      const header = category.querySelector('.category-header');
      if (header) header.setAttribute('aria-expanded', 'false');
      allCategoryIds.push(category.dataset.categoryId);
    });
    collapsedCategories = allCategoryIds;
    localStorage.setItem('dashma-collapsed', JSON.stringify(collapsedCategories));
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
        const iconSrc = link.customIcon || `/api/favicon?url=${encodeURIComponent(link.url)}&app=${encodeURIComponent(link.name)}`;
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

  // Hacked/Matrix text effect - scrambles letters before revealing text
  function hackedTextEffect(element) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const originalText = element.dataset.value;
    if (!originalText) return;

    // Clear any existing interval
    if (element.hackedInterval) {
      clearInterval(element.hackedInterval);
    }

    let iteration = 0;
    element.hackedInterval = setInterval(() => {
      element.innerText = originalText
        .split("")
        .map((letter, index) => {
          if (index < iteration) return originalText[index];
          if (letter === " ") return " ";
          return letters[Math.floor(Math.random() * 26)];
        })
        .join("");

      if (iteration >= originalText.length) {
        clearInterval(element.hackedInterval);
        element.hackedInterval = null;
      }
      iteration += 1/3;
    }, 30);
  }

  // Reset hacked text to original
  function resetHackedText(element) {
    if (element.hackedInterval) {
      clearInterval(element.hackedInterval);
      element.hackedInterval = null;
    }
    const originalText = element.dataset.value;
    if (originalText) {
      element.innerText = originalText;
    }
  }

  // Setup hacked text effect listeners
  function setupHackedTextListeners(selector) {
    document.querySelectorAll(selector).forEach(element => {
      // Store original text if not already stored
      if (!element.dataset.value) {
        element.dataset.value = element.innerText;
      }

      const parent = element.parentElement;
      parent.addEventListener('mouseenter', () => hackedTextEffect(element));
      parent.addEventListener('mouseleave', () => resetHackedText(element));
    });
  }

  // Start the app
  document.addEventListener('DOMContentLoaded', init);
})();
