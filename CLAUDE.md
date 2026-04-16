<!-- GSD:project-start source:PROJECT.md -->
## Project

**SGP — Sistema de Gestión de Pedidos Gastronómicos**

Una PWA de gestión de ventas y producción para un local gastronómico con atención en local y delivery. Centraliza la toma de pedidos, la comunicación con cocina mediante un panel digital (KDS) y registra todas las ventas para tener trazabilidad completa del negocio. Pensada para correr en tablets y celulares.

**Core Value:** Que ningún pedido se pierda y que al final del día se sepa exactamente cuánto se vendió y por qué método de pago — reemplazando el sistema actual de "todo a voz, cero registros".

### Constraints

- **Plataforma**: PWA — debe funcionar en cualquier navegador moderno, instalable en Android/iOS
- **Dispositivos**: Tablets y celulares como dispositivos principales — UI debe ser touch-friendly
- **Conectividad**: Requiere WiFi — no se necesita modo offline
- **Tiempo real**: El KDS de cocina debe actualizar en tiempo real sin recargar la página
- **Costo**: Infraestructura de bajo costo (Supabase free tier o similar)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.x | Build tool & dev server | Pure SPA, no SSR needed. PWA plugin ecosystem is more mature than Next.js for this use case |
| React | 19 | UI framework | Component model fits multi-view app (POS, KDS, Admin). Huge ecosystem |
| TypeScript | 5.x | Type safety | Catches order state bugs at compile time, better DX |
| Supabase JS SDK | ^2.103 | Backend (DB + Realtime + Auth) | PostgreSQL + `postgres_changes` Realtime for KDS live updates. Free tier fits: 3-5 users, <10MB data, 200 concurrent realtime slots |
| Tailwind CSS | v4 | Styling | CSS-first config, Lightning CSS engine, 5x faster builds. `@import "tailwindcss"` replaces directives |
| vite-plugin-pwa | ^1.2.0 | PWA support | Zero-config PWA with Workbox. Caches app shell, network-first for Supabase REST |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Router | v7 (SPA mode) | Client routing | 4-5 routes: POS, KDS, Products, Reports. ~20KB vs TanStack Router's ~45KB |
| Zustand | ^5.0 | State management | Cart state, active session. Avoids Context re-render problems on touch UIs |
| shadcn/ui | latest | UI components | Radix primitives + Tailwind, copy-owned components, accessible large touch targets |
| react-hook-form | ^7.72 | Form handling | Product CRUD forms, order notes |
| Zod | ^3 | Schema validation | Validate product data, order inputs |
| date-fns | ^3 | Date utilities | Timestamps, daily report grouping, shift boundaries |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local dev + migrations | `supabase init`, `supabase db push` for schema management |
| ESLint + Prettier | Code quality | Standard React config |
| Vite Preview | PWA testing | Test service worker locally |
## Installation
# Create project
# Core
# UI
# Forms
# Dev dependencies
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite + React SPA | Next.js | If SEO/SSR were needed (not the case — internal tool) |
| React Router v7 | TanStack Router | If route count exceeded 15+ with complex nested layouts |
| Zustand | TanStack Query | If data fetching patterns were complex; Supabase Realtime replaces it for live data |
| Zustand | React Context | If state were simple and re-renders didn't matter (touch UI needs performance) |
| shadcn/ui | Material UI | If design system consistency mattered more than bundle size |
| Supabase | Firebase | If already in Google ecosystem; Supabase has better PostgreSQL and realtime for this use case |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js | No SSR/SEO needed; adds server complexity for an internal tool | Vite SPA |
| Redux | Overkill for 4-5 routes and simple state | Zustand |
| IndexedDB / offline storage | WiFi is stable; offline adds massive complexity | Direct Supabase queries |
| Socket.io | Supabase Realtime already provides WebSocket subscriptions | Supabase `postgres_changes` |
| Moment.js | Deprecated, huge bundle | date-fns (tree-shakeable) |
| CSS Modules | Slower DX for rapid prototyping | Tailwind CSS |
## Stack Patterns by Variant
- Use `escpos` or `node-thermal-printer` npm package
- Requires a local print server (Node.js process on the PC connected to printer)
- Because: browsers can't directly communicate with USB/serial thermal printers
- Add Dexie.js (IndexedDB wrapper) + background sync
- Because: Workbox alone caches assets but not data mutations
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19 | React Router v7 | Full compatibility confirmed |
| Tailwind v4 | shadcn/ui | shadcn added Tailwind v4 support in early 2025 |
| Vite 8.x | vite-plugin-pwa ^1.2 | Confirmed compatible |
| Supabase JS ^2.103 | React 19 | No issues, pure JS SDK |
## Supabase Free Tier Analysis
| Resource | Free Tier Limit | Our Usage | Headroom |
|----------|-----------------|-----------|----------|
| Database | 500 MB | <10 MB (orders + products) | Huge |
| Realtime connections | 200 concurrent | 3-5 devices | Huge |
| Auth users | 50,000 MAU | 3-5 users | Huge |
| Storage | 1 GB | Not needed initially | N/A |
| Edge Functions | 500K invocations | Not needed | N/A |
## Sources
- Vite documentation (vite.dev)
- Supabase documentation (supabase.com/docs)
- Tailwind CSS v4 release notes
- shadcn/ui documentation
- React Router v7 documentation
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:deploy-start -->
## Deploy — VPS

- **Servidor:** `root@187.77.247.24` (Ubuntu 24.04)
- **Carpeta en VPS:** `/root/Gestion-Pedidos-Taberna`
- **App:** `http://187.77.247.24:8090`
- **docker-compose:** v1.29.2 (tiene bug con `--force-recreate`)
- **`.env` en VPS:** `/root/Gestion-Pedidos-Taberna/.env` (manual, no está en Git, necesario para el build de Vite)
- **`.dockerignore`:** `.env` fue removido para que Vite lo tome en tiempo de build

### Comando de deploy correcto

```bash
git pull && \
docker build --no-cache -t sgp-taberna:latest . && \
docker-compose stop && \
docker-compose rm -f && \
docker-compose up -d
```

**NUNCA usar `--force-recreate`** — rompe con `KeyError: 'ContainerConfig'` en docker-compose v1.29.
El error `"network has active endpoints (nginx-proxy-manager)"` al hacer `down` es normal y no bloquea el `up -d`.
<!-- GSD:deploy-end -->

<!-- GSD:bugs-pendientes-start -->
## Bugs Pendientes (al 2026-04-15)

### Layout roto en 3 páginas
Las páginas `/products`, `/orders` y una tercera (confirmar) no respetan el ancho completo.
El deploy funciona y el JS correcto llega al navegador — es un bug de código.

**Síntomas:**
- CrudManager no ocupa todo el ancho
- Botón "Inactivos" en Productos se vuelve invisible
- Historial (`/orders`) queda completamente fuera del diseño

**Causa probable:**
- `products-page.tsx` tiene su propio `pos-header` (línea 92) Y `CrudManager` tiene otro `pos-header` interno (línea 106) → doble header apilado
- `.pos-header` CSS tiene `background: rgba(249,250,251,0.95)` (gris claro) en vez de naranja → el texto blanco del botón "Inactivos" desaparece
- Revisar si hay `max-width` que restringe el contenedor

**Archivos a revisar:**
- `src/shared/components/comunes/CrudManager.tsx` (pos-header en línea 106)
- `src/modules/products/products-page.tsx` (pos-header en línea 92)
- `src/modules/orders/orders-page.tsx` (no revisado aún)
- `src/index.css` (estilos de `.pos-header`)
<!-- GSD:bugs-pendientes-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
