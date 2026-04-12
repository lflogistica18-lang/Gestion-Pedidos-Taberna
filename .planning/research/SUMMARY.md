# Project Research Summary

**Project:** SGP — Sistema de Gestión de Pedidos Gastronómicos
**Domain:** Gastronomy POS/KDS System
**Researched:** 2026-04-12
**Confidence:** HIGH

---

## Executive Summary

SGP is an internal PWA replacing a fully manual (voice-based, zero-record) workflow at a local gastronomy business that handles both counter and delivery orders. The core job is twofold: eliminate lost orders in real time (via a live Kitchen Display System) and create an accurate sales record for the first time (via daily payment-method reports). The system targets 3-5 simultaneous users on tablets and phones, requires WiFi (stable at the location), and must stay within Supabase's free tier. It is not a public-facing app, does not need SEO, and has no printing hardware — all of which make a Vite SPA a significantly better fit than a framework like Next.js.

The recommended approach is a feature-first React + TypeScript SPA backed entirely by Supabase (PostgreSQL for persistence, Realtime WebSocket for live KDS updates, free tier for hosting). The stack is intentionally minimal: Zustand for cart state, React Router for 4-5 routes, shadcn/ui for accessible touch-optimized components, and vite-plugin-pwa for installability. The entire project fits comfortably on Supabase's free tier with enormous headroom (3-5 devices against a 200-connection limit; under 10 MB of data against a 500 MB database limit). The architecture is validated against commercial POS patterns (Toast, Square, Poster POS) and adapted to the specific constraints of this business.

The primary risk is not technical — the stack is well understood and well supported. The primary risk is scope: this business has zero existing digital infrastructure, and the temptation to add features (inventory, table management, printing, delivery platform integrations) before validating the core loop could delay or derail the product. Three technical pitfalls demand early attention before they become expensive to fix: snapshotting product prices at order time (a schema decision that cannot be easily retrofitted), validating that RLS and Supabase Realtime work together in hosted (not just local) environments, and establishing 48dp minimum touch targets as a foundational standard rather than a late polish step.

---

## Key Findings

### Recommended Stack

**Core:**
- **Vite 8.x + React 19 + TypeScript 5.x** — SPA, no SSR needed; PWA plugin ecosystem is more mature than Next.js for this use case
- **Supabase JS SDK ^2.103** — PostgreSQL for persistence, `postgres_changes` Realtime for live KDS updates; free tier fits 3-5 users with enormous headroom
- **Tailwind CSS v4** — CSS-first config with Lightning CSS engine; compatible with shadcn/ui
- **vite-plugin-pwa ^1.2.0** — zero-config Workbox PWA; service worker + manifest for tablet/phone installability

**Supporting:**
- **React Router v7 (SPA mode)** — lightweight (20KB) for 4-5 routes; TanStack Router not justified at this scale
- **Zustand ^5.0** — cart state and session; avoids Context re-render problems on touch UIs
- **shadcn/ui** — Radix primitives + Tailwind; accessible, large touch targets, copy-owned (no library lock-in)
- **react-hook-form + Zod** — product CRUD forms and order input validation
- **date-fns ^3** — timestamps, daily report grouping (tree-shakeable; Moment.js must not be used)

**Explicitly ruled out:** Next.js (no SSR/SEO needed), Redux (overkill), Socket.io (Supabase Realtime already provides WebSockets), IndexedDB/offline (WiFi is stable, offline doubles complexity), Moment.js (deprecated).

**Supabase free tier is viable:** 3-5 devices against 200 Realtime slots, <10 MB data against 500 MB limit, 3-5 users against 50,000 MAU limit. The only known risk is automatic project pausing after 7 days of inactivity — a non-issue for a daily-use POS.

---

### Expected Features

**Must have for launch (v1 — P1):**

| Feature | Notes |
|---------|-------|
| Product catalog CRUD with categories and prices | Foundation for all other features |
| POS order entry: quantities, per-item notes, local/delivery toggle | Replaces voice-based ordering |
| Order state machine: Pendiente → En Preparación → Listo → Entregado | Creates traceability for the first time |
| Audit log: every state transition timestamped | Required for dispute resolution and reporting |
| KDS real-time display with Accept / Ready actions | Replaces shouting to kitchen |
| KDS color-coded urgency (green/yellow/red by wait time) | Low cost, high value; differentiator over paper |
| Payment method selector: Efectivo / Débito / Transferencia | No gateway; simple selector at checkout |
| Daily sales report: total + breakdown by payment method | Answers "how much did we sell?" |
| PWA manifest + service worker, installable on Android/iOS | Core platform constraint |

