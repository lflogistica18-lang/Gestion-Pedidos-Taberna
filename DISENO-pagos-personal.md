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

---

## Corregir errores: anular pagos y borrar empleadas (aprobado por Lucas 2026-11-27)

**Qué pidió Lucas:** "precisamos que pueda editarlos y borrarlos por si se equivoca", con soft delete.
**Decisión aprobada:** un pago pagado NO se edita (el PDF ya salió por WhatsApp): se **anula con motivo** y la semana
vuelve a "por pagar" para rehacerlo. Igual que Anular pedido (014). Nada se borra de verdad.

Ejemplo: Ana cobró $181.667 pero eran 2 horas extra, no 3. Jaqui abre la ficha de Ana → Recibos → **Anular** → motivo
"eran 2 horas extra" → la semana de Ana vuelve a "Semana por pagar", la inasistencia vuelve a aparecer sola, carga 2 horas
→ $176.667 → Marcar pagado → recibo nuevo. En la ficha quedan los dos: el viejo con sello **ANULADO** y el motivo.

### Contrato — base (migración `017_anular_pago_personal.sql` + rollback + casos en `supabase/pruebas/017_prueba.sql`)
- `sgp.pagos_personal`: `estado` admite `'anulado'`; columnas nuevas `anulado_at TIMESTAMPTZ`, `anulado_motivo TEXT`
  (CHECK: si estado='anulado' → motivo con 3 a 200 caracteres sin espacios de borde y anulado_at no nulo).
- Índice único `(empleado_id, semana_desde)` pasa a `WHERE deleted_at IS NULL AND estado <> 'anulado'` (así se rehace la semana).
- Candado: `pagado → anulado` es la ÚNICA transición permitida desde pagado (además de la de recibo_ruta que ya existe);
  solo pueden cambiar `estado`, `anulado_motivo`, `anulado_at` (lo fija el trigger con now()) y `updated_at`.
  Un pago `anulado` no se toca nunca más. `borrador → anulado` no se permite (el borrador se descarta con `deleted_at`).
  Un pago pagado o anulado no admite `deleted_at`.
- Totales: no se recalculan si OLD.estado es pagado o anulado. Ítems: candado también para pagos anulados.
- RPC `sgp.anular_pago_personal(p_pago_id UUID, p_motivo TEXT) RETURNS sgp.pagos_personal`, SECURITY INVOKER,
  `search_path=''`, solo `es_taberna()` (si no, error en castellano): pasa el pago a anulado y libera sus novedades
  (`UPDATE sgp.novedades_personal SET pago_id = NULL WHERE pago_id = p_pago_id`), en una sola transacción.
  GRANT EXECUTE a authenticated, REVOKE a anon/PUBLIC.
- `sgp.empleados`: poner `deleted_at` ("Borrar empleada") solo si no tiene pagos en estado `pagado` (los anulados no
  cuentan); si tiene → error "Esta empleada tiene pagos hechos: usá Dar de baja para guardar su historial." (trigger).
- Sin DELETE, sin policies nuevas salvo que hagan falta; RLS igual que 016. Verificación final `OK | FALTA`.
  Regenerar `supabase/instalar_sgp_desde_cero.sql` (001–017 + seed).

### Contrato — pantallas (`src/modules/personal/**`, `src/types/database.types.ts`)
- Tipos: `EstadoPago` suma `'anulado'`; `anulado_at`, `anulado_motivo` en `PagoPersonal`; RPC en `Functions`.
- Ficha de la empleada (`ListaRecibos`): muestra pagados y anulados; el anulado con `Pastilla` "Anulado", el motivo y la
  fecha, el PDF se sigue pudiendo abrir. Cada pagado tiene botón **Anular** → Modal con motivo obligatorio (3–200) y el
  aviso "La semana vuelve a quedar por pagar. El recibo queda guardado como anulado." → llama la RPC → toast y recarga.
- Semana (`usePersonalSemana` + `calculos.ts`): los anulados no cuentan (ni estado, ni "Pagadas", ni "Total pagado").
  Test nuevo en `calculos.test.ts` para eso.
- Pagar semana: si existe un borrador, botón **Descartar borrador** con confirmación (pone `deleted_at` al pago y a sus ítems).
- Empleada: botón **Borrar empleada** (en la ficha, variante peligro, con confirmación "Solo para cargas por error").
  Si la base responde el error de pagos hechos, se muestra tal cual. Al borrar vuelve a `/personal`.
