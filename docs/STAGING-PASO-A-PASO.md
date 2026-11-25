# Taberna — dirección de prueba (staging), paso a paso

La copia de prueba ya está andando adentro del servidor. Falta darle una dirección web.
Son dos pasos, los dos tuyos. Tardan unos 5 minutos.

## Paso 1 — DuckDNS

1. Entrá a https://www.duckdns.org con la cuenta de siempre.
2. En **sub domain** escribí: `pedidostaberna-staging`
3. Tocá **add domain**.
4. En la fila nueva, en **current ip** poné: `187.77.247.24`
5. Tocá **update ip**.

## Paso 2 — Proxy

1. Entrá a https://panel-lucas.duckdns.org
2. **Hosts → Proxy Hosts → Add Proxy Host**.
3. Pestaña **Details**:
   - **Domain Names**: `pedidostaberna-staging.duckdns.org` y apretá **Enter** (queda como etiqueta).
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `sgp-taberna-staging`
   - **Forward Port**: `80`
   - **Block Common Exploits**: prendido.
   - **Cache Assets**: apagado.
   - **Websockets Support**: **prendido** (la app lo usa para el aviso "Para imprimir").
4. Pestaña **SSL**:
   - **SSL Certificate**: *Request a new SSL Certificate*.
   - **Force SSL**, **HTTP/2 Support** y **HSTS Enabled**: prendidos.
   - **HSTS Subdomains**: apagado.
   - Tu mail y aceptar los términos de Let's Encrypt.
5. **Save**. Tarda 20 a 40 segundos.
6. Si falla el certificado: esperá 3 minutos, **Edit** → **SSL** → **Save** de nuevo.

## Paso 3 — Avisame

Escribime "listo" y verifico desde afuera que responda bien.

## Qué vas a poder probar

Dirección: https://pedidostaberna-staging.duckdns.org (entrás con el usuario de siempre).

- **Pedido + en la tablet o en la compu**: categorías como tarjetas con dibujo, la lista grande al
  tocar una, y el resumen del pedido siempre a la derecha.
- **Menú que se recoge**: en la compu, el botón de arriba del menú lateral.
- **Muestra de dibujos**: https://pedidostaberna-staging.duckdns.org/iconos-categorias/muestra.html
  Decime cuáles querés cambiar.

## Ojo

La copia de prueba usa **la misma base que el local**. Un pedido que confirmes ahí es un pedido
real y suma en la Caja. Si confirmás uno para probar, después mandalo a la papelera desde Historial.

El usuario "solo pedidos" todavía no se puede probar: falta aplicar un cambio de permisos en la
base y crear el usuario. Eso lo hago yo cuando me des el OK.