**Add after v1 validation (v1.x — P2):**
- Per-product sales breakdown (menu optimization)
- Order history search and filter (when volume grows)
- Delivery customer name/phone field (when tracking becomes a pain point)
- Configurable shift close time (late-night orders blurring daily reports)
- Sound alerts on KDS (when kitchen misses visual notifications)

**Deferred to v2+ (P3):**
- Inventory/stock management
- Thermal printer integration (no hardware yet)
- Multi-user authentication with roles
- Reporting dashboard with charts
- WhatsApp order intake automation

**Anti-features to actively resist:** table management (not applicable — counter + delivery), offline mode (WiFi is stable), delivery platform integration (orders come via WhatsApp), role-based auth (3-5 trusted people), inventory tracking, customer loyalty program, multi-branch support, live revenue ticker, discount/coupon system.

**Key insight from research:** This business goes from zero digital infrastructure to structured operations. The bar for v1 is replacing chaos with order, not feature parity with commercial POS systems. Restraint in scope is itself a feature.

---

### Architecture Approach

**Overall shape:** Single-page PWA with four feature modules (POS, KDS, Products Admin, Reports) communicating exclusively through Supabase — POS writes to the database, KDS subscribes to changes via Realtime WebSocket, Reports read aggregate queries. No direct module-to-module communication.

**Module structure (feature-first):**
```
src/
├── app/           # Shell, routing, providers
├── modules/
│   ├── pos/       # ProductGrid, Cart, Checkout — Zustand cart store
│   ├── kds/       # OrderCard, OrderQueue — Supabase Realtime subscription
│   ├── products/  # ProductForm, ProductList — react-hook-form + REST
│   └── reports/   # DailySummary, PaymentBreakdown — aggregate queries
├── shared/        # Supabase client, common components, shared hooks
└── types/         # Auto-generated from Supabase schema
supabase/
└── migrations/    # SQL migrations managed via Supabase CLI
```

**Four critical architectural patterns:**

1. **Supabase Realtime subscription for KDS** — subscribe to `postgres_changes` filtered to `status IN (pendiente, en_preparacion)`; no polling. Enable `worker: true` to survive browser tab throttling.

2. **Optimistic updates for POS order submission** — show order as created immediately, sync to DB in background, rollback on error. Cashier should not wait for a network round-trip.

3. **Device-based role (no auth in v1)** — cashier bookmarks `/pos`, kitchen bookmarks `/kds`. Simple, zero friction for 3-5 trusted people. NavBar allows switching.

4. **Price snapshot in order_items** — store `unit_price` and `product_name` at the moment of order creation, never derive from current product price via JOIN. Critical for accurate historical reporting when prices change weekly.

**Database schema (four tables):** `products`, `orders` (with `order_number SERIAL` for human-readable IDs), `order_items` (with price snapshot and `subtotal` as computed column), `order_status_log` (audit trail for every state transition).

**State machine flow:** POS INSERT → Supabase broadcasts → KDS receives → kitchen acts → status UPDATE (conditional: `WHERE status = 'pendiente'` to prevent race conditions) → Supabase broadcasts updated state.

**Scaling:** Current 3-5 user load is trivially handled by free tier. First real bottleneck would be report query speed at ~1,000+ orders — address by adding indexes on `created_at` and `status` before that point.

---

### Critical Pitfalls

**Pitfall 1: Silent WebSocket disconnect on backgrounded KDS tab**
Chrome and Safari throttle JS timers after 5-7 minutes of tab inactivity, killing the Supabase Realtime heartbeat. Kitchen stops receiving orders silently — no error shown.
- Fix: Enable `worker: true` in Supabase Realtime config (moves heartbeat to Web Worker, immune to tab throttling). Add a visible connection-status indicator (green/red dot) on the KDS. Implement auto-reconnect.
- Address in: Phase 2 (KDS implementation)