- Errores siempre visibles (`EstadoError`/`mostrarToast`), estilo Panel, 44 px, probado a 390 px.

### Orden
`base` y `pantallas` en paralelo (la firma de la RPC y las columnas están fijadas arriba) → `revisor` → el orquestador
aplica 017 con backup y prueba → Merge de Lucas → publicar con su OK. Los datos de "Prueba" los borra Lucas desde la app.

---

## Medio de pago: adelantos y pago dividido (aprobado por Lucas 2026-11-28)

**Qué pidió Lucas:** "el pago al personal puede ser mediante transferencia o efectivo, los adelantos también", y
"dividir el restante: le quedan 180 mil de los 20 mil de adelanto y se le paga 100 por transferencia y 80 en efectivo".
**Decisión de Lucas:** se cargan **los dos montos** a mano y la app **no bloquea** si no suman el total: avisa
"cobra $X de más / de menos" y deja marcar pagado igual (sirve para redondeos y pagos de más).

Ejemplo: Ana, sueldo $200.000. El martes 24/11 se le transfieren $20.000 → novedad Adelanto, **Transferencia**
(obligatorio). El viernes el pago propone "Adelanto 24/11 · Transferencia −$20.000" → a cobrar **$180.000**. Se cargan
Transferencia $100.000 y Efectivo $90.000 → aviso ámbar "Cobra $10.000 de más que lo calculado" → Marcar pagado deja.
El recibo dice lo calculado, lo pagado por cada medio y la diferencia.

Fuera de alcance: lo pagado de más o de menos **no se arrastra** a la semana siguiente (si hace falta, se carga a mano,
p. ej. como adelanto). Un adelanto es una sola entrega: un solo medio. Los pagos y adelantos ya cargados no cambian.

### Contrato — base (`supabase/migrations/018_medio_pago_personal.sql` + `.rollback.sql` + `supabase/pruebas/018_prueba.sql`)
- `sgp.novedades_personal.medio_pago TEXT NULL`, CHECK `medio_pago IS NULL OR medio_pago IN ('efectivo','transferencia')`
  y CHECK `tipo = 'adelanto' OR medio_pago IS NULL`. **Obligatorio solo al INSERTAR un adelanto nuevo** (trigger BEFORE
  INSERT, mensaje "Elegí cómo se dio el adelanto: efectivo o transferencia."): los adelantos viejos sin medio siguen
  válidos y se pueden actualizar (p. ej. poner `pago_id`).
- `sgp.pagos_personal`: `monto_efectivo NUMERIC(12,2) NULL CHECK ≥ 0`, `monto_transferencia NUMERIC(12,2) NULL CHECK ≥ 0`.
  `medio_pago` admite `'dividido'` (además de efectivo y transferencia). **Sin CHECK de que sumen el total.**
