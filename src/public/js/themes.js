// Dashma Color Themes
// Pre-made color schemes inspired by popular dashboard and editor themes

const DASHMA_THEMES = {
  // Default Dashma dark theme
  default: {
    name: 'Default',
    description: 'The original Dashma dark theme',
    colors: {
      backgroundColor: '#212121',
      textColor: '#ffffff',
      accentColor: '#888888',
      categoryBgColor: 'rgba(255,255,255,0.03)',
      categoryTitleColor: '#ffffff',
      linkCardBgColor: 'rgba(255,255,255,0.05)',
      tagBgColor: 'rgba(255,255,255,0.1)'
    }
  },

  // Dracula - Popular dark theme with vibrant accents
  dracula: {
    name: 'Dracula',
    description: 'Dark theme with purple and pink accents',
    colors: {
      backgroundColor: '#282a36',
      textColor: '#f8f8f2',
      accentColor: '#bd93f9',
      categoryBgColor: 'rgba(68,71,90,0.5)',
      categoryTitleColor: '#ff79c6',
      linkCardBgColor: 'rgba(68,71,90,0.7)',
      tagBgColor: 'rgba(189,147,249,0.2)'
    }
  },

  // Catppuccin Mocha - Darkest catppuccin flavor
  catppuccinMocha: {
    name: 'Catppuccin Mocha',
    description: 'Warm dark theme with pastel accents',
    colors: {
      backgroundColor: '#1e1e2e',
      textColor: '#cdd6f4',
      accentColor: '#89b4fa',
      categoryBgColor: 'rgba(49,50,68,0.6)',
      categoryTitleColor: '#cba6f7',
      linkCardBgColor: 'rgba(49,50,68,0.8)',
      tagBgColor: 'rgba(137,180,250,0.2)'
    }
  },

  // Catppuccin Macchiato - Medium dark
  catppuccinMacchiato: {
    name: 'Catppuccin Macchiato',
    description: 'Medium contrast with gentle colors',
    colors: {
      backgroundColor: '#24273a',
      textColor: '#cad3f5',
      accentColor: '#8aadf4',
      categoryBgColor: 'rgba(54,58,79,0.6)',
      categoryTitleColor: '#c6a0f6',
      linkCardBgColor: 'rgba(54,58,79,0.8)',
      tagBgColor: 'rgba(138,173,244,0.2)'
    }
  },

  // Catppuccin Frappe - Muted dark
  catppuccinFrappe: {
    name: 'Catppuccin Frappe',
    description: 'Subdued colors for a muted aesthetic',
    colors: {
      backgroundColor: '#303446',
      textColor: '#c6d0f5',
      accentColor: '#8caaee',
      categoryBgColor: 'rgba(65,69,89,0.6)',
      categoryTitleColor: '#ca9ee6',
      linkCardBgColor: 'rgba(65,69,89,0.8)',
      tagBgColor: 'rgba(140,170,238,0.2)'
    }
  },

  // Catppuccin Latte - Light theme
  catppuccinLatte: {
    name: 'Catppuccin Latte',
    description: 'Light theme with warm undertones',
    colors: {
      backgroundColor: '#eff1f5',
      textColor: '#4c4f69',
      accentColor: '#1e66f5',
      categoryBgColor: 'rgba(172,176,190,0.3)',
      categoryTitleColor: '#8839ef',
      linkCardBgColor: 'rgba(172,176,190,0.4)',
      tagBgColor: 'rgba(30,102,245,0.15)'
    }
  },

  // Nord - Arctic blue theme
  nord: {
    name: 'Nord',
    description: 'Arctic, north-bluish color palette',
    colors: {
      backgroundColor: '#2e3440',
      textColor: '#eceff4',
      accentColor: '#88c0d0',
      categoryBgColor: 'rgba(59,66,82,0.6)',
      categoryTitleColor: '#81a1c1',
      linkCardBgColor: 'rgba(59,66,82,0.8)',
      tagBgColor: 'rgba(136,192,208,0.2)'
    }
  },

  // Nord Light
  nordLight: {
    name: 'Nord Light',
    description: 'Light variant of the Nord palette',
    colors: {
      backgroundColor: '#eceff4',
      textColor: '#2e3440',
      accentColor: '#5e81ac',
      categoryBgColor: 'rgba(216,222,233,0.7)',
      categoryTitleColor: '#5e81ac',
      linkCardBgColor: 'rgba(216,222,233,0.9)',
      tagBgColor: 'rgba(94,129,172,0.15)'
    }
  },

  // Gruvbox Dark
  gruvboxDark: {
    name: 'Gruvbox Dark',
    description: 'Retro groove dark theme',
    colors: {
      backgroundColor: '#282828',
      textColor: '#ebdbb2',
      accentColor: '#8ec07c',
      categoryBgColor: 'rgba(60,56,54,0.7)',
      categoryTitleColor: '#d79921',
      linkCardBgColor: 'rgba(60,56,54,0.9)',
      tagBgColor: 'rgba(142,192,124,0.2)'
    }
  },

  // Gruvbox Light
  gruvboxLight: {
    name: 'Gruvbox Light',
    description: 'Retro groove light theme',
    colors: {
      backgroundColor: '#fbf1c7',
      textColor: '#3c3836',
      accentColor: '#458588',
      categoryBgColor: 'rgba(235,219,178,0.7)',
      categoryTitleColor: '#b57614',
      linkCardBgColor: 'rgba(235,219,178,0.9)',
      tagBgColor: 'rgba(69,133,136,0.15)'
    }
  },

  // Solarized Dark
  solarizedDark: {
    name: 'Solarized Dark',
    description: 'Precision colors with reduced eye strain',
    colors: {
      backgroundColor: '#002b36',
      textColor: '#839496',
      accentColor: '#2aa198',
      categoryBgColor: 'rgba(7,54,66,0.7)',
      categoryTitleColor: '#268bd2',
      linkCardBgColor: 'rgba(7,54,66,0.9)',
      tagBgColor: 'rgba(42,161,152,0.2)'
    }
  },

  // Solarized Light
  solarizedLight: {
    name: 'Solarized Light',
    description: 'Light precision colors',
    colors: {
      backgroundColor: '#fdf6e3',
      textColor: '#657b83',
      accentColor: '#2aa198',
      categoryBgColor: 'rgba(238,232,213,0.7)',
      categoryTitleColor: '#268bd2',
      linkCardBgColor: 'rgba(238,232,213,0.9)',
      tagBgColor: 'rgba(42,161,152,0.15)'
    }
  },

  // One Dark - Atom-inspired
  oneDark: {
    name: 'One Dark',
    description: 'Atom editor inspired dark theme',
    colors: {
      backgroundColor: '#282c34',
      textColor: '#abb2bf',
      accentColor: '#61afef',
      categoryBgColor: 'rgba(50,54,62,0.7)',
      categoryTitleColor: '#c678dd',
      linkCardBgColor: 'rgba(50,54,62,0.9)',
      tagBgColor: 'rgba(97,175,239,0.2)'
    }
  },

  // Tokyo Night
  tokyoNight: {
    name: 'Tokyo Night',
    description: 'Dark theme inspired by Tokyo city lights',
    colors: {
      backgroundColor: '#1a1b26',
      textColor: '#a9b1d6',
      accentColor: '#7aa2f7',
      categoryBgColor: 'rgba(36,40,59,0.7)',
      categoryTitleColor: '#bb9af7',
      linkCardBgColor: 'rgba(36,40,59,0.9)',
      tagBgColor: 'rgba(122,162,247,0.2)'
    }
  },

  // Ayu Dark
  ayuDark: {
    name: 'Ayu Dark',
    description: 'Modern dark theme with orange accents',
    colors: {
      backgroundColor: '#0d1017',
      textColor: '#bfbdb6',
      accentColor: '#ffb454',
      categoryBgColor: 'rgba(15,20,30,0.7)',
      categoryTitleColor: '#e6b450',
      linkCardBgColor: 'rgba(15,20,30,0.9)',
      tagBgColor: 'rgba(255,180,84,0.2)'
    }
  },

  // Ayu Light
  ayuLight: {
    name: 'Ayu Light',
    description: 'Clean light theme with warm accents',
    colors: {
      backgroundColor: '#fafafa',
      textColor: '#5c6166',
      accentColor: '#ff9940',
      categoryBgColor: 'rgba(230,230,230,0.7)',
      categoryTitleColor: '#fa8d3e',
      linkCardBgColor: 'rgba(230,230,230,0.9)',
      tagBgColor: 'rgba(255,153,64,0.15)'
    }
  },

  // GitHub Dark
  githubDark: {
    name: 'GitHub Dark',
    description: 'GitHub-inspired dark mode',
    colors: {
      backgroundColor: '#0d1117',
      textColor: '#c9d1d9',
      accentColor: '#58a6ff',
      categoryBgColor: 'rgba(22,27,34,0.7)',
      categoryTitleColor: '#58a6ff',
      linkCardBgColor: 'rgba(22,27,34,0.9)',
      tagBgColor: 'rgba(88,166,255,0.2)'
    }
  },

  // GitHub Light
  githubLight: {
    name: 'GitHub Light',
    description: 'GitHub-inspired light mode',
    colors: {
      backgroundColor: '#ffffff',
      textColor: '#24292f',
      accentColor: '#0969da',
      categoryBgColor: 'rgba(246,248,250,0.9)',
      categoryTitleColor: '#0969da',
      linkCardBgColor: 'rgba(246,248,250,1)',
      tagBgColor: 'rgba(9,105,218,0.1)'
    }
  },

  // Rosé Pine
  rosePine: {
    name: 'Rosé Pine',
    description: 'Elegant dark theme with rose accents',
    colors: {
      backgroundColor: '#191724',
      textColor: '#e0def4',
      accentColor: '#ebbcba',
      categoryBgColor: 'rgba(30,28,44,0.7)',
      categoryTitleColor: '#c4a7e7',
      linkCardBgColor: 'rgba(30,28,44,0.9)',
      tagBgColor: 'rgba(235,188,186,0.2)'
    }
  },

  // Rosé Pine Dawn (Light)
  rosePineDawn: {
    name: 'Rosé Pine Dawn',
    description: 'Soft light theme with rose tones',
    colors: {
      backgroundColor: '#faf4ed',
      textColor: '#575279',
      accentColor: '#d7827e',
      categoryBgColor: 'rgba(242,233,222,0.7)',
      categoryTitleColor: '#907aa9',
      linkCardBgColor: 'rgba(242,233,222,0.9)',
      tagBgColor: 'rgba(215,130,126,0.15)'
    }
  },

  // Everforest Dark
  everforestDark: {
    name: 'Everforest Dark',
    description: 'Green-based comfortable dark theme',
    colors: {
      backgroundColor: '#2d353b',
      textColor: '#d3c6aa',
      accentColor: '#a7c080',
      categoryBgColor: 'rgba(52,60,66,0.7)',
      categoryTitleColor: '#83c092',
      linkCardBgColor: 'rgba(52,60,66,0.9)',
      tagBgColor: 'rgba(167,192,128,0.2)'
    }
  },

  // Everforest Light
  everforestLight: {
    name: 'Everforest Light',
    description: 'Natural green-toned light theme',
    colors: {
      backgroundColor: '#fdf6e3',
      textColor: '#5c6a72',
      accentColor: '#8da101',
      categoryBgColor: 'rgba(239,235,223,0.7)',
      categoryTitleColor: '#35a77c',
      linkCardBgColor: 'rgba(239,235,223,0.9)',
      tagBgColor: 'rgba(141,161,1,0.15)'
    }
  },

  // High Contrast Dark
  highContrastDark: {
    name: 'High Contrast Dark',
    description: 'Maximum contrast for accessibility',
    colors: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      accentColor: '#00ffff',
      categoryBgColor: 'rgba(255,255,255,0.08)',
      categoryTitleColor: '#ffffff',
      linkCardBgColor: 'rgba(255,255,255,0.12)',
      tagBgColor: 'rgba(0,255,255,0.2)'
    }
  },

  // High Contrast Light
  highContrastLight: {
    name: 'High Contrast Light',
    description: 'Maximum contrast light mode',
    colors: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      accentColor: '#0000cc',
      categoryBgColor: 'rgba(0,0,0,0.05)',
      categoryTitleColor: '#000000',
      linkCardBgColor: 'rgba(0,0,0,0.08)',
      tagBgColor: 'rgba(0,0,204,0.15)'
    }
  },

  // Midnight Blue
  midnightBlue: {
    name: 'Midnight Blue',
    description: 'Deep blue professional theme',
    colors: {
      backgroundColor: '#0f172a',
      textColor: '#e2e8f0',
      accentColor: '#38bdf8',
      categoryBgColor: 'rgba(30,41,59,0.7)',
      categoryTitleColor: '#60a5fa',
      linkCardBgColor: 'rgba(30,41,59,0.9)',
      tagBgColor: 'rgba(56,189,248,0.2)'
    }
  },

  // Cyberpunk
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Neon-inspired futuristic theme',
    colors: {
      backgroundColor: '#0a0a0f',
      textColor: '#00ff9f',
      accentColor: '#ff00ff',
      categoryBgColor: 'rgba(20,20,40,0.7)',
      categoryTitleColor: '#00ffff',
      linkCardBgColor: 'rgba(20,20,40,0.9)',
      tagBgColor: 'rgba(255,0,255,0.2)'
    }
  },

  // Monokai
  monokai: {
    name: 'Monokai',
    description: 'Classic Monokai editor theme',
    colors: {
      backgroundColor: '#272822',
      textColor: '#f8f8f2',
      accentColor: '#a6e22e',
      categoryBgColor: 'rgba(60,58,50,0.7)',
      categoryTitleColor: '#f92672',
      linkCardBgColor: 'rgba(60,58,50,0.9)',
      tagBgColor: 'rgba(166,226,46,0.2)'
    }
  },

  // Material Dark
  materialDark: {
    name: 'Material Dark',
    description: 'Google Material Design dark',
    colors: {
      backgroundColor: '#121212',
      textColor: '#e0e0e0',
      accentColor: '#bb86fc',
      categoryBgColor: 'rgba(30,30,30,0.7)',
      categoryTitleColor: '#03dac6',
      linkCardBgColor: 'rgba(30,30,30,0.9)',
      tagBgColor: 'rgba(187,134,252,0.2)'
    }
  },

  // Palenight
  palenight: {
    name: 'Palenight',
    description: 'Elegant pale night theme',
    colors: {
      backgroundColor: '#292d3e',
      textColor: '#a6accd',
      accentColor: '#82aaff',
      categoryBgColor: 'rgba(52,59,84,0.7)',
      categoryTitleColor: '#c792ea',
      linkCardBgColor: 'rgba(52,59,84,0.9)',
      tagBgColor: 'rgba(130,170,255,0.2)'
    }
  },

  // Minimal Light
  minimalLight: {
    name: 'Minimal Light',
    description: 'Clean, distraction-free light theme',
    colors: {
      backgroundColor: '#f5f5f5',
      textColor: '#333333',
      accentColor: '#666666',
      categoryBgColor: 'rgba(0,0,0,0.03)',
      categoryTitleColor: '#333333',
      linkCardBgColor: 'rgba(0,0,0,0.05)',
      tagBgColor: 'rgba(0,0,0,0.08)'
    }
  }
};

// Helper function to get theme by ID
function getTheme(themeId) {
  return DASHMA_THEMES[themeId] || DASHMA_THEMES.default;
}

// Helper function to get all theme IDs
function getThemeIds() {
  return Object.keys(DASHMA_THEMES);
}

// Helper function to get themes grouped by type (dark/light)
function getThemesGrouped() {
  const dark = [];
  const light = [];

  for (const [id, theme] of Object.entries(DASHMA_THEMES)) {
    const colors = theme.colors;
    // Simple heuristic: if background is light, it's a light theme
    const bgHex = colors.backgroundColor.replace('#', '');
    const r = parseInt(bgHex.substr(0, 2), 16);
    const g = parseInt(bgHex.substr(2, 2), 16);
    const b = parseInt(bgHex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness > 128) {
      light.push({ id, ...theme });
    } else {
      dark.push({ id, ...theme });
    }
  }

  return { dark, light };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DASHMA_THEMES, getTheme, getThemeIds, getThemesGrouped };
}
