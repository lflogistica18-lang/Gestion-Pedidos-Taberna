# Requirements: SGP — Sistema de Gestión de Pedidos Gastronómicos

**Defined:** 2026-04-12
**Core Value:** Que ningún pedido se pierda y que al final del día se sepa exactamente cuánto se vendió y por qué método de pago.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Supabase project initialized with PostgreSQL database and Realtime enabled
- [ ] **INFRA-02**: Database schema deployed with 4 tables: products, orders, order_items (price snapshot), order_status_log
- [ ] **INFRA-03**: RLS policies configured and tested with Supabase Realtime on hosted environment
- [ ] **INFRA-04**: Vite + React + TypeScript project scaffolded with Tailwind v4 and shadcn/ui
- [ ] **INFRA-05**: PWA manifest and service worker configured, installable on Android Chrome and iOS Safari
- [ ] **INFRA-06**: React Router routes defined: /pos, /kds, /products, /reports
- [ ] **INFRA-07**: NavBar with route switching (device-based role, no auth in v1)
- [ ] **INFRA-08**: 48dp minimum touch target standard established in shared components

### Products

- [ ] **PROD-01**: User can create a product with name, category (comida/bebida/postre) and price
- [ ] **PROD-02**: User can edit an existing product's name, category and price
- [ ] **PROD-03**: User can deactivate a product (soft delete) without affecting existing orders
- [ ] **PROD-04**: User can view all products organized by category
- [ ] **PROD-05**: User can reactivate a previously deactivated product

### POS (Caja)

- [ ] **POS-01**: User can browse products in a touch-optimized grid organized by category
- [ ] **POS-02**: User can add products to cart with quantity adjustment (+/-)
- [ ] **POS-03**: User can add free-text notes per item in the cart (e.g., "sin cebolla")
- [ ] **POS-04**: User can toggle order type between Local and Delivery
- [ ] **POS-05**: User can select payment method: Efectivo, Débito, or Transferencia
- [ ] **POS-06**: User can submit order, generating a unique human-readable order number
- [ ] **POS-07**: Order submission uses optimistic update (no waiting for network round-trip)
- [ ] **POS-08**: Order items snapshot unit_price and product_name at creation time (independent of future price changes)

### KDS (Cocina)

- [ ] **KDS-01**: Kitchen display shows pending orders in real-time via Supabase Realtime (no page reload)
- [ ] **KDS-02**: Kitchen user can tap "Aceptar" to move order from Pendiente to En Preparación
- [ ] **KDS-03**: Kitchen user can tap "Listo" to move order from En Preparación to Listo
- [ ] **KDS-04**: Each order card displays elapsed time since creation
- [ ] **KDS-05**: State transitions use conditional UPDATE to prevent race conditions (double-accept)
- [ ] **KDS-06**: Realtime connection survives browser tab backgrounding (worker: true)
- [ ] **KDS-07**: Visible connection-status indicator (green = connected, red = disconnected)
- [ ] **KDS-08**: Realtime subscription properly cleaned up on component unmount

### Order Lifecycle

- [ ] **ORD-01**: Every order follows the state flow: Pendiente → En Preparación → Listo → Entregado
- [ ] **ORD-02**: Every state transition is logged in order_status_log with timestamp
- [ ] **ORD-03**: Cashier or delivery person can mark order as Entregado (final state)

### Reports

- [ ] **REP-01**: User can view total sales amount for the current day
- [ ] **REP-02**: User can view sales breakdown by payment method (Efectivo / Débito / Transferencia)
- [ ] **REP-03**: User can view sales breakdown by product (which items sold most/least)
- [ ] **REP-04**: Reports only count orders with status 'entregado' (pending/cancelled excluded)
- [ ] **REP-05**: Reports handle timezone correctly (orders near midnight assigned to correct day)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements

- **ENH-01**: Configurable shift close time for late-night operations (when "today" ends)
- **ENH-02**: Order history with search and filter
- **ENH-03**: Delivery customer name and phone field on order creation
- **ENH-04**: Sound alerts for new orders on KDS
- **ENH-05**: KDS color-coded urgency (green/yellow/red by wait time thresholds)
- **ENH-06**: Inline price editing on product list (edit without opening form)

### Future (v2+)

- **FUT-01**: Inventory/stock management with ingredient tracking
- **FUT-02**: Thermal printer integration for kitchen comandas and customer tickets
- **FUT-03**: Multi-user authentication with role-based access
- **FUT-04**: Reporting dashboard with charts and trends
- **FUT-05**: WhatsApp order intake automation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Table management | Local opera con mostrador + delivery, no tiene mesas |
| Offline mode | WiFi es estable en el local; offline duplica complejidad |
| Delivery platform integration (PedidosYa/Rappi) | No usan plataformas, piden por WhatsApp |
| Payment gateway integration | Solo registro de método, sin cobro electrónico |
| Customer loyalty program | Delivery es anónimo (WhatsApp), no hay DB de clientes |
| Multi-branch support | Un solo local; multi-tenant agrega complejidad innecesaria |
| Discount/coupon system | Se manejan ajustando precios manualmente |
| Live revenue ticker | No accionable durante servicio; reporte de cierre es suficiente |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | 1 | Pending |
| INFRA-02 | 1 | Pending |
| INFRA-03 | 1 | Pending |
| INFRA-04 | 1 | Pending |
| INFRA-05 | 1 | Pending |
| INFRA-06 | 1 | Pending |
| INFRA-07 | 1 | Pending |
| INFRA-08 | 1 | Pending |
| PROD-01 | 2 | Pending |
| PROD-02 | 2 | Pending |
| PROD-03 | 2 | Pending |
| PROD-04 | 2 | Pending |
| PROD-05 | 2 | Pending |
| POS-01 | 3 | Pending |
| POS-02 | 3 | Pending |
| POS-03 | 3 | Pending |
| POS-04 | 3 | Pending |
| POS-05 | 3 | Pending |
| POS-06 | 3 | Pending |
| POS-07 | 3 | Pending |
| POS-08 | 3 | Pending |
| KDS-01 | 4 | Pending |
| KDS-02 | 4 | Pending |
| KDS-03 | 4 | Pending |
| KDS-04 | 4 | Pending |
| KDS-05 | 4 | Pending |
| KDS-06 | 4 | Pending |
| KDS-07 | 4 | Pending |
| KDS-08 | 4 | Pending |
| ORD-01 | 3 | Pending |
| ORD-02 | 3 | Pending |
| ORD-03 | 3 | Pending |
| REP-01 | 5 | Pending |
| REP-02 | 5 | Pending |
| REP-03 | 5 | Pending |
| REP-04 | 5 | Pending |
| REP-05 | 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
