# Pitfalls Research

**Domain:** Gastronomy POS/KDS System
**Researched:** 2026-04-12
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Silent WebSocket Disconnect on Backgrounded Tabs

**What goes wrong:**
Chrome and Safari throttle JS timers after 5-7 minutes of tab inactivity, killing the Supabase Realtime heartbeat. The KDS goes dark silently — no error shown, kitchen stops receiving orders.

**Why it happens:**
Browser power-saving features aggressively suspend background tabs. The WebSocket connection drops but the UI doesn't know.

**How to avoid:**
- Enable `worker: true` in Supabase Realtime config (moves heartbeat to a Web Worker, immune to tab throttling)
- Add a visible connection-status indicator on KDS (green dot = connected, red = disconnected)
- Implement auto-reconnection with visual feedback

**Warning signs:**
Kitchen staff report "orders stopped coming" after leaving the KDS tab idle for a few minutes.

**Phase to address:** Phase 2 (KDS implementation)

---

### Pitfall 2: RLS + Realtime Subscriptions Breaking Each Other

**What goes wrong:**
Enabling Row Level Security (RLS) on the `orders` table silently breaks Realtime event delivery. Orders get inserted but KDS never receives the WebSocket event.

**Why it happens:**
Documented Supabase incompatibility (GitHub issue #35282). Realtime needs specific RLS policies that allow `SELECT` for the subscribing role, and the `supabase_realtime` role needs explicit grants.

**How to avoid:**
- Test RLS + Realtime combination on day one, not at launch
- Create explicit RLS policies for `anon` or `authenticated` role that allow SELECT on orders
- Grant `supabase_realtime` role SELECT permission: `GRANT SELECT ON orders TO supabase_realtime`
- If using anon access (v1), keep RLS simple or disable on orders table initially

**Warning signs:**
Realtime works perfectly in local dev (no RLS), breaks in production (RLS enabled by default on Supabase hosted).

**Phase to address:** Phase 1 (Database setup) — test immediately

---

### Pitfall 3: Order State Race Condition (Double Accept)

**What goes wrong:**
Two kitchen staff tap "Accept" on the same order simultaneously. Both UPDATEs succeed at the DB level, creating duplicate status log entries and confusing the UI.

**Why it happens:**
Default UPDATE doesn't check current state — `UPDATE orders SET status = 'en_preparacion' WHERE id = ?` succeeds regardless of current status.

**How to avoid:**
- Use conditional UPDATE: `UPDATE orders SET status = 'en_preparacion' WHERE id = ? AND status = 'pendiente'`
- Check `rowsAffected` — if 0, someone else already accepted it
- Show visual feedback immediately (optimistic update) but revert if DB returns 0 rows
- Consider a DB function/trigger that enforces valid state transitions

**Warning signs:**
Duplicate entries in `order_status_log`, KDS showing stale states.

**Phase to address:** Phase 2 (KDS) — implement from the start

---

### Pitfall 4: Price Change Contaminating Active Orders

**What goes wrong:**
Updating a product price mid-shift causes active (not yet delivered) orders to show wrong totals if prices are fetched via JOIN from the products table.

**Why it happens:**
Developers store `product_id` in order items and JOIN to get the current price, which changes when admin updates it.

**How to avoid:**
- Snapshot `unit_price` and `product_name` into `order_items` at creation time
- Never derive order totals from the current products table
- The `order_items.subtotal` should be a computed column from the snapshot price

**Warning signs:**
End-of-day report totals don't match what was charged to customers. Historical orders show "impossible" prices.

**Phase to address:** Phase 1 (Database schema) — design correctly from the start

---

### Pitfall 5: Touch Target Size Under Rush Pressure

**What goes wrong:**
Buttons below 48dp (device-independent pixels) cause mis-taps during rush hour. Destructive actions (cancel order, delete item) placed adjacent to common actions (accept, ready) cause accidental data loss.

**Why it happens:**
Developers test with mouse clicks on desktop, not with fingers on greasy tablet screens under time pressure.

**How to avoid:**
- Minimum touch target: 48x48dp with 8dp spacing between targets
- Destructive actions require confirmation or are placed far from common actions
- KDS buttons should be even larger (56-64dp) — kitchen staff have wet/greasy hands
- Test on actual tablets with actual finger taps, not just browser dev tools

**Warning signs:**
Staff complaining about "wrong button" taps, especially during busy periods.

**Phase to address:** Phase 1 (UI foundation) — establish size standards early

---

### Pitfall 6: Supabase Subscription Leaks

**What goes wrong:**
Creating a new Realtime channel on every React render (or not cleaning up on unmount) multiplies connection count. With 5 devices, poorly managed subscriptions can create 50+ phantom connections, approaching the 200-connection free tier limit.

**Why it happens:**
Supabase subscription created inside `useEffect` without proper cleanup, or outside the effect entirely (re-created on every render).

**How to avoid:**
- Always return cleanup function from `useEffect`: `return () => { supabase.removeChannel(channel) }`
- Create subscriptions at the page/module level, not per-component
- Monitor connection count in Supabase dashboard during development
- Consider a single shared subscription hook used across the KDS module

**Warning signs:**
Supabase dashboard showing many more connections than physical devices. Performance degradation over time without page reload.

**Phase to address:** Phase 2 (KDS) — implement proper cleanup patterns

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No auth in v1 (open access) | Zero friction, fast dev | Anyone on WiFi can access/modify data | MVP with trusted team only |
| Inline styles for touch sizes | Quick fixes during dev | Inconsistent sizes across views | Never — use Tailwind classes from start |
| `any` types in TypeScript | Faster initial coding | Type bugs in order calculations | Never — use generated Supabase types |
| No DB indexes | Simpler schema | Slow reports as orders grow (>1000) | First 3 months; add indexes before 1000 orders |
| Client-side report calculations | No server functions needed | Slow on mobile with large datasets | Until daily orders exceed ~200 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Realtime | Subscribing to all events (`*`) on orders table | Filter by status: `filter: 'status=in.(pendiente,en_preparacion)'` |
| Supabase Auth (future) | Using email/password for kitchen staff | Use PIN-based or device-based auth for speed |
| vite-plugin-pwa | Not testing service worker update flow | Test SW update: change code → build → verify new version loads |
| Supabase migrations | Running migrations manually via SQL editor | Use `supabase db push` for reproducible schema changes |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all orders on KDS load | Slow initial render, memory bloat | Filter by status + today's date only | >500 orders in DB |
| Re-rendering entire order list on any change | UI jank on tablet during rush | Use React.memo + key-based updates | >20 simultaneous orders |
| Large product images in catalog | Slow POS load on mobile | Resize to max 200x200, use WebP, lazy load | >30 products with photos |
| No pagination on reports | Browser tab crashes | Paginate or limit to daily/weekly views | >3 months of data |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No RLS on products table | Anyone on WiFi can change prices | Enable RLS even in v1; allow updates only from admin view |
| Exposing Supabase anon key in client | Expected for client-side access, but... | Ensure RLS policies are correct; anon key + RLS is the designed pattern |
| No rate limiting on order creation | Someone could spam fake orders | Add a DB trigger or Edge Function to limit orders per minute |
| Storing payment amounts only in client | Data can be tampered with | Always calculate totals server-side (DB computed columns or triggers) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Small text on KDS | Kitchen can't read orders from 1-2 meters away | Minimum 20px font, bold item names, high contrast |
| No audio/visual alert for new orders | Kitchen misses orders during prep | Add a sound + screen flash for new pending orders |
| Confirmation dialogs on every action | Slows down service during rush | Only confirm destructive actions; common actions (accept, ready) should be one-tap |
| Auto-hiding scroll on order list | Kitchen loses their place in the queue | Always-visible scroll, or paginate with clear "N more orders" indicator |
| Dark theme on KDS | Hard to read in bright kitchens | Default to light theme with high contrast for kitchen environments |

## "Looks Done But Isn't" Checklist

- [ ] **Order creation:** Does it snapshot product prices? (not just product_id)
- [ ] **KDS realtime:** Does it reconnect after WiFi drops? (test by toggling WiFi)
- [ ] **KDS realtime:** Does it work with RLS enabled? (test on hosted Supabase, not just local)
- [ ] **Order status:** Does UPDATE check current status? (prevent double-accept)
- [ ] **Daily report:** Does it handle timezone correctly? (orders at 11:55 PM vs 12:05 AM)
- [ ] **Daily report:** Does it only count 'entregado' orders? (not pending/cancelled)
- [ ] **PWA:** Does it install on Android Chrome? (test actual install flow)
- [ ] **PWA:** Does it install on iOS Safari? (Add to Home Screen, not auto-prompt)
- [ ] **Touch targets:** Are all buttons ≥48dp on actual tablet? (not just browser zoom)
- [ ] **Product CRUD:** Can you deactivate a product without breaking existing orders? (soft delete)
- [ ] **Price change:** Do existing open orders keep their original prices?
- [ ] **Subscription cleanup:** Do realtime channels get removed on component unmount?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WebSocket disconnect | LOW | Refresh KDS page; implement auto-reconnect to prevent recurrence |
| Race condition (double accept) | LOW | Manual status correction in DB; add WHERE clause to prevent |
| Price contamination | HIGH | Must recalculate affected orders manually; redesign schema to snapshot |
| Subscription leak | LOW | Restart app; fix useEffect cleanup |
| RLS breaking realtime | MEDIUM | Debug RLS policies; may need to restructure auth approach |
| Touch target mis-taps | LOW | Undo action if available; increase button sizes |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Price snapshot | Phase 1 (DB Schema) | Check `order_items` has `unit_price` column, not a JOIN |
| RLS + Realtime | Phase 1 (DB Setup) | Test realtime with RLS enabled on hosted Supabase |
| Touch target sizes | Phase 1 (UI Foundation) | Measure all interactive elements ≥48dp on tablet |
| WebSocket disconnect | Phase 2 (KDS) | Background KDS tab for 10 min, verify orders still arrive |
| Race condition | Phase 2 (KDS) | Two browsers, tap "Accept" simultaneously, verify only one succeeds |
| Subscription leaks | Phase 2 (KDS) | Check Supabase dashboard connection count after 30 min of use |

## Sources

- Supabase Realtime documentation and known issues
- Supabase GitHub issues (#35282 — RLS + Realtime)
- Web.dev PWA guidelines
- Material Design touch target guidelines (48dp minimum)
- Restaurant POS failure modes (industry knowledge)

---
*Pitfalls research for: Gastronomy POS/KDS System*
*Researched: 2026-04-12*
