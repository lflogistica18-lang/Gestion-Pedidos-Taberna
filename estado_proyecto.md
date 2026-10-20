# Estado del Proyecto

## Proyecto: SGP — Gestión de Pedidos La Taberna
## Ultima actualizacion: 2026-10-20
## Version Omni: v7.2
## Starter: no aplica (proyecto anterior al Omni, sin backend; ver CLAUDE.md "Omni")

> **Este archivo gana sobre cualquier otro documento del proyecto** (`.planning/STATE.md`,
> `AUDITORIA-OMNI-2026-10-19.md`, `docs/notas/estilo-panel.md` son vistas derivadas). El bloque
> de abajo se REESCRIBE al cerrar cada sesión.

---

## DÓNDE QUEDAMOS — leer primero al retomar (maximo 40 lineas)

**Fase actual:** 6 — Puesta en marcha: pasos 1–4 hechos, la app anda en producción. Sigue el
**paso 5 (primer uso)** y después la **Fase 7: cambios de Lucas** (lista abajo).
**Lo ultimo que se hizo (2026-10-20, sesión local con la llave SSH):**
- Pasos 1 (Supabase, rol a `jaqui@lataberna.com`) y 2 (DuckDNS → 187.77.247.24) ✅ antes.
- Paso 3 VPS ✅: `sgp-taberna-front` corre desde `master`, en `red-proxy`, bundle con la URL de
  Supabase. Dos arreglos en el camino: `98c07ad` `react-is` como dependencia directa (recharts 3
  lo pide como peer y el Dockerfile usa `--legacy-peer-deps`) y `65c8636` sin `ARG/ENV
  VITE_SUPABASE_*` en el Dockerfile (vacías pisaban el `.env` → "Faltan variables" al abrir).
- Paso 4 Proxy ✅: Lucas apuntó el host de NPM a `sgp-taberna-front:80` (estaba en el viejo
  `187.77.247.24:8090` → 502). `https://pedidostaberna.duckdns.org` → 200 y "cargó perfecto".
- Impresora que YA tiene el local: **Nictom IT03**, 80 mm, cortador automático, con cable. No hay
  ficha pública: falta ver atrás si tiene puerto de red (RJ45) o solo USB.
**Proximo paso concreto:**
1. Impresora: con RJ45 → al router, autotest (FEED al prender) para la IP, RawBT red 9100. Solo
   USB → RawBT por USB con adaptador OTG desde el celu (el `print-server` hoy solo habla por red).
   En los dos casos NO hace falta comprar la comandera WiFi.
2. Primer uso: Configuración (local, papel 80 mm), productos reales, instalar la PWA en el celu.
3. Fase 7: arrancar por la lista "Pedidos de Lucas" (abajo). Charlar primero el margen.
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

Anotados tal como los dijo, después de ver la app andando. Nada de esto está hecho.

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
| 7 - Cambios de Lucas (menú, reporte, lista de productos, logo, margen) | pendiente | | "Pedidos de Lucas" arriba |
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
