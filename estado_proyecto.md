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

**Fase actual:** 8 cerrada y EN USO REAL en el local (app en producción `e7e4919`, PR #9). Lucas confirmó el 2026-11-25:
"todo funciona". **SIGUE: cargar el logo de la Taberna** (sección "Logo — próximo paso", abajo).
**Cómo está funcionando hoy (verificado en la base el 2026-11-25):**
- **Impresión automática por la compu:** `modo_impresion = 'servidor'`. Los celus y la tablet confirman y el ticket sale solo.
  El programita `ImpresoraTaberna.exe` se rehízo sin tiempo real (en master, PR #10): un solo ciclo que pregunta cada 4 s
  y, si algo falla, espera 5 s → 5 min; ver `print-server/README.md` "Por qué no usa tiempo real". Usuario
  `impresion@lataberna.com` desbloqueado.
- **Ticket del programita con letra grande (2026-11-27, instalado en el local, Lucas: "sale bien"):** productos, tipo,
  cliente, dirección y notas en doble alto + negrita, y "PEDIDO MODIFICADO" si el pedido fue editado. La comandera acepta
  el doble alto solo. Rama `ticket-programita-letra-grande` (**sin Merge**), exe `ImpresoraTaberna-letra-grande.exe`.
- En modo `servidor` quedan dormidos (siguen en el código para el modo `navegador`): la opción "¿Este aparato imprime?", la franja
  "Para imprimir" y la pregunta "¿Salió el ticket?" (`PROVISORIO-WIFI`). Vuelta atrás: Configuración → Impresión → navegador.
- **Roles:** `taberna` (admin, jaqui@) y `taberna_pedidos` (ventas@: solo Pedido + e Historial). Migraciones 013 y 014 aplicadas.
- **Pedido + y Productos:** tarjetas de categoría con dibujos propios desde md; pastillas que se esconden en celu; resumen a la
  derecha (opción B); menú recogible. **Pedidos:** último primero, Editar (mismo pedido, ticket "PEDIDO MODIFICADO") y Anular
  con motivo, por RPC. **PWA** se actualiza sola; pedido nuevo en Local; Delivery exige nombre y dirección; ticket a 22 px.
**Proximo paso concreto:**
1. **Logo** (lo pidió Lucas el 2026-11-25): ver la sección de abajo. Falta que Lucas pase el archivo.
2. Merge de `ticket-programita-letra-grande` (código del programita + este estado): no cambia la app publicada ni pide
   deploy, es para que master tenga lo que ya corre en el local. Link: `.../compare/master...ticket-programita-letra-grande`.
3. Lucas: cambiar la contraseña de `ventas@lataberna.com` (quedó a la vista en una captura del chat).
4. Margen (charlar); deuda `useDashboardStats` (máx. 1000 pedidos); Caja: ¿contar al entregar? ("de momento" al confirmar).
5. Impresión directa RawBT/WiFi: ya no urge (la compu imprime sola); se retoma si compran impresora WiFi.
**Bloqueantes:** ninguno.
**Pendientes del dueño:** pasar el logo; Merge del punto 2; contraseña de ventas@; borrar los SVG Fluent sin uso de
`public/iconos-categorias/` (el agente tiene `rm` denegado); quitar la credencial de `api.supabase.com` del entorno de la nube.
**Avisos:**
- **Vigilar la salud de la base** los primeros días con el programita nuevo: es compartida y gratis (`zslsosunvsbxxnzeckpg`) y el
  viejo la tiró el 20/11. Ante "no deja entrar" o lentitud: cerrar la ventana del programita y pasar a modo navegador.
- `PRUEBA-HOY.md` y `PASOS-PARA-ELLA.md` (raíz, sin versionar): pasos que usó Lucas para reinstalar el programita. Son suyos.
- Regresión arreglada en `009c801`: todo QA de Pedido + incluye "cargar un pedido nuevo a 390 px y ver la barra Ver pedido".
- master solo por PR (hook): rama → link compare → Merge de Lucas → deploy a mano (tag `sgp-taberna:anterior-<commit>` + pull +
  build --no-cache + `docker compose up -d`). Staging apagado en el VPS (`sgp-taberna-staging`, 8092) para probar builds y nginx.
- Un pedido de prueba es un pedido real: anularlo después. Deuda: producto desactivado puede quedar en un carrito guardado;
  alta de producto no preelige la categoría abierta.
---

## Logo — próximo paso

Pedido de Lucas (2026-11-25): "cargar el logo de la Taberna para que se vea ese logo". Hoy la app muestra un archivo fijo,
`public/logo-taberna.png` (396 KB, pesado; no es un PNG estándar), en: login, barra superior, menú lateral, pantalla de carga
(`AuthGuard`) y el ícono de la pestaña (`index.html`). El ícono de la app instalada son `public/icons/icon-192x192.png` y
`icon-512x512.png`. El ticket NO lleva logo.
**Paso 1 (rápido, sin base):** Lucas pasa el archivo (ideal: PNG cuadrado, fondo transparente, 512 px o más) → generar las
versiones livianas (logo ~128/256 px, íconos 192 y 512, favicon) → reemplazar esos archivos → PR → deploy. Revisar cómo queda
sobre el menú oscuro, la barra clara y el login; y que la app instalada tome el ícono nuevo (puede pedir reinstalar el acceso directo).
**Paso 2 (después, si lo quiere):** cargarlo desde Configuración → Local: bucket de Supabase Storage + columna `logo_url` en
`sgp.configuracion` (sería la migración 015), con RLS por rol admin. Solo si Lucas quiere poder cambiarlo él mismo.

---

## Impresión directa — solo si compran impresora WiFi

A, B y C de los pedidos del 2026-11-25 (rol solo pedidos, barra recogible, pantalla de tablet) están HECHOS y en producción.
**D. Confirmar = imprimir directo**, sin el diálogo: mandar el ticket a RawBT por intent/URL `rawbt:` (reusar el ESC/POS de
`print-server/src/escpos.ts` + `ticket.ts`). RawBT es **solo Android**. Tercer valor de la opción por aparato.
**E. Decidido con Lucas:** una impresora WiFi en cocina para empezar (Bluetooth conecta de a un aparato); dos impresoras a la
vez = botón "copia para caja" más adelante; impresión central (print server arreglado) solo si en el uso real se pierden tickets.
Desde el 2026-11-25 el print server volvió a servicio, rehecho sin tiempo real (ver DÓNDE QUEDAMOS).

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
| 9 - Logo de la Taberna | SIGUIENTE (falta el archivo) | | sección "Logo — próximo paso" |
| — Impresión directa por WiFi (RawBT) | en espera (la compu ya imprime sola) | | sección "Impresión directa" |
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

- 2026-11-25 — Vuelve la impresión automática por la compu (print server sin tiempo real); el modo navegador queda de respaldo.
