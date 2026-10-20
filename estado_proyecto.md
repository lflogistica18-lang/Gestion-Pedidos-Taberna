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

**Fase actual:** 6 — Puesta en marcha en producción. Pasos 1, 2 y 3 hechos; sigue el **paso 4 (proxy)**.
**Lo ultimo que se hizo (2026-10-20, sesión local con la llave SSH):**
- Pasos 1 (Supabase, rol a `jaqui@lataberna.com`, script OK) y 2 (DuckDNS → 187.77.247.24) ✅ antes.
- Paso 3 VPS ✅: `sgp-taberna-front` corre desde `master` (`65c8636`), `curl 127.0.0.1:8090` → 200,
  está en `red-proxy` y el bundle trae la URL de Supabase. Hubo dos arreglos en el camino:
  - `98c07ad` `react-is` como dependencia directa (recharts 3 lo pide como peer y el Dockerfile
    instala con `--legacy-peer-deps`, que no instala peers → el build fallaba).
  - `65c8636` sacadas las `ARG/ENV VITE_SUPABASE_*` del Dockerfile: sin `--build-arg` quedaban
    vacías y pisaban el `.env` → el bundle salía sin URL ("Faltan variables" al abrir).
- Paso 4: el host `pedidostaberna.duckdns.org` YA existe en NPM con SSL válido, pero apunta al
  destino viejo `187.77.247.24:8090` → **502** (el 8090 ahora escucha solo en 127.0.0.1).
  Desde NPM, `http://sgp-taberna-front:80` responde 200.
**Proximo paso concreto:** `docs/PUESTA-EN-MARCHA.md`
4. Panel `https://panel-lucas.duckdns.org` → Proxy Hosts → `pedidostaberna.duckdns.org` → Edit →
   Forward Hostname `sgp-taberna-front`, Forward Port `80`, scheme `http` → Save. Abrir
   `https://pedidostaberna.duckdns.org` → pantalla de login.
5. Primer uso: entrar con jaqui, Configuración (local, papel 80 mm), productos reales, PWA, RawBT.
Una sesión en la nube NO llega al VPS (sin llave, puerto 22 cerrado): deploys desde la compu.
**Bloqueantes:** ninguno conocido.
**Pendientes del dueño:**
- Comprar la comandera WiFi 80 mm (ESC/POS, USB+Ethernet+WiFi) e instalar RawBT en el celu.
- Opcional: placeholder del login (`usuario@sgc-taberna.com`) y textos del script → `@lataberna.com`.
**Avisos:**
- Nuevos usuarios de la caja: darles el rol con el `UPDATE auth.users ... WHERE email = '...'`
  (el script solo cubre `@sgc-taberna.com`). Salir y volver a entrar para que el rol llegue al token.
- El SQL Editor de Supabase solo muestra el resultado de la última sentencia.
- `.env` sigue versionado (anon key pública por diseño); sacarlo exige ajustar el deploy.
- La app todavía no se probó en el navegador contra la base real (falta el paso 4).

---

## Fases

| Fase | Estado | Fecha completada | Notas |
|------|--------|-----------------|-------|
| 1-5 Roadmap GSD (POS, KDS, productos, reportes) | hecho | 2026-04-20 | `.planning/ROADMAP.md` |
| Auditoría Omni + remediación | hecho | 2026-10-19 | `AUDITORIA-OMNI-2026-10-19.md` |
| Impresión (ticket 80 mm, RawBT, print server) | hecho (sin hardware) | 2026-10-19 | `print-server/README.md` |
| UI estilo Panel | hecho | 2026-10-19 | `docs/notas/estilo-panel.md` |
| Configuración | hecho | 2026-10-19 | migración 012 |
| 6 - Deploy producción | en curso (base, DNS y VPS hechos; falta proxy) | | `docs/PUESTA-EN-MARCHA.md` |
| 7 - Explicación (/omni-explicar) + operación | pendiente | | |

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
