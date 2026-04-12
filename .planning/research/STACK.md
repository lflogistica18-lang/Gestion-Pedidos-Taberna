# Stack Research

**Domain:** Gastronomy POS/KDS System
**Researched:** 2026-04-12
**Confidence:** HIGH

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

```bash
# Create project
npm create vite@latest sgp -- --template react-ts
cd sgp

# Core
npm install @supabase/supabase-js zustand react-router-dom date-fns

# UI
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init

# Forms
npm install react-hook-form zod @hookform/resolvers

# Dev dependencies
npm install -D vite-plugin-pwa
```

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

**If adding thermal printing later:**
- Use `escpos` or `node-thermal-printer` npm package
- Requires a local print server (Node.js process on the PC connected to printer)
- Because: browsers can't directly communicate with USB/serial thermal printers

**If adding offline support later:**
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

**Risk:** Supabase pauses inactive projects after 7 days on free tier. For a daily-use POS this shouldn't be an issue, but worth knowing.

## Sources

- Vite documentation (vite.dev)
- Supabase documentation (supabase.com/docs)
- Tailwind CSS v4 release notes
- shadcn/ui documentation
- React Router v7 documentation

---
*Stack research for: Gastronomy POS/KDS System*
*Researched: 2026-04-12*
