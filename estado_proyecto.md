# Estado del Proyecto

## Proyecto: SGP — Gestión de Pedidos La Taberna
## Ultima actualizacion: 2026-10-19
## Version Omni: v7.2
## Starter: no aplica (proyecto anterior al Omni, sin backend; ver CLAUDE.md "Omni")

> **Este archivo gana sobre cualquier otro documento del proyecto** (`.planning/STATE.md`,
> `AUDITORIA-OMNI-2026-10-19.md`, `docs/notas/estilo-panel.md` son vistas derivadas). El bloque
> de abajo se REESCRIBE al cerrar cada sesión.

---

## DÓNDE QUEDAMOS — leer primero al retomar (maximo 40 lineas)

**Fase actual:** 6 — Puesta en marcha en producción (todo el código listo; falta levantarlo).
**Lo ultimo que se hizo (2026-10-19, todo en `master` desde el PR #1, mergeado 2026-10-20):**
auditoría Omni (53/100) + remediación; Cocina escondida y ticket automático; print server;
estilo Panel naranja en todas las pantallas; pantalla Configuración; script único de base
probado en Postgres local (encontró y arregló 2 bugs de la 010); compose detrás del proxy.
**Proximo paso concreto:** seguir `docs/PUESTA-EN-MARCHA.md` desde la compu, en orden:
1. Supabase `zslsosunvsbxxnzeckpg`: crear usuario de la caja → correr
   `supabase/instalar_sgp_desde_cero.sql` (OK ×3) → Exposed schemas incluye `sgp`.
2. DuckDNS: **mismo nombre** `pedidostaberna` → IP 187.77.247.24 (Lucas lo mantiene).
3. VPS `/root/Gestion-Pedidos-Taberna`: `git pull` en `master`, `docker build -t sgp-taberna:latest`,
   `docker-compose up -d` (NUNCA `--force-recreate`), curl 127.0.0.1:8090 → 200.
4. Proxy (`panel-lucas.duckdns.org`): host `pedidostaberna` → `sgp-taberna-front:80`, Let's
   Encrypt + Force SSL.
5. Primer uso: Configuración (local, papel 80 mm), productos reales, PWA en el celu, RawBT.
Lo puede hacer Lucas a mano o una sesión de Claude **en su compu** (desde la nube no hay acceso
al VPS ni a Supabase).
**Bloqueantes:** ninguno de código.
**Pendientes del dueño:**
- Comprar la comandera WiFi 80 mm (ESC/POS, USB+Ethernet+WiFi) e instalar RawBT en el celu.
**Avisos:**
- La base vieja de la Taberna estaba en `papelera_sgp` (limpieza 2026-10-07); los datos eran de
  prueba y el script la borra. El schema `papelera` (chatbot RAG, CRM, etc.) lo borró Lucas;
  no se recupera (decidido: no importa).
- `.env` sigue versionado (anon key pública por diseño); sacarlo exige ajustar el deploy.
- Todo se verificó con arnés y mocks: nunca se vio con datos reales.

---

## Fases

| Fase | Estado | Fecha completada | Notas |
|------|--------|-----------------|-------|
| 1-5 Roadmap GSD (POS, KDS, productos, reportes) | hecho | 2026-04-20 | `.planning/ROADMAP.md` |
| Auditoría Omni + remediación | hecho | 2026-10-19 | `AUDITORIA-OMNI-2026-10-19.md` |
| Impresión (ticket 80 mm, RawBT, print server) | hecho (sin hardware) | 2026-10-19 | `print-server/README.md` |
| UI estilo Panel | hecho | 2026-10-19 | `docs/notas/estilo-panel.md` |
| Configuración | hecho | 2026-10-19 | migración 012 |
| 6 - Deploy producción | pendiente | | `docs/PUESTA-EN-MARCHA.md` |
| 7 - Explicación (/omni-explicar) + operación | pendiente | | |

## Migraciones

| Migración | Qué | Aplicada en prod |
|---|---|---|
| 001–009 | Esquema original | sí (abril) — luego movida a `papelera_sgp` |
| 010 | RLS por rol `taberna`, sin anon ni DELETE, columnas faltantes, `renombrar_categoria` | **no** |
| 011 | Cola de impresión `print_jobs` | **no** |
| 012 | `configuracion` (una fila) | **no** |
| `instalar_sgp_desde_cero.sql` | 001–012 + seed en una transacción | **no** — es lo que se corre |

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
