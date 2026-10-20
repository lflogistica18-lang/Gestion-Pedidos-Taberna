# Estado del Proyecto

## Proyecto: SGP — Gestión de Pedidos La Taberna
## Ultima actualizacion: 2026-10-20 (tarde)
## Version Omni: v7.2
## Starter: no aplica (proyecto anterior al Omni, sin backend; ver CLAUDE.md "Omni")

> **Este archivo gana sobre cualquier otro documento del proyecto** (`.planning/STATE.md`,
> `AUDITORIA-OMNI-2026-10-19.md`, `docs/notas/estilo-panel.md` son vistas derivadas). El bloque
> de abajo se REESCRIBE al cerrar cada sesión.

---

## DÓNDE QUEDAMOS — leer primero al retomar (maximo 40 lineas)

**Fase actual:** 7 — Cambios de Lucas: tanda 1 (menú, Pedido +, Caja) EN PRODUCCIÓN `d0eddb3`.
Sigue: logo (cuando Lucas lo pase), margen (charlar), y en paralelo el primer uso (paso 5).
**Lo ultimo que se hizo (2026-10-20, sesión local):**
- Menú: Caja (`/reports`, inicio) → Pedido + (`/pos`) → Cocina → Historial → Productos. Rutas URL
  iguales; login y `/` redirigen a `/reports`.
- Pedido +: lista compacta (`FilaProducto`, 49 px, + de 44×44), buscador sin acentos, sin
  "Directa" en el selector (los `directo` viejos se siguen mostrando). 9 filas visibles a 390×844.
- Caja: tendencia en el banner (Hoy = acumulado por hora; varios días = por día), refresco cada
  60 s si el período incluye hoy, "Qué días se vende más" (opción B elegida por Lucas: barras
  Lun→Dom con monto, promedio por día de las últimas 8 semanas). "Más vendidos" sin gráfico.
- QA con Chromium + Supabase mockeado (`capturas-fase7/`, no versionado). Deploy con copia de la
  imagen anterior: vuelta atrás = `docker tag sgp-taberna:anterior-65c8636 sgp-taberna:latest` + up -d.
- "Batería de consulta": Lucas dijo que lo olvidemos.
- Ojo: el VPS levanta con `docker compose` (plugin v2), no `docker-compose` v1 como dice CLAUDE.md.
**Proximo paso concreto:**
1. Logo: Lucas lo pega en el chat → reemplazar `public/logo-taberna.png` y redeploy; el botón
   en Configuración → Local (migración 013 + Storage) va después.
2. Charlar el margen (un % para todo o por categoría).
3. Impresora IT03 y primer uso (ver Pendientes del dueño).
4. Deuda: `useDashboardStats` trae como máximo 1000 pedidos por consulta (paginar).
**Bloqueantes:** ninguno conocido.
**Pendientes del dueño:**
- Mirar la parte de atrás de la IT03 (RJ45 o USB) e instalar RawBT en el celu.
- Pasar el logo de la Taberna (pegarlo en el chat de la sesión; ver Fase 7 → logo).
- Opcional: placeholder del login (`usuario@sgc-taberna.com`) y textos del script → `@lataberna.com`.
**Avisos:**
- Nuevos usuarios de la caja: darles el rol con el `UPDATE auth.users ... WHERE email = '...'`
  (el script solo cubre `@sgc-taberna.com`). Salir y volver a entrar para que el rol llegue al token.
- El SQL Editor de Supabase solo muestra el resultado de la última sentencia.
- `.env` sigue versionado (anon key pública por diseño); sacarlo exige ajustar el deploy.

---

## Pedidos de Lucas (2026-10-20) — Fase 7, para la próxima sesión

Anotados tal como los dijo. **Hecho 2026-10-20 (`d0eddb3`): menú, pantalla principal y Pedido +.** Queda Configuración (margen y logo).

**Menú y orden de pantallas** (hoy: Caja, Productos, Historial, Reportes, Configuración):
1. **Reporte primero**: es lo primero que se mira, y de ahí para abajo. Nombre: "Caja" o "Flujo
   de Caja" (es el reporte, no la toma de pedidos).
2. **Pedido +**: el armado de pedido que hoy está en Caja (`/pos`).
3. Historial · 4. Productos · 5. Configuración.

**Pantalla principal / reporte:**
- Muestra las **ventas de hoy**, que se van sumando a medida que se cargan pedidos.
- En el recuadro de la derecha (ventas del día): **línea de tendencia que responde al filtro**
  de período.
