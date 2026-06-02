# Agent Context - InventorDash

## Project Overview
InventorDash is a configurable dashboard/homepage for categorized links, with a public UI and an admin UI.

Core capabilities:
- Link dashboard with categories/tabs and search.
- Admin CRUD for settings, categories, tabs, links, users, widgets, and public requests.
- Optional auth for both admin and main site (basic auth or Microsoft Entra ID).
- Server monitoring widgets (ICMP/TCP) and MQTT widgets.
- JSON file persistence (`src/data/config.json`) plus file uploads (`src/public/uploads`).

## Tech Stack
- Backend: Node.js + Fastify
- Frontend: Vanilla HTML/CSS/JS
- Auth/session: `@fastify/session`, custom file session store, `bcryptjs`, `@azure/msal-node`
- Monitoring: `ping` + Node `net`
- Messaging: `mqtt`
- Storage: JSON files on disk

Key dependencies in `package.json`:
- `fastify`, `@fastify/static`, `@fastify/session`, `@fastify/cookie`, `@fastify/formbody`, `@fastify/multipart`
- `@azure/msal-node`, `bcryptjs`, `mqtt`, `ping`, `uuid`

## Run and Deployment
### Local
- Install: `npm install`
- Dev: `npm run dev`
- Start: `npm start`

Default bind:
- Host: `0.0.0.0`
- Port: `3000`

### Docker
`docker-compose.yml` runs service `inventordash` and maps `3685:3000`.

Persistent volumes:
- `/app/src/data` (config + sessions)
- `/app/src/public/uploads` (uploaded images/icons)

Container includes `iputils` and `NET_RAW` capability for ICMP ping monitoring.

## Environment Variables
- `PORT` (default `3000`)
- `HOST` (default `0.0.0.0`)
- `SESSION_SECRET` (required in production, >= 32 chars)
- `COOKIE_SECURE` (`true` only when app itself serves direct HTTPS)
- `TRUST_PROXY` (`true` when behind reverse proxy and relying on forwarded headers)
- `PUBLIC_BASE_URL` (optional canonical base URL for Entra callback construction)
- `MAX_UPLOAD_BYTES` (upload cap; default `5242880` / 5MB)
- `NODE_ENV` (typically `production` in Docker)

## Project Structure
- `src/server/index.js`: Fastify bootstrap, plugin registration, static serving, session store, service startup/shutdown.
- `src/server/routes.js`: all public/admin/auth/api routes.
- `src/server/config.js`: config loading/saving + domain logic for CRUD, widgets, users, requests.
- `src/server/auth.js`: auth guards + Entra MSAL helpers.
- `src/server/ping-service.js`: background monitoring (ICMP/TCP).
- `src/server/mqtt-service.js`: backend MQTT subscribers for MQTT widgets.
- `src/server/session-store.js`: file-based session persistence with TTL cleanup.
- `src/public/*`: dashboard/admin/login/request pages and client JS/CSS.
- `src/data/config.json`: persisted state.

## Runtime Flow
1. `index.js` loads config and starts Fastify.
2. Static files are served from `src/public`.
3. `routes.js` exposes public and admin APIs.
4. `ping-service` and `mqtt-service` start in background and are refreshed on widget/link monitoring changes.
5. Frontend (`main.js`) fetches `/api/public/data`, renders UI, then polls status APIs.
6. Admin frontend (`admin.js`) manages all CRUD operations through `/api/admin/*` endpoints.

## Authentication Model
Admin auth (`settings.authMode`):
- `none`: no admin auth required.
- `basic`: username/password from `config.admin`.
- `entraId`: Entra login allowed; admin access via allowlist email check (`settings.entraId.adminAllowlist`) in universal callback flow.

Main-site auth (`settings.mainAuthMode`):
- `none`: public homepage.
- `basic`: uses `users` list + also allows admin credentials.
- `entraId`: user login via Entra callback.

