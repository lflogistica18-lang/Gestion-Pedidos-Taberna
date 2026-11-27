# DISEÑO — Pagos al personal + logo desde Configuración

> **Estado: APROBADO por Lucas el 2026-11-27** (con sueldo semanal y lo recomendado en las preguntas 2 a 4).
> Este archivo es el contrato de los agentes. Rama: `personal-y-logo` (desde master 27b9537).

## Decisión: va ADENTRO de la app

Entra bien en la estructura, no hace falta armarlo aparte:

- **Mismo usuario y mismo permiso.** La app ya distingue al admin (`sgp.es_taberna()`) del usuario solo pedidos
  (`ventas@`). Lo de sueldos queda solo para el admin, y la base se lo niega a `ventas@` aunque escriba la dirección
  a mano, igual que hoy pasa con Caja.
- **Las piezas de pantalla ya están.** Lista con alta/edición (`CrudManager`), ventanas (`Modal`), etiquetas de estado
  de color (`Pastilla`), tarjetas de números (`KpiCard`, `TarjetaDato`) y avisos (`Toast`).
- **El PDF ya está resuelto en otro proyecto.** depo-track arma PDFs en el navegador y los guarda en la base con su
  historial (`depo-track/src/features/compras/components/pdf/generarPdf.ts`, bucket `compras` en su migración 077).
  Se copia ese molde.

Armarlo aparte implicaría otro login, otra base y otra dirección, para unas pocas empleadas. No conviene.

## Cómo funciona (con un ejemplo)

**Sueldo por semana (cambio de Lucas, 2026-11-27).** Cada empleada tiene su **sueldo semanal** y la cantidad de
días que trabaja por semana. No hay sueldo mensual ni reparto por mes: cada semana se paga su sueldo semanal.

> Ana: $200.000 por semana, trabaja 6 días. Faltó un día y se lo descontás: $200.000 ÷ 6 = $33.333 menos.
> Hizo 3 horas extra a $5.000: $15.000 más. Ese viernes cobra $181.667.

Esa semana se le suman los **extras** (ejemplo: horas extra, presentismo) y se le restan los **descuentos**
(ejemplo: adelanto, faltante de caja). Los tipos de extra y de descuento los configurás vos:

| Ejemplo | Tipo | Cómo se calcula |
|---|---|---|
| Presentismo | extra | % del sueldo semanal (ej. 10 %) |
| Hora extra | extra | $ por unidad × cantidad (ej. $5.000 × 3 h) |
| Adelanto | descuento | monto fijo, lo cargás cada vez |
| Inasistencia | descuento | un día = sueldo semanal ÷ días que trabaja (solo si elegís descontarla) |

**Recibo en PDF por cada pago:** semana (del … al …), sueldo semanal, extras y descuentos uno por uno, y
**a cobrar** en grande. Botón **Compartir** (en el celu abre WhatsApp con el PDF) y **Bajar**.
Queda guardado: se puede volver a abrir cuando quieras.

**Pantalla de revisión:** una tarjeta por empleada con su estado:
- 🟢 **Al día**: están pagadas todas las semanas hasta hoy.
- 🟠 **Semana por pagar**: hay un viernes que ya pasó y no se le pagó.
- 🔵 **Con adelanto**: se le dio un adelanto que todavía no se descontó de ninguna semana.

**Novedades de la empleada:** inasistencia, llegada tarde, "para charlar" u otra, con la fecha y el detalle. Una
inasistencia puede descontarse o no: lo decidís en cada caso, nunca es automático.

**Logo (paso 2):** en Configuración → Local aparece "Logo": subís la imagen y se ve en la entrada, la barra de arriba,
el menú y la pantalla de carga. **El ícono de la app instalada en el celu no se puede cambiar desde la app** (lo
fija el navegador al instalarla), así que igual necesito el archivo una vez para eso (paso 1).

## Lo que necesito que me confirmes (si no decís nada, va lo recomendado)

1. ~~Reparto semanal~~ **DECIDIDO por Lucas:** sueldo semanal fijo por empleada, sin sueldo mensual.
2. **Día de pago:** viernes, configurable. *(Recomendado.)*
3. **Inasistencias:** se descuentan solo si las marcás, y un día vale sueldo semanal ÷ días que trabaja.
   *(Recomendado.)*
4. **Quién ve los sueldos:** todo el que entre con el usuario admin (`jaqui@`). Si la tablet del local queda abierta
   con ese usuario, cualquiera podría ver los sueldos. *(Recomendado: si eso pasa, hacemos un usuario "dueño" aparte;
   si el admin lo usan solo vos y Jaqui, queda como está.)*

