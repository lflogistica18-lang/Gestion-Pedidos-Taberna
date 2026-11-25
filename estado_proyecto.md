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

**Fase actual:** 7 — Cambios de Lucas. Impresión: se abandona el print server; va **comandera Bluetooth + RawBT**.
**Lo ultimo que se hizo (2026-11-21/25, sesión en la nube):**
- **Caída de Supabase (20/11 → 21/11):** el proyecto compartido (`Sales Chatbot RAG`) quedó "No
  saludable" (base, login, REST). Causa: `ImpresoraTaberna.exe` (UA `Bun/1.4.3`) hacía ~13 consultas
  por minuto: ~9.000 de ~9.500 pedidos HTTP diarios. Bug en `print-server/src/cola.ts`: `suscribir()`
  hace `removeChannel` del canal viejo, eso dispara `CLOSED` en su callback y agenda otra
  suscripción a los 5 s → bucle infinito, con `procesarPendientes()` en cada `SUBSCRIBED`.
  Empezaba cada día cerca de las 7 h, al prender la compu.
- Arreglo (con OK de Lucas): restart del proyecto por la Management API; `banned_until = 2999` para
  `impresion@lataberna.com`; `sgp.configuracion.modo_impresion = 'navegador'`. Todo sano, sin trabajos pendientes.
- Mientras no llegue la Bluetooth: desde la compu, al confirmar se abre el diálogo de imprimir (USB);
  desde el celu, Cancelar y reimprimir con 🖨️ en la compu. El mensaje para la empleada ya se mandó.
- **Ticket más grande (SIN SUBIR a prod):** `src/index.css` (`@media print`): cantidad + producto en
  22 px negrita; notas en 22 px sin negrita; columnas 12/66/22 %; 58 mm → 18 px. El resto sin tocar.
  Captura `ticket-prueba-22px.png` (no versionada). Los nombres largos (49 letras) ocupan 4–5 renglones.
**Proximo paso concreto:**
1. Lucas decide sobre el ticket: 22 px tal cual / acortar nombres largos en Productos (lo recomendado)
   / bajar a 18 px. Después, deploy desde su compu (comando de CLAUDE.md).
2. Llega la comandera Bluetooth (80 mm, ESC/POS) → RawBT en el celu de ella, emparejar, probar
   un pedido (modo `navegador`, ya activo).
3. El print server queda retirado: no arreglar `cola.ts` salvo que se pida. Para reactivarlo:
   arreglar el bucle, desbanear el usuario y volver `modo_impresion` a `servidor`.
4. Logo, margen y deuda de `useDashboardStats` (1000 pedidos): siguen como estaban.
**Bloqueantes:** ninguno.
**Pendientes del dueño:**
- **Borrar el token `diagnostico-claude`** en Supabase (Account preferences → Access Tokens) y quitar
  la credencial de `api.supabase.com` del entorno de la nube.
- Comprar la comandera Bluetooth. Pasar el logo de la Taberna.
**Avisos:**
- La base es compartida y gratis: cualquier app que consulte en bucle tira abajo a las otras.
  Ante "no deja entrar": revisar la salud del proyecto antes que el VPS.
- Nuevos usuarios de la caja: rol con `UPDATE auth.users ...` (ver abajo). Salir y volver a entrar.
- El VPS levanta con `docker compose` (plugin v2), no `docker-compose` v1 como dice CLAUDE.md.

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
- 2026-11-21 — Print server retirado (su bucle de reconexión tiró la base compartida); impresión con comandera Bluetooth + RawBT. Usuario de impresión baneado.
- 2026-11-21 — Ticket: productos y notas a 22 px (lo que lee la cocina); el resto igual.
