# Estado del Proyecto

## Proyecto: SGP — Gestión de Pedidos La Taberna
## Ultima actualizacion: 2026-11-25
## Version Omni: v7.2
## Starter: no aplica (proyecto anterior al Omni, sin backend; ver CLAUDE.md "Omni")

> **Este archivo gana sobre cualquier otro documento del proyecto** (`.planning/STATE.md`,
> `AUDITORIA-OMNI-2026-10-19.md`, `docs/notas/estilo-panel.md` son vistas derivadas). El bloque
> de abajo se REESCRIBE al cerrar cada sesión.

---

## DÓNDE QUEDAMOS — leer primero al retomar (maximo 40 lineas)

**Fase actual:** 8 cerrada EN PRODUCCIÓN `e7e4919` (PR #9, 2026-11-25). Sigue: primer uso real en el local y, cuando haya
impresora WiFi, la impresión directa (sección "Impresión directa" abajo). master solo recibe por PR (hook): Lucas hace el Merge.
**Lo que quedó en producción en la sesión del 2026-11-25 (PRs #2 a #9, cada uno con copia `sgp-taberna:anterior-<commit>`):**
- **Impresión por aparato (PROVISORIO-WIFI):** Configuración → Impresión → "¿Este aparato imprime?" (`localStorage`). En "No"
  (celu/tablet) el ticket va a `sgp.print_jobs`; la compu lo ve en la franja "Para imprimir". Al cerrarse el cuadro de imprimir la
  app pregunta "¿Salió el ticket?" (también en pedidos tomados en la compu); No/cerrar = queda pendiente. Anulado sale de la lista.
- **Roles:** `taberna` (admin) y `taberna_pedidos` (solo Pedido + e Historial; usuario `ventas@lataberna.com`). Migración 013.
- **Pedido + y Productos:** desde md, categorías como tarjetas con dibujo → lista → "Todas las categorías"; resumen del pedido
  siempre a la derecha (opción B: ítem naranja suave, cantidad en círculo). En celu: pastillas que se esconden al elegir una
  categoría (cabecera compacta con "Todas"). Menú lateral recogible. Dibujos propios (Gemini, solo texto): `docs/ICONOS-CATEGORIAS.md`.
- **Editar y anular desde Pedidos:** mismo pedido y número; RPC `sgp.editar_pedido` / `sgp.anular_pedido` (precio lo pone la base,
  historial en `sgp.order_edits` solo admin, anular pide motivo y guarda quién). Ticket editado sale con "PEDIDO MODIFICADO"
  (único cambio a `Receipt.tsx`, con permiso de Lucas). Migración 014. La lista de Pedidos muestra el último primero.
- **PWA:** se actualiza sola (`shared/lib/actualizarApp.ts`), carrito en `sessionStorage`, orientación libre, nginx sin caché en
  index/sw. Pedido nuevo arranca en Local; Delivery exige nombre y dirección. Ticket a 22 px.
**Proximo paso concreto:**
1. Prueba real en el local: "No" en celu y tablet, un pedido de cada aparato, editar uno, anular uno, mirar los tickets en papel
   (22 px y "PEDIDO MODIFICADO"). Nada de la sesión se probó con impresora ni aparatos reales: todo fue Chromium + base simulada.
2. Lucas: cambiar la contraseña de `ventas@lataberna.com` (quedó a la vista en una captura del chat).
3. Impresora WiFi elegida → modo "RawBT directo" y sacar lo `PROVISORIO-WIFI` (`grep -rn PROVISORIO-WIFI src`).
4. Logo (Lucas lo pasa), margen (charlar), deuda `useDashboardStats` (máx. 1000 pedidos).
**Bloqueantes:** ninguno.
**Pendientes del dueño:** contraseña de ventas@; elegir impresora (WiFi, Android); logo; borrar los SVG Fluent sin uso de
`public/iconos-categorias/` (el agente tiene `rm` denegado); quitar la credencial de `api.supabase.com` del entorno de la nube.
**Avisos:**
- **Regresión de la sesión (arreglada en `009c801`):** al refactorizar `pos-page.tsx` se perdió la suscripción a los ítems y en celu
  no aparecía la barra "Ver pedido". Todo QA de Pedido + incluye SIEMPRE "cargar un pedido nuevo en 390 px y ver la barra".
- QA: scripts de Playwright con Supabase mockeado en el scratchpad de la sesión (no versionados); se rehacen leyendo los hooks.
- La base es compartida y gratis (`zslsosunvsbxxnzeckpg`): un bucle de consultas tira abajo dropshipping y el cotizador. Ante
  "no deja entrar", mirar primero la salud del proyecto. Un pedido de prueba es un pedido real: anularlo después.
- La Caja cuenta desde que se confirma (Lucas: lógico sería al entregar; "de momento" queda así).
- Staging: `/root/Gestion-Pedidos-Taberna-staging`, contenedor `sgp-taberna-staging` (apagado, puerto 8092, sin dominio); sirve
  para probar `nginx -t` y builds. El VPS usa `docker compose` v2. Deploy = tag de copia + pull + build --no-cache + up -d.
- Deuda: producto desactivado puede quedar en un carrito guardado; alta de producto no preelige la categoría abierta.

---

## Impresión directa — pendiente para cuando haya impresora WiFi

A, B y C de los pedidos del 2026-11-25 (rol solo pedidos, barra recogible, pantalla de tablet) están HECHOS y en producción.
**D. Confirmar = imprimir directo**, sin el diálogo: mandar el ticket a RawBT por intent/URL `rawbt:` (reusar el ESC/POS de
`print-server/src/escpos.ts` + `ticket.ts`). RawBT es **solo Android**. Tercer valor de la opción por aparato.
**E. Decidido con Lucas:** una impresora WiFi en cocina para empezar (Bluetooth conecta de a un aparato); dos impresoras a la
vez = botón "copia para caja" más adelante; impresión central (print server arreglado) solo si en el uso real se pierden tickets.
El print server sigue retirado (usuario `impresion@lataberna.com` baneado; no arreglar `cola.ts` salvo pedido).

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
| Impresión (ticket 80 mm, RawBT, print server) | print server retirado (tiró la base); va Bluetooth + RawBT | 2026-11-21 | `print-server/README.md` |
| UI estilo Panel | hecho | 2026-10-19 | `docs/notas/estilo-panel.md` |
| Configuración | hecho | 2026-10-19 | migración 012 |
| 6 - Deploy producción | hecho (falta primer uso) | 2026-10-20 | `docs/PUESTA-EN-MARCHA.md` |
| 7 - Cambios de Lucas (menú, reporte, lista de productos) | hecho (logo y margen pasan a pendientes) | 2026-10-20 | "Pedidos de Lucas" abajo |
| 8 - Tablet, roles, impresión por aparato, editar/anular, PWA | hecho (falta primer uso real) | 2026-11-25 | PRs #2–#9 |
| 9 - Impresión directa por WiFi (RawBT) | pendiente (falta impresora) | | sección "Impresión directa" |
| 10 - Explicación (/omni-explicar) + operación | pendiente | | |

## Migraciones

| Migración | Qué | Aplicada en prod |
|---|---|---|
| 001–009 | Esquema original | sí (abril) — luego movida a `papelera_sgp` |
| 010 | RLS por rol `taberna`, sin anon ni DELETE, columnas faltantes, `renombrar_categoria` | sí (vía script, 2026-10-20) |
| 011 | Cola de impresión `print_jobs` | sí (vía script, 2026-10-20) |
| 012 | `configuracion` (una fila) | sí (vía script, 2026-10-20) |
| 013 | Rol `taberna_pedidos` (`es_personal`, `es_solo_pedidos`, 13 policies) | sí (2026-11-25, `supabase-sql.sh -f`) |
| 014 | Editar y anular pedido (`editar_pedido`, `anular_pedido`, `order_edits`, 4 columnas en `orders`) | sí (2026-11-25, `supabase-sql.sh -f`) |
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
- 2026-11-21 — Print server retirado (su bucle de reconexión tiró la base compartida); impresión con comandera Bluetooth + RawBT. Usuario de impresión baneado.
- 2026-11-21 — Ticket: productos y notas a 22 px (lo que lee la cocina); el resto igual.
- 2026-11-25 — master solo por PR; el agente deja la rama y Lucas hace el Merge. Base y deploy: el orquestador, con OK de Lucas.
- 2026-11-25 — Editar un pedido = modificar ese mismo pedido (no reemplazarlo); solo mientras no esté entregado.
- 2026-11-25 — El rol solo pedidos puede editar y anular (con motivo y registro), pero no anular un entregado.
- 2026-11-25 — Dibujos de categoría propios, generados solo desde texto; nunca capturas de bancos de imágenes.
- 2026-11-25 — En celu, Pedido + y Productos siguen con pastillas (no tarjetas); las tarjetas son desde 768 px.
