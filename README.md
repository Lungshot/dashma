# Dashma

A minimal, zen-inspired link dashboard homepage. Fast, lightweight, and fully configurable through a web-based admin interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Minimal Design** - Clean, distraction-free interface inspired by the Japanese concept of "Ma" (negative space)
- **Keyboard Navigation** - Press `/` to search, `1-9` to jump to categories, arrow keys to navigate
- **Categories & Tags** - Organize links into collapsible categories with custom tags for filtering
- **Multiple Display Modes** - Cards or text-only links
- **Customizable Layout** - 1-6 column layouts, responsive design
- **Animation Options** - Multiple hover effects and nesting animations
- **Favicon Support** - Auto-fetch favicons or use custom icons
- **Full Admin GUI** - Configure everything through `/admin` - no file editing required
- **Authentication Options** - No auth, basic auth, or Microsoft Entra ID (SSO)
- **Config Backup** - Export/import configuration as JSON
- **Docker Ready** - Simple deployment with Docker Compose

## Quick Start

### Development

```bash
cd dashma
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d --build
```

### Docker with Nginx

```bash
docker-compose -f docker-compose.nginx.yml up -d --build
```

## Access

- **Homepage**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin`
- **Default Login**: `admin` / `admin` (password change required on first login)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open search |
| `Esc` | Close search/modals |
| `1-9` | Jump to category |
| `↑/↓` | Navigate search results |
| `Enter` | Open selected link |

## Configuration

All configuration is done through the admin panel at `/admin`:

### Appearance
- Site name
- Background color or image
- Text and accent colors
- Body and title fonts

### Layout
- Column count (1-6)
- Link display mode (cards/text)
- Show/hide favicons
- Link open behavior (new tab/same tab)

### Animations
- Link hover effects: glow, fade, scale, underline, slide, border
- Category hover effects: fade, glow, scale, color change
- Nesting animations: slide, fade, zoom, blur

### Authentication
- **None**: Public access
- **Basic**: Username/password
- **Entra ID**: Microsoft SSO integration

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Node.js with Fastify
- **Data**: In-memory with JSON file persistence
- **Auth**: Passport.js with MSAL for Entra ID
- **Deployment**: Docker + Nginx

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `SESSION_SECRET` | Session encryption key | (auto-generated) |

## Project Structure

```
dashma/
├── src/
│   ├── public/           # Static frontend files
│   │   ├── css/
│   │   ├── js/
│   │   └── uploads/      # User uploads
│   ├── server/           # Backend
│   │   ├── index.js      # Server entry
│   │   ├── config.js     # Config management
│   │   ├── auth.js       # Authentication
│   │   └── routes.js     # API routes
│   └── data/
│       └── config.json   # Persisted config
├── Dockerfile
├── docker-compose.yml
├── docker-compose.nginx.yml
├── nginx.conf
└── package.json
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
