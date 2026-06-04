# Dashma

A minimal, zen-inspired link dashboard homepage. Fast, lightweight, and fully configurable.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## ✨ Features

### 🎨 Beautiful & Minimal
Dashma embraces the Japanese concept of "Ma" (間) - the beauty of negative space. A clean, distraction-free interface that lets your links breathe.

### ⌨️ Keyboard-First Navigation
Navigate entirely with your keyboard:
- `/` to search instantly
- `1-9` to jump to categories
- Arrow keys + Enter to select

### 🗂️ Smart Organization
- **Categories** - Group links into collapsible sections
- **Tags** - Add tags to links for quick filtering
- **Multiple Views** - Display as cards or minimal text links

### 🎛️ Fully Customizable
- Flexible column layouts (1-6 columns)
- Custom colors, fonts, and backgrounds
- Hover animations and visual effects
- **Custom & offline icons** - upload your own link icons, or fall back to the bundled icon pack so tiles still render with no internet access

### 🔐 Flexible Authentication
- **Public** - No login required
- **Basic Auth** - Simple username/password
- **Microsoft Entra ID** - Enterprise SSO with guided setup wizard

### 🔒 Role-Based Access Control
- Define roles (e.g. `HR`, `IT`, `Public`) and gate categories to the people who should see them
- Per-category visibility: **public**, **any logged-in user**, or **specific roles**
- Assign roles to local users, or map Entra ID sign-ins to roles by email — filtering happens server-side

### 📥 Link Requests
- Users submit category/link requests from a public form, optionally attaching an uploaded icon
- Submitters see live status badges (**pending / approved / denied**) for the requests they made
- Admins approve or deny from the panel, with a full **history** of past requests and actions

### 🛠️ Admin Panel
Everything is configured through a web GUI at `/admin` - no config files to edit. Export and import your configuration as JSON for easy backup.

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker-compose up -d --build
```

### Using Docker with Nginx

```bash
docker-compose -f docker-compose.nginx.yml up -d --build
```

### Development Mode

```bash
npm install
npm run dev
```

---

## 🔗 Access

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Homepage |
| `http://localhost:3000/admin` | Admin Panel |

**Default credentials:** `admin` / `admin` (password change required on first login)

---

## 🔁 Reverse proxy & sessions

Two environment variables control session security. Set them in `docker-compose.yml` (or your container runtime) for any non-trivial deployment.

### `COOKIE_SECURE`

Set `COOKIE_SECURE=true` whenever the **browser** reaches Dashma over HTTPS — whether directly or through a reverse proxy (Caddy, nginx, Traefik) that terminates TLS. Dashma trusts the proxy's `X-Forwarded-Proto` header, so the `Secure` session cookie is issued correctly even when the proxy talks to the container over plain HTTP.

Only leave it unset or `false` for plain-HTTP access (e.g. `http://host:port` on a LAN). Setting `COOKIE_SECURE=true` while serving over HTTP will prevent the browser from storing the session cookie, so login appears to succeed but the page just reloads.

### `SESSION_SECRET`

`SESSION_SECRET` signs the session cookie so sessions cannot be forged. Use a random string of **at least 32 characters**, keep it secret, and keep it **stable across restarts** — changing it invalidates existing sessions and logs everyone out. In production, Dashma warns on startup if this is unset or left at the default.

Generate a strong value with:

```bash
openssl rand -base64 48
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open search |
| `Esc` | Close search/modals |
| `1-9` | Jump to category |
| `↑` `↓` | Navigate results |
| `Enter` | Open selected link |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Node.js + Fastify |
| Storage | JSON file persistence |
| Auth | MSAL for Microsoft Entra ID |
| Deploy | Docker + Nginx |

---

## 📁 Project Structure

```
dashma/
├── src/
│   ├── public/          # Frontend (HTML, CSS, JS)
│   ├── server/          # Backend (Fastify, routes, auth)
│   └── data/            # Persisted configuration
├── docker-compose.yml
└── nginx.conf
```

---

## Screenshots

### Dashboard

![Dashboard](screenshots/dash_preview.png)

### Admin Login

![Admin Login](screenshots/admin_login.png)

### Search

![Search](screenshots/search.png)

### Admin Panel

**Appearance** - Customize colors, layout, typography, animations, and background images.

![Appearance](screenshots/admin_appearance.png)

**Categories** - Organize your links into drag-and-drop sortable categories.

![Categories](screenshots/admin_categories.png)

**Links** - Manage links within each category with tags, favicons, and sorting.

![Links](screenshots/admin_links.png)

**Widgets** - Add and configure dashboard widgets like server monitors.

![Widgets](screenshots/admin_widgets.png)

**Requests** - Review and approve user-submitted category and link requests.

![Requests](screenshots/admin_requests.png)

**Authentication** - Configure admin and site auth including Microsoft Entra ID SSO.

![Authentication](screenshots/admin_authentication.png)

**Backup** - Export and import your full configuration as JSON.

![Backup](screenshots/admin_backup.png)

**Account** - Manage admin credentials.

![Account](screenshots/admin_account.png)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