---

## Plan técnico (/omni-agregar)

```
PARA AGREGAR: Pagos al personal (empleadas, conceptos configurables, pagos semanales con
              sueldo semanal fijo, recibo PDF guardado, estado de cobro, novedades) + logo desde
              Configuración (paso 2)

REUTILIZO:
  src/shared/components/comunes/CrudManager.tsx → alta/edición de empleadas y de conceptos
  src/shared/components/panel/* (Modal, Pastilla, KpiCard, TarjetaDato, Toast,
    ControlSegmentado, EncabezadoPagina, Campo) → todas las pantallas nuevas
  src/app/RutaAdmin.tsx + navegacion.ts (soloAdmin) → la pantalla solo la ve el admin
  sgp.es_taberna() (migraciones 010/013) → RLS de todas las tablas nuevas y del bucket
  sgp.update_updated_at_column() → trigger de updated_at
  src/modules/config/components/SeccionLocal.tsx + useGuardarSeccion.ts → campo Logo
  depo-track .../pdf/generarPdf.ts (react-pdf con import dinámico + descargar) → se COPIA el
    molde (es otro repo, no se puede importar)
  depo-track 077 (bucket privado, sin UPDATE/DELETE, registrar después de subir) → molde del
    bucket de recibos
  sistema/starter/frontend/src/lib/formato.ts → copia exacta a src/shared/lib/formato.ts
    (pesos, fechaCorta) para el módulo nuevo y el PDF

CREO NUEVO:
  supabase/migrations/015_logo_local.sql (+ .rollback.sql) → columna logo_url y bucket público
    sgp-logo (el login muestra el logo antes de entrar: no puede leer la base)
  supabase/migrations/016_personal.sql (+ .rollback.sql) → tablas sgp.empleados,
    sgp.conceptos_pago, sgp.pagos_personal, sgp.pagos_personal_items, sgp.novedades_personal;
    bucket privado sgp-recibos; todo con RLS solo admin, sin DELETE (se desactiva)
  supabase/pruebas/016_prueba_rls.sql → ventas@ no lee ni escribe nada de personal
  src/modules/personal/** → no existe nada parecido en la app (pantalla, hooks, cálculo, PDF)
  src/modules/personal/lib/calculos.ts + test → sueldo semanal, extras, descuentos, valor del día, estado;
    lógica pura separada de la pantalla para poder probarla
  src/shared/components/LogoLocal.tsx → un solo lugar que decide qué logo mostrar (hoy está
    repetido en 4 pantallas)

REFACTOR PREVIO NECESARIO:
  - El logo fijo está repetido en LoginPage, BarraSuperior, MenuLateral y AuthGuard: se junta
    en LogoLocal.tsx ANTES de hacerlo configurable (lo hace el mismo agente del logo, primer paso).
  - Pesos: la app formatea montos en 2 lugares (graficos.helpers.ts, Receipt.tsx). El módulo
    nuevo usa la copia del starter; Receipt (ticket en uso real) NO se toca ahora.
  - PDF con react-pdf pasa a estar en 3 proyectos (h-Ruta, depo-track, Taberna): toca la regla
    de tres del starter. NO se hace antes: moverlo obliga a tocar h-Ruta y depo-track en
    producción. Queda anotado como pendiente del Omni.

ARCHIVOS QUE VOY A TOCAR:
  base (Sonnet):        supabase/migrations/015_*, 016_*, supabase/pruebas/016_prueba_rls.sql
  pantallas A (Sonnet), logo:
                        src/shared/components/LogoLocal.tsx (nuevo), LoginPage.tsx,
                        BarraSuperior.tsx, MenuLateral.tsx, AuthGuard.tsx, SeccionLocal.tsx,
                        src/shared/lib/config.ts, src/shared/store/useConfiguracion.ts
  pantallas B (Sonnet), personal:
                        src/modules/personal/** (nuevo), src/app/routes.tsx,
                        src/shared/components/navegacion.ts, src/types/database.types.ts,
                        src/shared/lib/formato.ts (copia del starter), package.json
                        (@react-pdf/renderer, vitest), vitest.config.ts
  revisor (Sonnet):     revisa todo contra este diseño + /omni-checkpoint, corre tsc, lint y tests
  deploy (Sonnet):      paso a paso de publicación (migraciones + build en el VPS)
  Yo (fuerte):          reviso las policies línea por línea (el CLAUDE.md del proyecto dice
                        "base, RLS y deploy los hace el orquestador": base escribe, yo reviso
                        y aplico), aplico 015 y 016 en la base y publico, de a uno y con tu OK
  backend: no participa (la app no tiene servidor, todo es navegador + Supabase)
  flujos-n8n: no participa

  Orden: base → (pantallas A y B en paralelo, no comparten archivos) → revisor → staging +
  QA a 390 px (Pedido + completo y un pago de punta a punta) → deploy

RIESGO:
  - La base de Supabase es compartida con dropshipping: todo va en el esquema sgp y los
    buckets con prefijo sgp-. Son tablas nuevas, no cambian las que usa el local hoy.
  - Sueldos a la vista de quien use el usuario admin (ver pregunta 4).
  - react-pdf pesa: se carga solo al apretar "Recibo", no al abrir la app (como en depo-track).
  - Pedido + no se toca, pero se repasa en el celu en el QA (regla después del bug del carrito).
  - Un recibo ya generado no cambia si después editás el sueldo o un concepto: se guarda la
    foto de los números de ese día.
```