Session flags used:
- `authenticated` (admin)
- `userAuthenticated` (main user)
- `entraUser`
- `username`

## Main Endpoints (Summary)
Public:
- `GET /` (protected by main auth mode)
- `GET /api/public/data`
- `GET /api/public/monitoring/status`
- `GET /api/public/mqtt/status`
- `GET /api/favicon?url=...&app=...`
- `GET/POST /login`, `GET /logout`, `GET /login/entra`, `GET /callback`, `GET /auth/callback`
- `GET /request`
- `GET /api/public/categories-for-request`
- `POST /api/public/request/category`
- `POST /api/public/request/link`

Admin:
- `GET /admin/login`, `POST /admin/login`, `GET /admin/logout`
- `GET /admin` (protected)
- `GET/POST /admin/change-password`
- `POST /api/admin/login` (JSON re-auth)
- `GET /admin/login/entra`, `GET /admin/callback`
- `GET /api/admin/config`
- `PUT /api/admin/settings`
- CRUD/reorder for categories, tabs, links
- CRUD for widgets + monitoring settings
- user CRUD
- request approval/deny/delete
- upload background/icon/logo
- export/import config
- `POST /api/admin/entra/validate`

## Persistent Data Model (`config.json`)
Top-level keys:
- `settings`
- `admin` (`username`, `passwordHash`, `mustChangePassword`)
- `users` (main-site basic auth users)
- `categories`
- `tabs`
- `links`
- `widgets`
- `requests` (`categories`, `links`)

Notable schema details:
- `links[].monitoring` controls host checks for link status bubbles.
- `widgets` supports at least `server-monitor`, `mqtt`, `clock`, `weather`, `iframe`, `custom-html` (based on frontend renderers and admin form logic).
- Requests flow stores pending/approved/denied states with reviewer metadata.

## Frontend Behavior
Dashboard (`src/public/js/main.js`):
- Pulls consolidated data from `/api/public/data`.
- Applies theme/settings via CSS variables.
- Renders tabs/categories/links/widgets.
- Keyboard controls: search (`/`), category jump (`1-9`), expand/collapse categories (`E`/`C`).
- Polls:
  - Monitoring every 30s.
  - MQTT server-side states every 3s when needed.
- Supports browser-side MQTT over `ws/wss`; backend MQTT service handles non-websocket protocols.

Admin (`src/public/js/admin.js`):
- Panel-based UI with auto-save for appearance/theme settings.
- Centralized `authFetch` handles 401 and re-auth modal.
- Full CRUD for dashboard resources.
- Entra setup wizard with server-side validation.

## Operational Notes and Risks
- In production startup is blocked if `SESSION_SECRET` is missing/weak.
- `config.json` currently contains real hashed admin credentials and runtime data; treat as sensitive state.
- Upload endpoints now enforce MIME/extension allowlist and size limits.
- `authMode: none` disables admin protection entirely.
- MQTT widget state includes `username/password` in server-side state object; avoid exposing sensitive values in public APIs/UI.
- File-based persistence is simple and effective for single-instance deployments but not for horizontal scaling.

## Quick Start Checklist for Agents
1. Inspect current `src/data/config.json` before modifying logic (state-driven app).
2. If changing auth/session logic, verify both `/admin/*` and main-site login flows.
3. If changing widget logic, verify both backend (`ping-service`, `mqtt-service`) and frontend polling/rendering.
4. If changing import/export, ensure auth settings and users/requests preservation behavior remains intentional.
5. Run app and smoke test:
   - `/`
   - `/admin/login`
   - `/api/public/data`
   - one CRUD flow in admin

## Current Observed State (from repository snapshot)
- Main settings use `colorTheme: coralNight`.
- Admin password rotation already completed (`mustChangePassword: false`).
- Existing sample categories, tabs, links, and two widgets (`mqtt`, `server-monitor`) are present.
- Docker publishes app on host port `3685`.
