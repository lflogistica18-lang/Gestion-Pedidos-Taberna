# Project State

## DÓNDE QUEDAMOS (2026-10-19)

**Fase:** las 5 fases del roadmap están construidas y en producción (VPS, puerto 8090).
Hoy el trabajo es **remediación de la auditoría Omni** + preparar la siguiente etapa.

**Último hecho:** auditoría Omni v7.2 → 53/100 (`AUDITORIA-OMNI-2026-10-19.md`).
Remediación aplicada en una sola pasada, sin probar en vivo:
- Migración `010_seguridad_rls_y_columnas.sql`: RLS real con rol `app_metadata.rol = 'taberna'`,
  sin `anon`, sin DELETE, columnas `products.cost/deleted_at`, índices, `renombrar_categoria()`.
- `AuthGuard` exige el rol; errores visibles en Caja/Cocina/Reportes/Historial;
  reportes excluyen papelera y cancelados; promedio de cocina arreglado; sin borrado físico;
  un solo canal realtime; cero `any`; mobile 44px/16px; deps actualizadas; código muerto fuera.

**Próximo paso (cuando Lucas esté):**
1. Aplicar `010` en el SQL editor de Supabase → tiene que devolver `OK`.
   ⚠️ Antes, ajustar el `WHERE email ILIKE '%@sgc-taberna.com'` del paso 4 si los usuarios
   usan otro dominio. Los usuarios tienen que **cerrar sesión y volver a entrar** para que el
   JWT traiga el rol.
2. Probar todo junto: login, crear pedido (local/delivery/directo), KDS, entregar, papelera,
   restaurar, productos, categorías (renombrar), reportes con rango de fechas.
3. Deploy (ver CLAUDE.md). El `.env` sigue versionado a propósito: sacarlo del repo rompe el
   `git pull` del VPS; cuando se saque, antes copiar `.env` fuera y restaurarlo.

**Siguiente etapa (pedida por Lucas):**
- Conexión a **comandera** (impresora térmica): requiere print server local
  (`node-thermal-printer`), ver CLAUDE.md "Stack Patterns".
- **Mejora de UI** alineada con las apps nuevas (estilo Panel / tokens de tema del Omni,
  `sistema/diseno/GUIA.md`). Hoy hay 58 colores hardcodeados en `.tsx` y ninguno tokenizado.
- **Direcciones de pedidos**: hoy `orders.delivery_address` es texto libre; falta libreta de
  direcciones por cliente.
- Evaluar mover el SGP a un proyecto Supabase propio (hoy comparte proyecto, schema `sgp`).

**Bloqueantes:** ninguno de código. Pendiente del dueño: aplicar la migración y asignar rol.

**Pendiente de auditoría no resuelto en esta pasada:** tokens de tema (va con la mejora de UI),
`select('*')` en queries, fuente Inter desde Google Fonts (PWA sin internet pierde tipografía).

---

## Project Reference
See: .planning/PROJECT.md (updated 2026-04-12)
**Core value:** Que ningún pedido se pierda y que al final del día se sepa exactamente cuánto se vendió y por qué método de pago.

## Phase Progress

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1 Foundation | Done | 2026-04 | 2026-04 |
| 2 Product Catalog | Done | 2026-04 | 2026-04 |
| 3 POS Order Entry | Done | 2026-04 | 2026-04 |
| 4 KDS Kitchen Display | Done | 2026-04 | 2026-04 |
| 5 Reports & Polish | Done | 2026-04 | 2026-04-20 |
| 6 Remediación Omni | In progress | 2026-10-19 | — |

## Decisions Log
- 2026-10-19 — Rol de acceso en `app_metadata.rol = 'taberna'` (no user_metadata). Proyecto
  Supabase compartido → "está logueado" no alcanza como filtro.
- 2026-10-19 — Papelera (`deleted_at`) y `cancelado` NO cuentan en reportes. Se elimina el
  borrado físico de ventas; la papelera ya "resta de caja".
- 2026-10-19 — `.env` queda versionado hasta que se cambie el deploy a `--build-arg`.
