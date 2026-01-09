// Dashma - Main JavaScript
(function() {
  'use strict';

  let appData = null;
  let monitoringStatuses = {};
  let searchOpen = false;
  let selectedSearchIndex = -1;
  let filteredResults = [];
  let collapsedCategories = JSON.parse(localStorage.getItem('dashma-collapsed') || '[]');
  let monitoringPollInterval = null;

  // Initialize app
  async function init() {
    try {
      const response = await fetch('/api/public/data');
      appData = await response.json();
      applySettings();
      // Render widgets in all positions
      renderWidgets('header');
      renderWidgets('left-sidebar');
      renderWidgets('right-sidebar');
      renderWidgets('above-categories');
      renderCategories();
      renderWidgets('below-categories');
      renderWidgets('footer');
      setupEventListeners();
      // Start monitoring polling
      startMonitoringPolling();
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  // Start polling for monitoring statuses
  function startMonitoringPolling() {
    // Initial fetch
    fetchMonitoringStatuses();
    // Poll every 30 seconds
    monitoringPollInterval = setInterval(fetchMonitoringStatuses, 30000);
  }

  // Fetch monitoring statuses from API
  async function fetchMonitoringStatuses() {
    try {
      const response = await fetch('/api/public/monitoring/status');
      monitoringStatuses = await response.json();
      updateStatusBubbles();
    } catch (err) {
      console.error('Failed to fetch monitoring statuses:', err);
    }
  }

  // Update status bubbles without re-rendering everything
  function updateStatusBubbles() {
    // Update link status bubbles
    document.querySelectorAll('[data-link-id]').forEach(linkEl => {
      const linkId = linkEl.dataset.linkId;
      const statusKey = `link-${linkId}`;
      const status = monitoringStatuses[statusKey];

      const existingBubble = linkEl.querySelector('.status-bubble');
      const linkNameEl = linkEl.querySelector('.link-name');

      if (status) {
        const statusClass = status.status || 'unknown';
        if (existingBubble) {
          existingBubble.className = `status-bubble ${statusClass}`;
        } else if (linkNameEl) {
          const bubble = document.createElement('span');
          bubble.className = `status-bubble ${statusClass}`;
          linkNameEl.parentNode.insertBefore(bubble, linkNameEl);
        }
      } else if (existingBubble) {
        existingBubble.remove();
      }
    });

    // Update widget server statuses
    document.querySelectorAll('.server-item[data-status-key]').forEach(serverEl => {
      const statusKey = serverEl.dataset.statusKey;
      const status = monitoringStatuses[statusKey];

      const bubble = serverEl.querySelector('.status-bubble');
      const latencyEl = serverEl.querySelector('.server-latency');
      const lastCheckedEl = serverEl.querySelector('.last-checked');

      if (status && bubble) {
        bubble.className = `status-bubble ${status.status || 'unknown'}`;
        if (latencyEl && status.latency !== null) {
          latencyEl.textContent = `${status.latency}ms`;
        } else if (latencyEl) {
          latencyEl.textContent = '';
        }
        if (lastCheckedEl && status.lastChecked) {
          const time = new Date(status.lastChecked).toLocaleTimeString();
          lastCheckedEl.textContent = time;
        }
      }
    });
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

    // Status bubble for monitored links (will be updated by polling)
    const statusKey = `link-${link.id}`;
    const status = monitoringStatuses[statusKey];
    const statusBubble = link.monitoring?.enabled
      ? `<span class="status-bubble ${status?.status || 'unknown'}"></span>`
      : '';

    const tagsHtml = link.tags && link.tags.length > 0
      ? `<div class="link-tags">${link.tags.map(t => `<span class="link-tag">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    if (isCard) {
      return `
        <a href="${escapeHtml(link.url)}" class="link-card ${hoverClass}" target="${target}" rel="${rel}" data-link-id="${link.id}">
          ${iconHtml}
          ${statusBubble}
          <span class="link-name">${escapeHtml(link.name)}</span>
          ${tagsHtml}
        </a>
      `;
    } else {
      return `
        <a href="${escapeHtml(link.url)}" class="link-text ${hoverClass}" target="${target}" rel="${rel}" data-link-id="${link.id}">
          ${iconHtml}
          ${statusBubble}
          <span class="link-name">${escapeHtml(link.name)}</span>
        </a>
      `;
    }
  }

  // Render widgets for a position
  function renderWidgets(position) {
    // Map position to container ID
    const containerIdMap = {
      'header': 'widgetsHeader',
      'above-categories': 'widgetsAbove',
      'below-categories': 'widgetsBelow',
      'footer': 'widgetsFooter',
      'left-sidebar': 'widgetsSidebarLeft',
      'right-sidebar': 'widgetsSidebarRight'
    };

    const containerId = containerIdMap[position];
    if (!containerId) return;

    let container = document.getElementById(containerId);

    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.id = containerId;
      container.className = `widgets-container widgets-${position.replace('-', '-')}`;

      const grid = document.querySelector('.categories-grid');
      if (position === 'above-categories') {
        grid.parentNode.insertBefore(container, grid);
      } else if (position === 'below-categories') {
        grid.parentNode.insertBefore(container, grid.nextSibling);
      }
      // Other positions should already exist in HTML
    }

    const widgets = (appData.widgets || [])
      .filter(w => w.enabled && w.position === position)
      .sort((a, b) => a.order - b.order);

    container.innerHTML = widgets.map(widget => renderWidget(widget)).join('');

    // Show/hide container based on whether it has widgets
    if (widgets.length === 0) {
      container.style.display = 'none';
    } else {
      container.style.display = '';
    }

    // Initialize clock widgets
    initClockWidgets();
    // Initialize weather widgets
    initWeatherWidgets();
  }

  // Render a single widget
  function renderWidget(widget) {
    switch (widget.type) {
      case 'server-monitor':
        return renderServerMonitorWidget(widget);
      case 'clock':
        return renderClockWidget(widget);
      case 'weather':
        return renderWeatherWidget(widget);
      case 'iframe':
        return renderIframeWidget(widget);
      case 'custom-html':
        return renderCustomHtmlWidget(widget);
      default:
        return '';
    }
  }

  // Server Monitor Widget
  function renderServerMonitorWidget(widget) {
    const config = widget.config || {};
    const servers = config.servers || [];
    const showLatency = config.showLatency !== false;
    const showLastChecked = config.showLastChecked || false;

    // Build widget classes for styling
    const widgetClasses = ['widget', 'server-monitor-widget'];

    // Display mode classes
    if (config.displayMode === 'grid') {
      widgetClasses.push('display-grid');
      widgetClasses.push(`cols-${config.columns || '2'}`);
    } else if (config.displayMode === 'compact') {
      widgetClasses.push('display-compact');
    }

    // Item style classes
    if (config.itemStyle === 'text') widgetClasses.push('item-text');
    else if (config.itemStyle === 'minimal') widgetClasses.push('item-minimal');

    // Text size
    widgetClasses.push(`text-${config.textSize || 'medium'}`);

    // Hover effect
    if (config.hoverEffect && config.hoverEffect !== 'none') {
      widgetClasses.push(`hover-${config.hoverEffect}`);
    }

    // Border radius
    widgetClasses.push(`radius-${config.borderRadius || 'small'}`);

    // Container style
    if (config.containerStyle === 'transparent') widgetClasses.push('container-transparent');
    else if (config.containerStyle === 'bordered') widgetClasses.push('container-bordered');

    // Build inline styles for custom colors
    let widgetStyle = '';
    if (config.containerBgColor) {
      widgetStyle += `background: ${config.containerBgColor};`;
    }

    let itemStyle = '';
    if (config.itemBgColor) {
      itemStyle += `background: ${config.itemBgColor};`;
    }
    if (config.textColor) {
      itemStyle += `color: ${config.textColor};`;
    }

    const serversHtml = servers.map(server => {
      const statusKey = `widget-${widget.id}-${server.id}`;
      const status = monitoringStatuses[statusKey];
      const statusClass = status?.status || 'unknown';
      const latency = status?.latency !== null && status?.latency !== undefined ? `${status.latency}ms` : '';
      const lastChecked = status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString() : '';

      return `
        <div class="server-item" data-status-key="${statusKey}"${itemStyle ? ` style="${itemStyle}"` : ''}>
          <span class="status-bubble ${statusClass}"></span>
          <span class="server-name">${escapeHtml(server.name || server.host)}</span>
          ${showLatency ? `<span class="server-latency">${latency}</span>` : ''}
          ${showLastChecked ? `<span class="last-checked">${lastChecked}</span>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="${widgetClasses.join(' ')}" data-widget-id="${widget.id}"${widgetStyle ? ` style="${widgetStyle}"` : ''}>
        ${widget.title ? `<div class="widget-title">${escapeHtml(widget.title)}</div>` : ''}
        <div class="server-list">
          ${serversHtml}
        </div>
      </div>
    `;
  }

  // Clock Widget
  function renderClockWidget(widget) {
    const config = widget.config || {};

    // Build CSS classes array
    const classes = ['widget', 'clock-widget'];

    // Size preset
    if (config.size && config.size !== 'medium') {
      classes.push(`size-${config.size}`);
    }

    // Font family
    if (config.fontFamily && config.fontFamily !== 'theme') {
      classes.push(`font-${config.fontFamily}`);
    }

    // Font weight
    if (config.fontWeight && config.fontWeight !== 'normal') {
      classes.push(`weight-${config.fontWeight}`);
    }

    // Container style
    if (config.containerStyle && config.containerStyle !== 'card') {
      classes.push(`container-${config.containerStyle}`);
    }

    // Border radius
    if (config.borderRadius && config.borderRadius !== 'medium') {
      classes.push(`radius-${config.borderRadius}`);
    }

    // Text shadow
    if (config.textShadow && config.textShadow !== 'none') {
      classes.push(`shadow-${config.textShadow}`);
    }

    // Text gradient
    if (config.textGradient && config.textGradient !== 'none') {
      classes.push(`gradient-${config.textGradient}`);
    }

    // Hover effect
    if (config.hoverEffect && config.hoverEffect !== 'none') {
      classes.push(`hover-${config.hoverEffect}`);
    }

    // Animation
    if (config.animation && config.animation !== 'none') {
      classes.push(`anim-${config.animation}`);
    }

    // Text alignment within widget
    if (config.alignment && config.alignment !== 'center') {
      classes.push(`text-${config.alignment}`);
    }

    // Widget width
    if (widget.width && widget.width !== 'full') {
      classes.push(`width-${widget.width}`);
    }

    // Widget alignment (horizontal position)
    if (widget.alignment && widget.alignment !== 'center') {
      classes.push(`align-${widget.alignment}`);
    }

    // Build inline styles for custom colors
    const styles = [];
    if (config.textColor) {
      styles.push(`--clock-text-color: ${config.textColor}`);
    }
    if (config.dateColor) {
      styles.push(`--clock-date-color: ${config.dateColor}`);
    }
    if (config.bgColor) {
      styles.push(`background-color: ${config.bgColor}`);
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';

    return `
      <div class="${classes.join(' ')}" data-widget-id="${widget.id}" data-timezone="${config.timezone || ''}" data-format="${config.format || '12h'}" data-show-date="${config.showDate !== false}" data-show-seconds="${config.showSeconds || false}"${styleAttr}>
        ${widget.title ? `<div class="widget-title">${escapeHtml(widget.title)}</div>` : ''}
        <div class="time"></div>
        ${config.showDate !== false ? '<div class="date"></div>' : ''}
      </div>
    `;
  }

  // Initialize and update clock widgets
  function initClockWidgets() {
    function updateClocks() {
      document.querySelectorAll('.clock-widget').forEach(clockEl => {
        const timezoneRaw = clockEl.dataset.timezone;
        const timezone = (timezoneRaw && timezoneRaw !== 'local') ? timezoneRaw : undefined;
        const format = clockEl.dataset.format || '12';
        const showDate = clockEl.dataset.showDate === 'true';
        const showSeconds = clockEl.dataset.showSeconds === 'true';

        const now = new Date();
        const options = {};
        if (timezone) options.timeZone = timezone;

        let timeStr;
        if (format === '24') {
          options.hour = '2-digit';
          options.minute = '2-digit';
          if (showSeconds) options.second = '2-digit';
          options.hour12 = false;
        } else {
          options.hour = 'numeric';
          options.minute = '2-digit';
          if (showSeconds) options.second = '2-digit';
          options.hour12 = true;
        }

        timeStr = now.toLocaleTimeString(undefined, options);

        const timeEl = clockEl.querySelector('.time');
        if (timeEl) timeEl.textContent = timeStr;

        if (showDate) {
          const dateEl = clockEl.querySelector('.date');
          if (dateEl) {
            const dateOptions = { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString(undefined, dateOptions);
          }
        }
      });
    }

    updateClocks();
    setInterval(updateClocks, 1000);
  }

  // Initialize weather widgets
  function initWeatherWidgets() {
    document.querySelectorAll('.weather-widget').forEach(weatherEl => {
      const apiKey = weatherEl.dataset.apiKey;
      const location = weatherEl.dataset.location;
      const units = weatherEl.dataset.units || 'imperial';

      if (!apiKey || !location) {
        weatherEl.querySelector('.condition').textContent = 'API key or location not set';
        return;
      }

      fetchWeather(weatherEl, apiKey, location, units);
    });

    // Refresh weather every 10 minutes
    setInterval(() => {
      document.querySelectorAll('.weather-widget').forEach(weatherEl => {
        const apiKey = weatherEl.dataset.apiKey;
        const location = weatherEl.dataset.location;
        const units = weatherEl.dataset.units || 'imperial';
        if (apiKey && location) {
          fetchWeather(weatherEl, apiKey, location, units);
        }
      });
    }, 600000);
  }

  // Fetch weather data from OpenWeatherMap
  async function fetchWeather(weatherEl, apiKey, location, units) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${units}&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Weather API error');
      }

      const data = await response.json();
      const tempUnit = units === 'metric' ? '°C' : '°F';
      const temp = Math.round(data.main.temp);
      const condition = data.weather[0]?.description || '';

      weatherEl.querySelector('.temperature').textContent = `${temp}${tempUnit}`;
      weatherEl.querySelector('.condition').textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

      // Add weather icon if available
      if (data.weather[0]?.icon) {
        const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        const existingIcon = weatherEl.querySelector('.weather-icon');
        if (existingIcon) {
          existingIcon.src = iconUrl;
        } else {
          const iconImg = document.createElement('img');
          iconImg.className = 'weather-icon';
          iconImg.src = iconUrl;
          iconImg.alt = condition;
          weatherEl.querySelector('.temperature').before(iconImg);
        }
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      weatherEl.querySelector('.condition').textContent = 'Unable to load weather';
    }
  }

  // Weather Widget
  function renderWeatherWidget(widget) {
    const config = widget.config || {};
    // Weather will be fetched and updated separately
    return `
      <div class="widget weather-widget" data-widget-id="${widget.id}" data-api-key="${config.apiKey || ''}" data-location="${config.location || ''}" data-units="${config.units || 'imperial'}">
        ${widget.title ? `<div class="widget-title">${escapeHtml(widget.title)}</div>` : ''}
        <div class="temperature">--°</div>
        <div class="condition">Loading...</div>
        <div class="location">${escapeHtml(config.location || '')}</div>
      </div>
    `;
  }

  // Iframe Widget
  function renderIframeWidget(widget) {
    const config = widget.config || {};
    const height = config.height || '300px';
    const sandbox = config.sandbox || 'allow-scripts allow-same-origin';

    return `
      <div class="widget iframe-widget" data-widget-id="${widget.id}">
        ${widget.title ? `<div class="widget-title">${escapeHtml(widget.title)}</div>` : ''}
        <iframe src="${escapeHtml(config.url || '')}" style="height: ${height};" sandbox="${sandbox}" ${config.allowFullscreen ? 'allowfullscreen' : ''}></iframe>
      </div>
    `;
  }

  // Custom HTML Widget
  function renderCustomHtmlWidget(widget) {
    const config = widget.config || {};
    const customCss = config.css ? `<style>${config.css}</style>` : '';

    return `
      <div class="widget custom-html-widget" data-widget-id="${widget.id}">
        ${widget.title ? `<div class="widget-title">${escapeHtml(widget.title)}</div>` : ''}
        ${customCss}
        <div class="custom-content">${config.html || ''}</div>
      </div>
    `;
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
