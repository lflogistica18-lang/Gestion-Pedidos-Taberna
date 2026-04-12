# Feature Research

**Domain:** Gastronomy POS/KDS System
**Researched:** 2026-04-12
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product catalog with categories | Any POS organizes items by type (comida, bebida, postre) | LOW | Foundation for everything else |
| One-tap product selection | Cashier speed depends on fast item entry | LOW | Grid/list layout, touch-optimized |
| Quantity adjustment | Multiple units of same item per order | LOW | +/- buttons or numeric input |
| Per-item notes | "sin cebolla", "extra queso" — standard gastro workflow | LOW | Free text field per line item |
| Local/Delivery toggle | Must distinguish order type for kitchen workflow | LOW | Toggle on order creation |
| Unique order ID | Track and reference orders across stations | LOW | Auto-generated sequential or daily reset |
| Order status flow | Pendiente → En Preparación → Listo → Entregado | MEDIUM | State machine with timestamp logging |
| Payment method selector | Efectivo, Débito, Transferencia — no gateway needed | LOW | Simple selector at checkout |
| KDS dedicated view | Kitchen needs its own screen showing pending orders | MEDIUM | Real-time via Supabase subscriptions |
| Daily sales total | "How much did we sell today?" — the core question | LOW | Sum of completed orders |
| Sales by payment method | "How much cash vs debit?" — basic reconciliation | LOW | Group-by query on payment method |
| Price editing | Menu prices change weekly/monthly | LOW | Admin CRUD for products |
| PWA installable | Must work as app on tablets/phones | MEDIUM | Service worker + manifest |

### Differentiators (Competitive Advantage)

Features that set this system apart from paper/voice workflows.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sub-10-second order entry | Faster than writing on paper | MEDIUM | Requires optimized touch UI |
| KDS elapsed time display | Know how long each order has been waiting | LOW | Timer since order creation |
| Color-coded urgency on KDS | Green/yellow/red based on wait time thresholds | LOW | Visual alert for delayed orders |
| Delivery caller name field | Associate delivery orders with customer name/phone | LOW | Optional field on order |
| Inline price edit | Change prices without navigating away from product list | LOW | Edit-in-place on product grid |
| Per-product sales breakdown | Know what sells most, what doesn't move | MEDIUM | v1.x feature, aggregate query |
| Order history/audit log | Full traceability of every action on every order | MEDIUM | movimientos_pedidos table |
| Configurable shift close time | Define when "today" ends for reports (e.g., 4am) | LOW | Config setting for report boundary |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Table management | "Restaurants have tables" | This local doesn't — mostrador + delivery only | Order number + type (local/delivery) |
| Thermal printing | "Real restaurants print tickets" | No printer hardware available yet | Digital KDS replaces paper comandas |
| Offline mode | "What if WiFi drops?" | WiFi confirmed stable; offline adds massive complexity | Rely on stable WiFi, revisit if needed |
| Delivery platform integration | "Connect to PedidosYa/Rappi" | Don't use platforms — orders come via WhatsApp | Manual order entry for delivery |
| Role-based auth | "Different permissions per user" | 3-5 trusted people; auth complexity not justified | Simple PIN or shared access for v1 |
| Inventory/stock tracking | "Deduct ingredients from stock" | Separate concern, doubles scope | Phase 2+ feature |
| Customer loyalty program | "Reward repeat customers" | Delivery is anonymous (WhatsApp), no customer DB | Future consideration |
| Multi-branch support | "Scale to multiple locations" | Single location; multi-tenant adds complexity | Design for one, extend later |
| Live revenue ticker | "See money coming in real-time" | Distracting, not actionable during service | End-of-day report is sufficient |
| Discount/coupon system | "Promotions drive sales" | Adds price logic complexity | Apply discounts manually via notes/price adjustment |

## Feature Dependencies

```
[Product Catalog]
    └──requires──> [Database Schema]
                       └──requires──> [Supabase Setup]

[Order Entry (POS)]
    └──requires──> [Product Catalog]

[Order State Machine]
    └──requires──> [Order Entry]

[KDS Display]
    └──requires──> [Order State Machine]
    └──requires──> [Supabase Realtime]

[Daily Reports]
    └──requires──> [Order State Machine] (completed orders with payment data)

[PWA Install]
    └──independent──> (can be done anytime, but best early)
```

### Dependency Notes

- **KDS requires Order State Machine:** Can't display orders without the state flow
- **Reports require completed orders:** Need payment data + timestamps to generate totals
- **PWA is independent:** Service worker/manifest can be configured at any phase

## MVP Definition

### Launch With (v1)

- [ ] Product catalog with categories and prices — foundation for all operations
- [ ] POS order entry with quantities, notes, local/delivery toggle — replaces voice-based ordering
- [ ] Order state machine with timestamp logging — creates traceability
- [ ] KDS real-time display with accept/ready actions — replaces shouting to kitchen
- [ ] Payment method selector (Efectivo/Débito/Transferencia) — basic sales recording
- [ ] Daily sales report: total + breakdown by payment method — answers "how much did we sell?"
- [ ] PWA manifest and service worker — installable on tablets/phones
- [ ] KDS color-coded urgency (green/yellow/red) — low-cost high-value differentiator

### Add After Validation (v1.x)

- [ ] Per-product sales breakdown — when they want to optimize the menu
- [ ] Order history search/filter — when volume grows and they need to look up past orders
- [ ] Delivery customer name/phone field — when delivery tracking becomes a pain point
- [ ] Configurable shift close time — when late-night orders blur daily reports
- [ ] Sound alerts on KDS — when kitchen misses visual notifications

### Future Consideration (v2+)

- [ ] Inventory/stock management — defer until core POS is validated and stable
- [ ] Thermal printer integration — defer until hardware is purchased
- [ ] Multi-user authentication — defer until trust model changes or team grows
- [ ] Reporting dashboard with charts — defer until basic reports prove insufficient
- [ ] WhatsApp order intake automation — defer until delivery volume justifies it

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Product catalog CRUD | HIGH | LOW | P1 |
| POS order entry | HIGH | MEDIUM | P1 |
| Order state machine + log | HIGH | MEDIUM | P1 |
| KDS real-time display | HIGH | MEDIUM | P1 |
| Payment method selector | HIGH | LOW | P1 |
| Daily sales report | HIGH | LOW | P1 |
| PWA installable | MEDIUM | MEDIUM | P1 |
| KDS urgency colors | MEDIUM | LOW | P1 |
| Per-product sales | MEDIUM | LOW | P2 |
| Order history search | MEDIUM | LOW | P2 |
| Delivery customer info | LOW | LOW | P2 |
| Inventory tracking | MEDIUM | HIGH | P3 |
| Thermal printing | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Key Insight

This business moves from zero digital infrastructure to structured operations. The bar for v1 is replacing chaos with order, not feature parity with commercial POS systems. **Restraint in scope is itself a feature.**

## Sources

- Domain knowledge: gastronomy POS/KDS systems (Toast, Square, Loyverse, Poster POS)
- User requirements from PROJECT.md
- PWA best practices for touch-first restaurant interfaces

---
*Feature research for: Gastronomy POS/KDS System*
*Researched: 2026-04-12*