- Candado (`sgp.pagos_personal_candado`, se reescribe partiendo de la versión de 017, sin perder nada de lo de 017):
  - En un borrador se pueden guardar los montos libremente (es lo que recuerda el borrador).
  - Al pasar `borrador → pagado`:
    - si viene **algún monto** (no nulo): exige `coalesce(ef,0) + coalesce(tr,0) > 0` (si no: "Cargá cuánto se pagó en
      efectivo o por transferencia."), normaliza nulos a 0 y **deriva `medio_pago`**: los dos > 0 → `dividido`; solo
      efectivo → `efectivo`; solo transferencia → `transferencia` (lo que haya mandado la pantalla en `medio_pago` se pisa).
    - si **no viene ningún monto** y sí `medio_pago` (efectivo/transferencia: la app vieja, mientras no se publica la
      nueva): pone el monto de ese medio = `NEW.total_a_cobrar` y el otro en 0. Si no viene nada: el error de siempre.
  - Pagado y anulado: igual que 017 (los montos nuevos quedan cubiertos por las comparaciones `to_jsonb`).
- Nada de policies nuevas ni DELETE; RLS igual que 016. Verificación final `OK | FALTA` (columnas, CHECKs, trigger de
  adelanto, candado con 'dividido', sin policies DELETE ni abiertas). Idempotente.
- Rollback: quita trigger y columnas, restaura el candado de 017 y el CHECK de `medio_pago` sin 'dividido'; antes,
  pasa cada 'dividido' al medio con más monto (comentado en el archivo).
- Prueba (molde `017_prueba.sql`, BEGIN…ROLLBACK, `RESULTADO_PRUEBA total= ok= mal=`): adelanto nuevo sin medio → error;
  con medio OK; adelanto viejo sin medio se actualiza OK; medio en novedad que no es adelanto → error; borrador guarda
  montos; pagar con los dos → `dividido`; solo uno → ese medio; con diferencia (de más y de menos) → OK; montos en 0 →
  error; camino viejo (solo `medio_pago`) → copia el total; pagado no deja cambiar montos; ventas@ no ve nada.
- Regenerar `supabase/instalar_sgp_desde_cero.sql` (001–018 + seed).

### Contrato — pantallas (`src/modules/personal/**`, `src/types/database.types.ts`)
- Tipos: `MedioPagoPersonal` suma `'dividido'`; `MedioAdelanto = 'efectivo' | 'transferencia'`; `PagoPersonal` suma
  `monto_efectivo`, `monto_transferencia` (`number | null`); `NovedadPersonal` suma `medio_pago: MedioAdelanto | null`.
- **Refactor previo:** las etiquetas de medio viven una sola vez en `lib/etiquetas.ts` (`ETIQUETA_MEDIO` con Dividido y
  la lista de opciones Efectivo/Transferencia); `recibo.ts`, `ListaRecibos.tsx` y `PagarSemanaContenido.tsx` la importan.
- Novedad (`ModalNovedad`, `useFichaEmpleada.DatosNovedad`): si el tipo es Adelanto, `ControlSegmentado`
  Efectivo/Transferencia obligatorio (sin elegir → "Elegí cómo se dio el adelanto"). `ListaNovedades`: "$20.000 ·
  Transferencia" (sin medio, como hoy).
- `calculos.ts` + tests:
  - `proponerItems`: el ítem de adelanto se llama `"<Concepto> DD/MM · <Medio>"` (sin medio: `"<Concepto> DD/MM"`),
    cortado a 40 caracteres (límite de la base).
  - `repartoPago(total, efectivo, transferencia)` → `{ pagado, diferencia, sentido: 'justo'|'de_mas'|'de_menos', medio:
    MedioPagoPersonal | null, valido }` (`valido` = pagado > 0; `medio` igual que la regla de la base). Montos nulos = 0,
    redondeo a pesos enteros.
- Pagar semana (`PagarSemanaContenido` + `usePagos`): el selector de medio se reemplaza por dos campos **Efectivo $** y
  **Transferencia $** (`Entrada`, `inputMode="decimal"`, `leerNumero` / `ayudaMonto` / `errorTopeMonto`) y dos atajos
  **Todo efectivo** / **Todo transferencia** (llenan ese campo con el total y vacían el otro). Debajo: aviso ámbar si hay
  diferencia ("Cobra $10.000 de más que lo calculado" / "de menos"). **Marcar pagado** solo se bloquea si lo pagado es 0.
  Confirmación: "Ana cobra $190.000: $100.000 por transferencia y $90.000 en efectivo." + la diferencia si la hay.
  `guardarBorrador` guarda los montos; al abrir un borrador se precargan. `marcarPagado(pagoId, montos, novedadIds)`
  manda `estado: 'pagado'` + los dos montos (el medio lo pone la base).
- Recibo (`recibo.ts`, `pdf/tipos.ts`, `ReciboPdf.tsx`, `ResultadoRecibo.tsx`, `ListaRecibos.tsx`): con montos muestra
  "A cobrar" (lo calculado), lo pagado en efectivo y por transferencia (solo los > 0) y la diferencia si la hay; sin
  montos (pagos viejos) muestra el medio como hoy.
- No tocar: `Receipt.tsx`, `@media print`, `print-server/`. Estilo Panel, 44 px, inputs 16 px.

### Orden
`base` y `pantallas` en paralelo (columnas fijadas arriba) → `revisor` → el orquestador revisa la 018 línea por línea,
la prueba y la aplica con backup y OK de Lucas → QA del pago a 390 px → Merge de Lucas → publicar con su OK.