---

## Contrato de construcción (lo leen los agentes)

### Esquema (lo escribe `base`; las pantallas lo usan tal cual)

Montos `NUMERIC(12,2)` en pesos, ≥ 0 (igual que `orders.total`). Todo en el esquema `sgp`, RLS con
`(SELECT sgp.es_taberna())` en SELECT/INSERT/UPDATE, sin DELETE (soft delete con `deleted_at`), sin `anon`,
`GRANT` solo a `authenticated`, trigger `sgp.update_updated_at_column()` en las tablas con `updated_at`.

**015_logo_local.sql**
- `sgp.configuracion.logo_url TEXT NULL` (≤ 500).
- Bucket **público** `sgp-logo` (solo imágenes png/jpeg/webp, ≤ 2 MB). Policies en `storage.objects` con nombre
  `sgp_logo_*`: INSERT y UPDATE solo admin, sin DELETE. Lectura: pública por ser bucket público (el login lo muestra
  antes de entrar). La app sube siempre a la ruta fija `actual` (upsert) y guarda en `logo_url` la URL pública + `?v=<epoch>`.

**016_personal.sql**
- `sgp.configuracion.dia_pago SMALLINT NOT NULL DEFAULT 5 CHECK (dia_pago BETWEEN 0 AND 6)` (0 = domingo).
- `sgp.empleados`: `id`, `nombre` (1–60), `telefono` NULL (≤ 40), `sueldo_semanal` NUMERIC ≥ 0,
  `dias_por_semana SMALLINT` 1–7 default 6, `fecha_ingreso DATE` NULL, `notas` NULL (≤ 500), `active BOOLEAN` default
  true, `created_at`, `updated_at`, `deleted_at`.
- `sgp.conceptos_pago`: `id`, `nombre` (1–40), `tipo` `'extra'|'descuento'`, `modo`
  `'fijo'|'porcentaje'|'por_unidad'|'dias_de_sueldo'`, `valor NUMERIC ≥ 0` (monto fijo, % del sueldo semanal o precio
  por unidad; en `dias_de_sueldo` no se usa y vale 0), `active`, timestamps. Semilla (ON CONFLICT DO NOTHING por nombre):
  `Adelanto` (descuento, fijo, 0) e `Inasistencia` (descuento, dias_de_sueldo, 0).
- `sgp.pagos_personal` (una por empleada y semana): `id`, `empleado_id` FK, `semana_desde DATE`, `semana_hasta DATE`
  (= desde + 6), `sueldo_semanal` y `dias_por_semana` (foto del momento), `total_extras`, `total_descuentos`,
  `total_a_cobrar` (los llena un trigger, nunca la pantalla), `estado` `'borrador'|'pagado'`, `pagado_at` NULL,
  `medio_pago` `'efectivo'|'transferencia'` NULL, `recibo_ruta TEXT` NULL, `notas` NULL, timestamps, `deleted_at`.
  Único `(empleado_id, semana_desde)` donde `deleted_at IS NULL`. `total_a_cobrar` puede quedar negativo solo si
  los descuentos superan: CHECK que lo impida (≥ 0) y mensaje claro.
- `sgp.pagos_personal_items`: `id`, `pago_id` FK, `concepto_id` FK NULL, `nombre`, `tipo`, `modo`, `valor` (foto),
  `cantidad NUMERIC > 0` default 1, `monto NUMERIC ≥ 0` (lo calcula la pantalla con `calculos.ts`), `novedad_id` FK NULL,
  `created_at`, `deleted_at`. Trigger: al insertar/actualizar ítems recalcula los totales del pago contando solo los
  que tienen `deleted_at IS NULL`. Quitar un ítem de un borrador = ponerle `deleted_at` (sin DELETE: la verificación
  de la 013 exige que no haya policies DELETE en `sgp`).
