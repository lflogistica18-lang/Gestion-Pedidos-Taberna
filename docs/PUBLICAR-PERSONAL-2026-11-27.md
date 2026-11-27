# Publicar en producción: Personal (pagos semanales) y logo — 2026-11-27

Rama `personal-y-logo`, commit `9caaf2c`. Lucas la mergea a master; después se hace esto.
Producción: `/root/Gestion-Pedidos-Taberna`, contenedor `sgp-taberna-front`, imagen `sgp-taberna:latest`.
Dominio: https://pedidostaberna.duckdns.org. Las migraciones 015 y 016 ya están aplicadas en la base.

Se hace desde la compu, de a un paso, con la aprobación de Lucas. Si un paso no da lo esperado, se frena y se va al paso 6.
Nunca va una clave en un comando. El `.env` del VPS no se toca (el build de Vite lo lee solo).

Convenciones: `OMNI=/home/lucas/PROYECTOS/omni`, `CARP=/root/Gestion-Pedidos-Taberna`.
(Cada comando va escrito completo, sin variables, para poder copiarlo.)

## 0. Pre-chequeos

**0.1 El merge ya está en master de GitHub**
```bash
git -C /home/lucas/PROYECTOS/omni/proyectos/Gestion-Pedidos-Taberna fetch
git -C /home/lucas/PROYECTOS/omni/proyectos/Gestion-Pedidos-Taberna merge-base --is-ancestor 9caaf2c origin/master && echo EN_MASTER
```
Esperado: `EN_MASTER`. Si no sale nada: Lucas todavía no hizo el Merge. No seguir.
(Al redactar, 2026-11-27, daba NO_EN_MASTER: es lo esperado antes del Merge.)
Anotar el hash del commit del merge: `git -C ... rev-parse origin/master` (lo llamamos `MERGE`).

**0.2 La base tiene lo que el front nuevo lee** (si falta algo, NO se publica)
```bash
/home/lucas/PROYECTOS/omni/sistema/herramientas/supabase-sql.sh zslsosunvsbxxnzeckpg "select (select count(*) from information_schema.columns where table_schema='sgp' and table_name='configuracion' and column_name='logo_url') as logo_url, (select count(*) from information_schema.columns where table_schema='sgp' and table_name='configuracion' and column_name='dia_pago') as dia_pago, (select count(*) from information_schema.tables where table_schema='sgp' and table_name='empleados') as empleados"
```
Esperado: `logo_url=1, dia_pago=1, empleados=1`. Si alguno da 0: frenar y avisar (faltan las migraciones 015/016).

**0.3 Ventana y pedidos recientes** (después de las 16 h de Argentina)
```bash
/home/lucas/PROYECTOS/omni/sistema/herramientas/supabase-sql.sh zslsosunvsbxxnzeckpg "select count(*) as pedidos_15min from sgp.orders where created_at > now() - interval '15 minutes'"
```
Esperado: `0`. Si hay alguno: esperar 15 min y repetir. (Si la columna no se llama `created_at`, mirar con `\d sgp.orders` equivalente en information_schema y ajustar; no se pudo probar en esta redacción.)

**0.4 Dominio sano y nombre del JS de hoy**
```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://pedidostaberna.duckdns.org
curl -s https://pedidostaberna.duckdns.org | grep -o 'index-[A-Za-z0-9_-]*\.js'
```
Esperado: `200` y un nombre de JS. **Anotarlo.** El 2026-11-27 daba `200 0.32s` y `index-D4z2M-b-.js`; volver a medir, puede haber cambiado.

**0.5 Estado del servidor**
```bash
bash /home/lucas/PROYECTOS/omni/sistema/herramientas/vps-leer.sh contenedores
```
Esperado: `sgp-taberna-front` en `Up`. Al redactar también había un `sgp-taberna-staging` (127.0.0.1:8092) levantado hacía minutos, aunque se dijo que staging no se usa. No es parte de este paso y no se toca: solo confirmar que no comparte nombre de imagen que se pise (el staging, si usa `sgp-taberna:latest`, no se recrea con esto).

**0.6 Commit actual de producción** (para la vuelta atrás)
```bash
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna rev-parse --short HEAD"
```
Esperado: `e7e4919`. Si es otro, anotar el real; ese es `COMMIT_ANTERIOR` en todo lo que sigue.

## 1. Copia de vuelta atrás (imagen)
```bash
ssh vps-omni-deploy "sudo -n docker tag sgp-taberna:latest sgp-taberna:anterior-e7e4919"
ssh vps-omni-deploy "sudo -n docker images sgp-taberna"
```
(Si el commit real del 0.6 no es `e7e4919`, poner ese en el nombre de la etiqueta.)
Esperado: aparecen `latest` y `anterior-e7e4919` con el mismo IMAGE ID. Si no está la etiqueta: no seguir.

## 2. Traer el código
```bash
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna fetch origin"
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna checkout master"
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna pull --ff-only"
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna log --oneline -3"
```
Esperado: el `pull` avanza sin conflicto y el último commit del `log` es `MERGE` (el del 0.1); debajo está `9caaf2c`.
Si el `pull --ff-only` falla (cambios locales o historia distinta): frenar, no forzar, avisar. Todavía no se tocó nada en producción.
Chequeo extra del `.env` (solo nombres, nunca valores): `ssh vps-omni-deploy "sudo -n cat /root/Gestion-Pedidos-Taberna/.env" | cut -d= -f1` debe listar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## 3. Construir la imagen (la app vieja sigue andando)
```bash
ssh vps-omni-deploy "sudo -n docker build --no-cache -t sgp-taberna:latest /root/Gestion-Pedidos-Taberna"
```
Esperado: termina con `Successfully tagged sgp-taberna:latest`. Tarda unos minutos. La etiqueta tiene que ser exactamente `sgp-taberna:latest` (si no, queda la imagen vieja y parece que nada cambió).
Si el build falla: la app sigue en la versión vieja (el contenedor no se tocó). Anotar el error y avisar; no se sigue.

