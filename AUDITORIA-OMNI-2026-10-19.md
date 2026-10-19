# Auditoría Omni FullStack Builder — SGP (Gestion-Pedidos-Taberna)

> Vista derivada: si contradice a `.planning/STATE.md`, gana el estado.
> Comando: `/omni-auditar` (Omni v7.2). Commit auditado: `00aefcb`. Fecha: 2026-10-19.
> Remediación aplicada el mismo día en una sola pasada (ver sección final).

## Puntuación

| Sección | Nota |
|---|---|
| Estructura y organización | 6/10 |
| Separación de responsabilidades | 8/10 |
| TypeScript y tipado | 5/10 |
| Manejo de errores | 4/10 |
| Seguridad | 2/10 |
| Performance | 6/10 |
| Dependencias | 4/10 |
| Mobile y PWA | 6/10 |
| Integraciones IA | N/A |
| Configurabilidad | 7/10 |
| **Total** | **53/100 — Refactor importante** |

## 🔴 Bloqueantes

1. **RLS decorativa.** Todas las policies `USING (true)` y tablas otorgadas a `anon` (`003:9-25`, `005`, `006:24-27`). Con la anon key (pública en el bundle) cualquiera lee/escribe/borra ventas sin login. Proyecto Supabase compartido → hace falta rol en `app_metadata`.
2. **Reportes suman papelera y cancelados, y fallan en silencio.** `useDashboardStats.ts:49-63` sin filtro `deleted_at`/`cancelado` y sin leer `error`.
3. **Fallas silenciosas en pedidos.** `useActiveOrders.ts:24-28`, `useKdsOrders.ts:34-52`, `KdsOrderCard.tsx:24-28`, `ActiveOrdersPanel.tsx:18-24`, `pos-page.tsx:18`.
4. **Borrado físico de ventas.** `useAdminOrders.ts:98-125` + policies DELETE.
5. **Schema drift.** `products.cost` y `products.deleted_at` usadas en código sin migración; `product_categories` sin columnas base.

## 🟡 Importantes

1. Promedio de preparación siempre `--`: compara `'en_preparacion'` pero el trigger escribe `'accepted'`.
2. 24 `any`, lint con 27 errores.
3. Código muerto (`ProductForm/Modal/Card`, `usePrepTimeStats`) que además esquiva la validación zod.
4. Patrón G a medias: sin `useCrud`, categorías con CRUD a mano.
5. `renameCategory` no atómico (insert → update → delete).
6. `.env` versionado, sin `.env.example`.
7. 18 vulnerabilidades npm (13 high); `vite-plugin-pwa` con peer `vite ≤7`.
8. Mobile: `.btn--sm` 36px; inputs con `font-size` < 16px.
9. Sin tokens de tema: 58 colores hardcodeados en `.tsx`.
10. Performance: `select('*')`, historial sin paginación, FK `order_items.product_id` sin índice, doble canal realtime, reloj re-renderiza toda la app.
11. Menores: `'debito'` en DB pero no en tipos; etiquetas "Delivery" para pedidos `directo`; README template; fuente desde Google Fonts.

## 🟢 Bien

Snapshot de nombre/precio en ítems y `subtotal` generado; triggers de log y `updated_at`; `TIMESTAMPTZ`/`NUMERIC`; fechas locales sin bug UTC; Supabase solo en hooks; confirmaciones en acciones destructivas; PWA completa; Docker multi-stage; `AuthGuard`.

## Remediación aplicada (2026-10-19)

| Bloqueante / importante | Qué se hizo |
|---|---|
| 🔴 1, 4, 5 | `supabase/migrations/010_seguridad_rls_y_columnas.sql` + `AuthGuard` exige `app_metadata.rol = 'taberna'` |
| 🔴 2, 3 · 🟡 1 | Hooks exponen `error`, `EstadoError` en pantallas, filtro papelera/cancelado, `'accepted'` |
| 🔴 4 | Sin `eliminarPermanente`; papelera solo restaura |
| 🟡 2, 3, 5, 7, 8, 10, 11 | Cero `any`, borrado de código muerto, `rpc('renombrar_categoria')`, `npm audit fix`, 44px/16px, paginación "Cargar más", un canal realtime, `<Reloj />`, tipos y etiquetas |
| 🟡 6 | `.env.example` + `ARG` en Dockerfile (`.env` sigue versionado, ver STATE.md) |
| **No resuelto** | 🟡 4 (useCrud), 🟡 9 (tokens de tema → va con la mejora de UI), `select('*')`, Google Fonts |

**Pendiente del dueño:** aplicar `010` (debe devolver `OK`), re-login de los usuarios, prueba integral, deploy.