- **Indicador semanal**: qué días de la semana se vende más.
- "El pedido es una batería de consulta": no quedó claro; preguntarle a Lucas qué quiso decir.

**Armar pedido (Pedido +):**
- **Sacar el tipo "Directa"** (`directo`): hoy no cumple ninguna función. Quedan Local y Delivery.
  Ojo: `OrderType`, `CartPanel`, `ActiveOrderCard`, `KdsOrderCard`, `formato.ts` y `Receipt.tsx`
  (`Receipt` solo con permiso de Lucas). Los pedidos viejos `directo` se siguen mostrando.
- **Buscador de productos.**
- **Productos en lista compacta**, como INSUMOS de depo-track pero más angosta: con 20 platos en
  el celu las tarjetas ocupan mucho, y al ampliar se ensanchan. Nombre a la izquierda y
  contador a la derecha; el producto sumado queda marcado. Tal vez desplegable (por categoría).
  Nombres largos: el alto de la fila puede crecer a doble fila.

**Configuración:**
- **Margen**: elegir entre un porcentaje para todo o un porcentaje por categoría. **Charlarlo
  antes de construir.**
- **Logo de la app** cargado desde Configuración → Local (hoy es el archivo fijo
  `public/logo-taberna.png`, que usan login, barra superior, menú lateral y AuthGuard). Necesita
  un bucket de Supabase Storage + una columna `logo_url` en `sgp.configuracion` (migración 013),
  con RLS por rol `taberna`.

---

## Fases

| Fase | Estado | Fecha completada | Notas |
|------|--------|-----------------|-------|
| 1-5 Roadmap GSD (POS, KDS, productos, reportes) | hecho | 2026-04-20 | `.planning/ROADMAP.md` |
| Auditoría Omni + remediación | hecho | 2026-10-19 | `AUDITORIA-OMNI-2026-10-19.md` |
| Impresión (ticket 80 mm, RawBT, print server) | hecho (sin hardware) | 2026-10-19 | `print-server/README.md` |
| UI estilo Panel | hecho | 2026-10-19 | `docs/notas/estilo-panel.md` |
| Configuración | hecho | 2026-10-19 | migración 012 |
| 6 - Deploy producción | hecho (falta primer uso) | 2026-10-20 | `docs/PUESTA-EN-MARCHA.md` |
| 7 - Cambios de Lucas (menú, reporte, lista de productos, logo, margen) | en curso (menú, Caja y Pedido + en prod) | | "Pedidos de Lucas" arriba |
| 8 - Explicación (/omni-explicar) + operación | pendiente | | |

## Migraciones

| Migración | Qué | Aplicada en prod |
|---|---|---|
| 001–009 | Esquema original | sí (abril) — luego movida a `papelera_sgp` |
| 010 | RLS por rol `taberna`, sin anon ni DELETE, columnas faltantes, `renombrar_categoria` | sí (vía script, 2026-10-20) |
| 011 | Cola de impresión `print_jobs` | sí (vía script, 2026-10-20) |
| 012 | `configuracion` (una fila) | sí (vía script, 2026-10-20) |
| `instalar_sgp_desde_cero.sql` | 001–012 + seed en una transacción | **sí** (2026-10-20, verificación OK) |

## Deploy (datos)

| Dato | Valor |
|---|---|
| VPS / carpeta | `root@187.77.247.24` · `/root/Gestion-Pedidos-Taberna` (`.env` manual) |
| Imagen / contenedor | `sgp-taberna:latest` · `sgp-taberna-front` · `127.0.0.1:8090` · red `red-proxy` |
| Dominio | `https://pedidostaberna.duckdns.org` (NPM → `sgp-taberna-front:80`) |
| Supabase | `zslsosunvsbxxnzeckpg` (compartido con dropshipping y cotizador), schema `sgp` |

## Decisiones

- 2026-10-19 — Rol en `app_metadata.rol = 'taberna'`; proyecto compartido → "logueado" no alcanza.
- 2026-10-19 — Papelera y cancelados no cuentan en reportes; sin borrado físico de ventas.
- 2026-10-19 — Cocina escondida; la cocina trabaja con ticket impreso. Se reactiva en Configuración.
- 2026-10-19 — Impresión por RawBT (comandera WiFi) primero; print server listo para después.
- 2026-10-19 — Estilo Panel con acento naranja Taberna; barra de abajo en celu, menú lateral desde lg.
- 2026-10-19 — Débito y transferencia unificados en Caja ("Déb / Transfer"), como en abril.
- 2026-10-19 — La base arranca de cero (los pedidos viejos eran de prueba).