**Pitfall 2: RLS + Realtime subscriptions silently breaking each other**
Enabling Row Level Security on the `orders` table can silently break Realtime event delivery (Supabase known issue #35282). Orders insert successfully but KDS never receives the WebSocket event.
- Fix: Test RLS + Realtime in hosted Supabase (not just local dev) on day one. Grant `SELECT` on orders to `supabase_realtime` role explicitly. If using anon access in v1, keep RLS simple or disable on orders initially.
- Address in: Phase 1 (database setup) — test immediately, never defer

**Pitfall 3: Order state race condition (double accept)**
Two kitchen staff tap "Accept" simultaneously. Both DB writes succeed without a guard, creating duplicate `order_status_log` entries and confusing the UI.
- Fix: Use conditional UPDATE: `WHERE id = ? AND status = 'pendiente'`. Check `rowsAffected`; if 0, another device already accepted. Apply this pattern to every state transition.
- Address in: Phase 2 (KDS) — implement from the start

**Pitfall 4: Price change contaminating active and historical orders**
Updating a product price mid-shift causes active orders to show wrong totals if prices are fetched via JOIN from the products table at report time.
- Fix: Snapshot `unit_price` and `product_name` into `order_items` at creation time. Never derive order totals from the current products table. This is a schema decision — retroactively fixing it is expensive.
- Address in: Phase 1 (database schema) — design correctly from the start, cannot be deferred

**Pitfall 5: Touch targets too small under rush conditions**
Buttons below 48dp cause mis-taps on greasy tablet screens during rush hour. Destructive actions (cancel, delete) adjacent to common actions cause accidental data loss.
- Fix: Minimum 48x48dp with 8dp spacing for all interactive elements. KDS buttons should be 56-64dp (wet/greasy hands). Confirm only destructive actions; accept/ready should be one-tap. Test on actual tablets with fingers, not mouse on desktop.
- Address in: Phase 1 (UI foundation) — establish as a standard, not a late fix

**Bonus tracked pitfall — Supabase subscription leaks:**
Creating Realtime channels on every React render or failing to clean up on unmount can multiply connections toward the 200-connection free tier limit with only 5 devices.
- Fix: Always return cleanup from `useEffect` (`supabase.removeChannel(channel)`). Create subscriptions at page/module level. Monitor connection count in Supabase dashboard during development.
- Address in: Phase 2 (KDS)

---

## Implications for Roadmap

### Phase 1: Foundation — Infrastructure, Schema, and UI Shell

**Rationale:**
Every other feature depends on the database schema, the Supabase client setup, and the PWA shell. Critically, two of the most expensive-to-fix pitfalls (price snapshots and RLS + Realtime compatibility) must be addressed here — before any feature work begins. Getting the schema right in Phase 1 prevents retroactive data migration pain.

**Delivers:**
- Supabase project initialized; CLI configured for migration-based schema management
- Four-table schema deployed: `products`, `orders`, `order_items` (with price snapshot), `order_status_log`
- RLS policies tested against Supabase Realtime on the hosted environment (not just local dev)
- Vite + React + TypeScript project scaffolded with Tailwind v4 and shadcn/ui
- PWA manifest and service worker configured (vite-plugin-pwa)
- React Router routes defined: `/pos`, `/kds`, `/products`, `/reports`
- Supabase-generated TypeScript types wired in
- 48dp touch target standard established in shared component library
- NavBar with route switching (device-based role pattern, no auth)

---

### Phase 2: Product Catalog and POS Order Entry

**Rationale:**
Product catalog is the foundation dependency for order entry. POS is the highest-value feature for the business — it is the first thing that directly replaces the existing workflow (voice ordering with no record). Getting this right enables the team to start capturing real order data immediately.

**Delivers:**
- Products Admin view: CRUD for products with name, category (comida/bebida/postre), price, active/inactive toggle (soft delete — existing orders are not affected)
- Inline price editing on product list
- POS view: touch-optimized product grid organized by category
- Cart: add/remove items, quantity adjustment, per-item notes
- Order creation: local/delivery toggle, payment method selector, order submission
- Optimistic update on order submission (no waiting for network round-trip)
- Price snapshot confirmed working: `unit_price` captured at order creation, independent of product price changes
- Order number display: human-readable `SERIAL` order number, not UUID

---

### Phase 3: Order State Machine and KDS

**Rationale:**
The KDS is what closes the loop — it replaces shouting between counter and kitchen. The state machine and audit log must be built together; the log is required for reporting and dispute resolution, not an afterthought. All KDS-specific pitfalls (WebSocket disconnect, race condition, subscription leaks) are addressed here.

**Delivers:**
- Order status flow implemented: Pendiente → En Preparación → Listo → Entregado
- Conditional UPDATE guards against race conditions on every state transition
- `order_status_log` records every transition with timestamp
- KDS view: real-time order queue via `postgres_changes` Realtime subscription
- `worker: true` enabled in Realtime config (survives browser tab throttling)
- Visible connection-status indicator on KDS (green = connected, red = disconnected)
- Auto-reconnect logic with user feedback
- Color-coded urgency on order cards (green/yellow/red by elapsed wait time)
- Elapsed time displayed per order
- Subscription cleanup confirmed (`removeChannel` on unmount)
- All KDS buttons at 56-64dp minimum
- Tested: two simultaneous "Accept" taps on same order → only one succeeds

---

### Phase 4: Daily Reports and Polish

**Rationale:**
Reports are the second core value proposition of the product ("at the end of the day, know exactly how much was sold and by which payment method"). This phase also closes out all PWA install testing and completes the "launch-ready" checklist.

**Delivers:**
- Reports view: daily sales total + breakdown by Efectivo / Débito / Transferencia
- Report filters only count `status = 'entregado'` orders (pending/cancelled excluded)
- Date boundary handling: timezone-correct query for "today's orders"
- PWA install tested and verified on Android Chrome and iOS Safari (Add to Home Screen)
- Service worker update flow tested
- Full "looks done but isn't" checklist reviewed (see PITFALLS.md)
- Performance: DB indexes on `created_at` and `status` added before reaching 1,000 orders
- End-to-end smoke test: order placed on POS → appears on KDS → accepted → ready → delivered → shows in daily report

---

### Phase 5: Post-Validation Enhancements (v1.x)

**Rationale:**
These features are not needed for launch but are low-cost and directly address pain points that will emerge from real usage. They should be scoped and prioritized based on what the team actually reports as friction after operating the v1 system for a few weeks.

**Delivers (candidate list — prioritize based on real feedback):**
- Per-product sales breakdown (most/least popular items)
- Order history with search and filter
- Delivery customer name and phone field on order creation
- Configurable shift close time for late-night operations
- Sound alerts for new orders on KDS

---

### Phase Ordering Rationale

The phase sequence follows hard dependency chains from the feature research:

1. **Schema before everything** — price snapshot and RLS/Realtime must be correct before any feature is built on top of them. Retrofitting either is disproportionately expensive.
2. **Products before POS** — product catalog is the explicit prerequisite for order entry.
3. **Order state machine before KDS** — the KDS cannot display orders without a defined state flow.
4. **Reports after state machine** — reports require completed orders with payment data and timestamps, which only exist once the state machine is running.
5. **PWA can start in Phase 1, finalize in Phase 4** — PWA configuration is independent but should be set up early and only formally verified (install flows on real devices) in the phase before launch.
6. **v1.x enhancements after real usage** — these features are deliberately deferred until actual friction from real users is observed, preventing scope creep based on assumptions.

---

### Research Flags

The following items carry known uncertainty or require early verification:

- **RLS + Realtime in hosted Supabase** — must be tested in the actual hosted environment as early as Phase 1. Local dev does not reproduce this failure mode.
- **iOS PWA install flow** — iOS Safari's "Add to Home Screen" is manual and non-standard. Verify it works acceptably before committing to PWA as the sole delivery mechanism.
- **Supabase project pausing** — the free tier pauses projects inactive for 7 days. Confirm this does not affect a daily-use POS (expected: not an issue, but worth verifying with one week of data).
- **Auth model** — the device-based (no auth) approach is explicitly acceptable for v1 with 3-5 trusted people. This must be revisited if the team grows, if WiFi access is shared with untrusted parties, or if financial data sensitivity increases.
- **Daily order volume baseline** — client-side report calculations are acceptable until ~200 orders/day. If the business grows faster than expected, move aggregations to Supabase Edge Functions or DB-level views before reports become slow on mobile.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack selection | HIGH | Stack is well-validated for this use case; version compatibility confirmed |
| Feature scope | HIGH | Requirements are clear; out-of-scope boundaries are explicitly validated |
| Database schema | HIGH | Standard POS patterns; price snapshot is the only non-obvious design decision |
| Realtime architecture | HIGH | Pattern is well-documented; pitfalls are known and preventable |
| PWA approach | MEDIUM-HIGH | Android well supported; iOS has known limitations with Add to Home Screen |
| Free tier sustainability | HIGH | Usage is far below all limits with enormous headroom |
| Phase ordering | HIGH | Follows hard dependency chain; no speculative ordering |
| v1.x feature prioritization | MEDIUM | Depends on real user feedback after launch; current prioritization is informed but assumed |

---

## Sources

- Vite documentation (vite.dev)
- Supabase documentation (supabase.com/docs)
- Supabase GitHub issues — specifically #35282 (RLS + Realtime incompatibility)
- Tailwind CSS v4 release notes
- shadcn/ui documentation
- React Router v7 documentation
- Web.dev PWA guidelines and best practices
- Material Design touch target guidelines (48dp minimum)
- Commercial POS system patterns: Toast, Square, Loyverse, Poster POS
- PROJECT.md — validated requirements and constraints (2026-04-12)

---
*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, PROJECT.md*
*Written: 2026-04-12*
