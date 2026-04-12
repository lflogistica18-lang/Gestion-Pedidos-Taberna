# Roadmap: SGP

**Created:** 2026-04-12
**Phases:** 5
**Requirements:** 37
**Granularity:** Standard

---

## Phase 1: Foundation

**Goal:** Establish the complete technical base — database schema, Supabase setup, PWA shell, and UI standards — so that every subsequent phase builds on a correct and stable foundation.
**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08
**Dependencies:** None
**UI hint:** yes

### Success Criteria

1. A developer can run `supabase db push` and the four-table schema (products, orders, order_items, order_status_log) is deployed in the hosted Supabase environment with no errors.
2. A tester can open the app URL on an Android device (Chrome) and iOS device (Safari), tap "Add to Home Screen", and launch the installed PWA — the app opens without a browser address bar.
3. Navigating to `/pos`, `/kds`, `/products`, and `/reports` via the NavBar renders the correct placeholder screen for each route on a phone-sized viewport.
4. A QA check on any shared component confirms all interactive touch targets meet the 48dp minimum standard (measured with Chrome DevTools device toolbar at 1x scale).
5. Inserting a test row directly in the Supabase dashboard and enabling RLS produces no silent subscription failure — the Realtime event is still received by a connected client in the hosted environment.

---

## Phase 2: Product Catalog

**Goal:** Deliver a fully functional product management screen so that staff can maintain the menu (add, edit, deactivate, reactivate products) before any orders are taken.
**Requirements:** PROD-01, PROD-02, PROD-03, PROD-04, PROD-05
**Dependencies:** Phase 1
**UI hint:** yes

### Success Criteria

1. A user can open `/products`, tap "Nuevo producto", fill in name, category (comida / bebida / postre), and price, save — and the product appears immediately in the list under the correct category without a page reload.
2. A user can tap an existing product, change its price, save — and the updated price is visible in the list within 2 seconds on the same device.
3. A user can deactivate a product and confirm it no longer appears in the active product list; querying the database directly shows `active = false` and the row still exists (soft delete).
4. A user can navigate to a "deactivated" filter or section, find the previously deactivated product, reactivate it, and confirm it reappears in the active list.

---

## Phase 3: POS Order Entry

**Goal:** Replace the current voice-based order-taking workflow with a touch-optimized POS screen that creates persisted, traceable orders with payment method and full state lifecycle.
**Requirements:** POS-01, POS-02, POS-03, POS-04, POS-05, POS-06, POS-07, POS-08, ORD-01, ORD-02, ORD-03
**Dependencies:** Phase 1, Phase 2
**UI hint:** yes

### Success Criteria

1. A cashier can open `/pos`, tap products from the grid, adjust quantities with +/- buttons, and add a free-text note to an item ("sin cebolla") — all without a keyboard appearing unless explicitly tapping the notes field.
2. A cashier can toggle the order type between "Local" and "Delivery", select a payment method (Efectivo / Débito / Transferencia), and tap "Confirmar pedido" — a human-readable order number (e.g., #42) appears on screen in under 300 ms even on a slow connection (optimistic update).
3. After order submission, querying `order_items` in Supabase shows `unit_price` and `product_name` snapshotted at creation time; changing the product's price afterwards does not alter the stored values.
4. The `orders` table shows the submitted order with `status = 'pendiente'` and `order_status_log` contains one entry for the initial state with a valid timestamp.
5. A delivery person can find a "Listo" order and tap "Entregar" — the order transitions to `status = 'entregado'` and a new log entry is written, completing the full state flow (Pendiente → En Preparación → Listo → Entregado).

---

## Phase 4: KDS Kitchen Display

**Goal:** Give the kitchen a real-time digital display that receives new orders instantly, lets cooks accept and complete them, and is robust enough to run all day without silent disconnects.
**Requirements:** KDS-01, KDS-02, KDS-03, KDS-04, KDS-05, KDS-06, KDS-07, KDS-08
**Dependencies:** Phase 1, Phase 3
**UI hint:** yes

### Success Criteria

1. Within 3 seconds of a cashier submitting a new order on `/pos`, the order card appears on `/kds` on a separate device without any manual page reload.
2. A cook taps "Aceptar" on an order — the card moves to "En Preparación" state; a second device tapping "Aceptar" on the same order simultaneously produces no duplicate state log entry (conditional UPDATE guard verified by checking `order_status_log` row count).
3. After backgrounding the KDS browser tab for 10 minutes and returning to it, the connection-status indicator shows green and a new order submitted during that period appears on the display without requiring a manual reload.
4. Each order card shows elapsed time since creation, updating live (visible change within 60 seconds).
5. Opening and closing the `/kds` route multiple times in the same browser session does not increase the Supabase Realtime connection count beyond 1 (verified in the Supabase dashboard).

---

## Phase 5: Reports & Polish

**Goal:** Deliver the daily sales report that closes the core value loop, verify PWA installability on real devices, and confirm the full end-to-end flow is production-ready.
**Requirements:** REP-01, REP-02, REP-03, REP-04, REP-05
**Dependencies:** Phase 1, Phase 3, Phase 4
**UI hint:** yes

### Success Criteria

1. A user opening `/reports` sees the total sales amount for the current day, broken down by Efectivo, Débito, and Transferencia — and the numbers match a manual sum of all `entregado` orders for that day computed directly in the database.
2. Orders with status `pendiente`, `en_preparacion`, or `listo` do not appear in any report total — confirmed by submitting a test order, checking the report before and after marking it `entregado`.
3. An order placed at 23:58 local time appears in that day's report and not the next day's report (timezone boundary test: the report query uses the local timezone, not UTC, for the start-of-day cutoff).
4. Running the full end-to-end smoke test — order placed on POS → appears on KDS → Aceptar → Listo → Entregado → appears in daily report — completes without errors on a tablet and a phone simultaneously.
5. The per-product breakdown in reports correctly shows which products sold the most and least units for the day, using snapshotted `product_name` values from `order_items` (not the current product name).

---

## Requirement Coverage

| Phase | Count | Requirements |
|-------|-------|-------------|
| 1 — Foundation | 8 | INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08 |
| 2 — Product Catalog | 5 | PROD-01, PROD-02, PROD-03, PROD-04, PROD-05 |
| 3 — POS Order Entry | 11 | POS-01, POS-02, POS-03, POS-04, POS-05, POS-06, POS-07, POS-08, ORD-01, ORD-02, ORD-03 |
| 4 — KDS Kitchen Display | 8 | KDS-01, KDS-02, KDS-03, KDS-04, KDS-05, KDS-06, KDS-07, KDS-08 |
| 5 — Reports & Polish | 5 | REP-01, REP-02, REP-03, REP-04, REP-05 |
| **Total** | **37** | **37/37 covered** |

---
*Roadmap created: 2026-04-12*