- `sgp.novedades_personal`: `id`, `empleado_id` FK, `fecha DATE`, `tipo`
  `'inasistencia'|'llegada_tarde'|'adelanto'|'charla'|'otro'`, `detalle` (≤ 500), `monto` NULL (obligatorio > 0 si
  es adelanto), `descontar BOOLEAN` default false (solo inasistencia), `pago_id` FK NULL (se llena cuando se descuenta
  en un pago), timestamps, `deleted_at`.
- **Candado:** trigger que rechaza cambiar un pago `pagado` y sus ítems, salvo poner `recibo_ruta` cuando estaba NULL.
  Pasar a `pagado` exige `medio_pago`. Al pasar a `pagado` se pone `pagado_at = now()`.
- Bucket **privado** `sgp-recibos` (solo `application/pdf`, ≤ 5 MB). Policies `sgp_recibos_*`: SELECT e INSERT
  solo admin; sin UPDATE ni DELETE. Ruta: `<empleado_id>/<semana_desde>_<pago_id>.pdf`.
- Cada migración termina con la verificación `OK | FALTA` (como 012/013) y tiene su `.rollback.sql`.
- `supabase/pruebas/016_prueba_rls.sql` (molde: `014_prueba_rls.sql`, BEGIN…ROLLBACK): ventas@ (`taberna_pedidos`)
  no lee ni escribe ninguna tabla de personal ni el bucket de recibos; admin sí; el candado de `pagado` funciona;
  los totales del trigger dan bien.
- Regenerar `supabase/instalar_sgp_desde_cero.sql` (001–016 + seed).

### Reglas de cálculo (`src/modules/personal/lib/calculos.ts`, con tests)
- Semana de pago = de `dia_pago − 6` a `dia_pago`. "Semana vencida" = la última que terminó en un día de pago ya pasado
  (el mismo día de pago cuenta como vencida desde las 00:00).
- Monto de un ítem: `fijo` → valor; `porcentaje` → sueldo_semanal × valor / 100; `por_unidad` → valor × cantidad;
  `dias_de_sueldo` → sueldo_semanal / dias_por_semana × cantidad. Redondeo a pesos enteros (`Math.round`).
- Estado por empleada activa: **Semana por pagar** si la semana vencida no tiene pago `pagado`; si no, **Con adelanto**
  si tiene una novedad `adelanto` sin `pago_id`; si no, **Al día**.
- Al armar el pago de una semana se proponen solos: inasistencias de esa semana con `descontar = true` (ítem
  Inasistencia, cantidad = cantidad de faltas) y adelantos sin `pago_id` (ítem Adelanto por su monto). Al marcar pagado,
  esas novedades quedan con `pago_id`.

### Pantallas (`/personal`, solo admin)
- Menú: "Personal" en Gestión, `soloAdmin`, `enBarraInferior: false`. Ruta envuelta en `RutaAdmin`.
- Pestañas: **Semana** (tarjeta por empleada: nombre, sueldo, estado con `Pastilla`, botón "Pagar semana" o "Ver
  recibo"), **Empleadas** (`CrudManager`), **Conceptos** (`CrudManager` + selector de día de pago que guarda con
  `useConfiguracion().guardar({ dia_pago })`).
- Ficha `/personal/:id`: datos, recibos anteriores (abrir el PDF guardado con URL firmada), novedades con alta.
- Pagar semana (Modal): ítems propuestos + agregar concepto (cantidad o monto según modo) + quitar ítem; total en grande;
  "Guardar borrador" y "Marcar pagado" (pide efectivo/transferencia). Al marcar pagado: arma el PDF, lo sube a
  `sgp-recibos`, guarda `recibo_ruta` y ofrece **Compartir** (`navigator.share` con el archivo si `canShare`) y **Bajar**.
  Si el PDF falla, el pago queda pagado y se ofrece "Generar recibo" de nuevo (nunca falla en silencio).
- PDF con `@react-pdf/renderer` por import dinámico (molde `depo-track/src/features/compras/components/pdf/generarPdf.ts`),
  fuente Helvetica de base (sin archivos de fuentes). Contenido: nombre del local, empleada, semana del … al …, sueldo,
  extras y descuentos uno por uno, **A cobrar** grande, medio de pago, fecha.