## 4. Recambio del contenedor (compose v1, nunca `--force-recreate`)
```bash
ssh vps-omni-deploy "sudo -n docker stop sgp-taberna-front"
ssh vps-omni-deploy "sudo -n docker rm sgp-taberna-front"
ssh vps-omni-deploy "sudo -n docker compose -f /root/Gestion-Pedidos-Taberna/docker-compose.yml --project-directory /root/Gestion-Pedidos-Taberna up -d"
```
Esperado: `Creating sgp-taberna-front ... done`. El aviso `network has active endpoints` es normal.
Hay unos segundos de corte entre `stop` y `up -d`: por eso la ventana sin pedidos.
Si `--project-directory` da error de opción desconocida: sacarlo; en compose v1 el directorio del proyecto ya es el de la carpeta del archivo pasado con `-f`, así que el comando queda igual de válido.
Si `up -d` dice que no existe la red `red-proxy`: `bash .../vps-leer.sh contenedores` y avisar (no crearla a mano). Ir al paso 6.
Si dice `ContainerConfig`: es el bug de `--force-recreate`; repetir `rm -f` y `up -d`, y si persiste, paso 6.

## 5. Verificación
```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://pedidostaberna.duckdns.org
curl -s https://pedidostaberna.duckdns.org | grep -o 'index-[A-Za-z0-9_-]*\.js'
```
Esperado: `200` y un nombre de JS **distinto** al anotado en 0.4. Si es el mismo: se sirve la imagen vieja (revisar que el build del paso 3 etiquetó `latest`) → paso 6.

El texto nuevo está en el JS (reemplazar `index-XXXX.js` por el nombre recién obtenido):
```bash
curl -s https://pedidostaberna.duckdns.org/assets/index-XXXX.js | grep -c "Personal"
```
Esperado: un número mayor que 0. Si da 0, mirar en el HTML si el JS principal está en `/assets/`; si el texto no aparece en ninguno, paso 6.

Logs sin errores:
```bash
bash /home/lucas/PROYECTOS/omni/sistema/herramientas/vps-leer.sh logs sgp-taberna-front 5
bash /home/lucas/PROYECTOS/omni/sistema/herramientas/vps-leer.sh contenedores
```
Esperado: logs de nginx con accesos 200, sin `error`/`emerg`; contenedor `Up` unos segundos.

Prueba de Lucas desde el celu o la compu (recargar fuerte; la PWA puede tener caché vieja: cerrarla y abrirla): entra con su usuario, aparece la pestaña **Personal**, Configuración permite subir el logo, y un pedido de prueba se carga y se imprime como siempre. Si la pantalla queda en blanco o no deja entrar: paso 6.

## 6. Vuelta atrás (si algo falla desde el paso 3 en adelante)
```bash
ssh vps-omni-deploy "sudo -n docker tag sgp-taberna:anterior-e7e4919 sgp-taberna:latest"
ssh vps-omni-deploy "sudo -n docker stop sgp-taberna-front"
ssh vps-omni-deploy "sudo -n docker rm sgp-taberna-front"
ssh vps-omni-deploy "sudo -n docker compose -f /root/Gestion-Pedidos-Taberna/docker-compose.yml --project-directory /root/Gestion-Pedidos-Taberna up -d"
ssh vps-omni-deploy "sudo -n git -C /root/Gestion-Pedidos-Taberna checkout e7e4919"
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://pedidostaberna.duckdns.org
curl -s https://pedidostaberna.duckdns.org | grep -o 'index-[A-Za-z0-9_-]*\.js'
```
(Usar el commit real del 0.6 en lugar de `e7e4919` si era otro.)
Esperado: `200` y el JS del 0.4 de nuevo. Nota: `checkout` deja la carpeta en HEAD suelto; para volver a publicar después se hace `checkout master` y `pull --ff-only`.
La base NO se revierte: las columnas y la tabla nuevas (015/016) son aditivas y el front viejo las ignora. Si hiciera falta sacarlas, es decisión aparte con backup.
Si el rollback también falla: `docker stop sgp-taberna-front` apaga la app y se avisa a Lucas (el local puede cargar pedidos a mano mientras tanto).

## 7. Después: qué anotar en `estado_proyecto.md` (lo anota el orquestador)
- Prod en `MERGE` (commit del merge de la rama `personal-y-logo`, que incluye `9caaf2c`), publicada el 2026-11-27 a las `HH:MM`.
- Funciones nuevas en prod: Personal (pagos semanales con recibo PDF) y logo desde Configuración. Migraciones 015 y 016 aplicadas antes.
- Imagen de vuelta atrás: `sgp-taberna:anterior-e7e4919` (se puede borrar con `docker rmi` cuando Lucas confirme que anda bien unos días).
- Nombre del JS de antes y de después, y resultado de la prueba de Lucas.
- Pendiente: cargar el logo real (ya era el siguiente paso).
- Si algo no se hizo o se revirtió, dejarlo escrito acá con el motivo.

> **Nota del orquestador (2026-11-27):** `sudo -n docker-compose` (v1) pide contraseña para omni-deploy. Por eso el
> recambio es `docker stop` + `docker rm` del contenedor y después `docker compose` (v2, v5.1.1, el mismo que levantó
> staging hoy) con el mismo archivo: crea el contenedor con el mismo nombre, puerto y red. Sin `--force-recreate`.
