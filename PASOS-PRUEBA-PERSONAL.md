# Probar Personal y el logo en la copia de prueba (2026-11-27)

La copia de prueba ya está andando en el servidor con todo lo nuevo. Le falta la dirección web: eso nunca se
terminó de configurar. Son 2 pasos tuyos de unos 5 minutos, y después la probás desde el celu.

## Paso 1 — DuckDNS

1. Entrá a https://www.duckdns.org con la cuenta de siempre.
2. En **sub domain** escribí `pedidostaberna-staging` y tocá **add domain**.
3. En la fila nueva, en **current ip**, poné `187.77.247.24` y tocá **update ip**.

## Paso 2 — Proxy

1. Entrá a https://panel-lucas.duckdns.org → **Hosts → Proxy Hosts → Add Proxy Host**.
2. Pestaña **Details**:
   - **Domain Names**: `pedidostaberna-staging.duckdns.org` y **Enter**.
   - **Scheme** `http` · **Forward Hostname / IP** `sgp-taberna-staging` · **Forward Port** `80`.
   - **Block Common Exploits** prendido · **Cache Assets** apagado · **Websockets Support** prendido.
3. Pestaña **SSL**: *Request a new SSL Certificate*; **Force SSL**, **HTTP/2** y **HSTS Enabled** prendidos;
   **HSTS Subdomains** apagado; tu mail y aceptar los términos.
4. **Save** (tarda 20 a 40 segundos). Si falla el certificado: esperá 3 minutos, **Edit → SSL → Save** otra vez.

Escribime **"listo"** y verifico desde acá que responda.

## Paso 3 — Probar desde el celu

Entrá a **https://pedidostaberna-staging.duckdns.org** con el usuario admin de siempre.

⚠️ **Usa la misma base que el local.** Cargá una empleada de prueba llamada **"Prueba"** (no una real). Un pago
marcado como pagado no se puede borrar desde la app: después de que me avises, lo borro yo.

1. Menú (arriba a la izquierda) → **Personal**.
2. Pestaña **Empleadas** → **Nueva**: "Prueba", sueldo semanal `200.000` (fijate que abajo diga "= $200.000"), 6 días.
3. Pestaña **Conceptos** → **Nuevo**: "Hora extra", Extra, Por unidad, valor `5000`.
4. Tocá **Prueba** → en su ficha agregá una **novedad**: Inasistencia de esta semana, con **Descontar** tildado.
5. Volvé a **Semana** → en Prueba, **Pagar semana**. Tiene que aparecer la inasistencia sola. Agregá "Hora extra" con cantidad 3.
   El total tiene que dar **$181.667**.
6. **Marcar pagado** → Efectivo → confirmar. Tocá **Compartir**: tiene que abrir WhatsApp con el PDF (mandátelo a vos).
7. Mirá el PDF: nombre, semana, la hora extra con "+", la inasistencia con "-" y **A cobrar $181.667**.
8. **Configuración → Local → Logo**: si tenés el logo, subilo y fijate que aparezca arriba y en el menú.
9. **Pedido +**: armá un pedido como siempre **pero no lo confirmes**, solo para ver que todo se ve bien.

Contame qué salió bien y qué no (con captura si algo se ve raro).
