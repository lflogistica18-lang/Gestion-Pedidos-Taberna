# Puesta en marcha — SGP La Taberna

Para volver a levantar el sistema de pedidos (estaba apagado desde la limpieza de octubre 2026).
Se hace desde la compu. Cada paso dice cómo saber que salió bien.

## 1. Base de datos (Supabase, proyecto `zslsosunvsbxxnzeckpg`)

1. **Authentication → Users → Add user**: crear el usuario de la caja con mail y contraseña
   (marcar "Auto Confirm User"). El script le da el rol a los mails `@sgc-taberna.com`; si usás
   otro dominio, cambiá ese `WHERE` en el script (buscá `sgc-taberna`).
2. **SQL Editor**: pegar entero `supabase/instalar_sgp_desde_cero.sql` y **Run**.
   ✅ Abajo tiene que decir `OK`. Si dice `FALTA: ningún usuario tiene rol taberna`, el usuario
   del paso 1 no tiene ese dominio: correr, cambiando el mail:
   ```sql
   UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"rol":"taberna"}'
   WHERE email = 'tu-mail@ejemplo.com';
   ```
3. **Project Settings → Data API → Exposed schemas**: que esté `sgp` (si no, agregarlo y guardar).

Borra solo lo de la Taberna (`sgp` y `papelera_sgp`); no toca cotizador ni dropshipping.

## 2. Dominio (DuckDNS)

1. Entrar a https://www.duckdns.org con la cuenta de siempre.
2. Si `pedidostaberna` no está, crearlo. Poner la IP **187.77.247.24** y **update ip**.
   ✅ En la compu: `nslookup pedidostaberna.duckdns.org` devuelve 187.77.247.24.

## 3. Servidor (VPS)

```bash
ssh root@187.77.247.24
cd /root/Gestion-Pedidos-Taberna
git checkout master
git pull
cat .env | cut -d= -f1                   # tiene que listar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
docker build --no-cache -t sgp-taberna:latest .
docker-compose stop; docker-compose rm -f; docker-compose up -d     # NUNCA --force-recreate
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090      # ✅ 200
```

- Si `up -d` dice que no existe la red `red-proxy`: `docker network ls | grep proxy` y avisar
  (es la red de Nginx Proxy Manager; las otras apps la usan).
- El `.env` del VPS no está en git: si falta, copiar `.env.example` y completar con la URL y la
  **anon key** del proyecto (Settings → API). Nunca la service key.

## 4. Proxy (panel `https://panel-lucas.duckdns.org`)

1. Hosts → Proxy Hosts → `pedidostaberna.duckdns.org` → Edit (si no existe, Add):
   - Forward Hostname/IP: **`sgp-taberna-front`** · Port: **80** · Scheme: http
   - Websockets Support: **sí** (no lo necesita hoy, no molesta)
2. Pestaña SSL: Request a new certificate (Let's Encrypt) · **Force SSL** · HTTP/2. Save.
   ✅ `https://pedidostaberna.duckdns.org` abre el login con candado. (Sin HTTPS la PWA no se instala.)

## 5. Primer uso

1. Entrar con el usuario del paso 1. Si dice "Sin acceso": falta el rol (paso 1.2) o hay que salir
   y volver a entrar.
2. **Configuración → Local**: nombre, dirección y teléfono del ticket. **Impresión**: papel 80 mm.
   **Medios de pago**: los que se usen.
3. **Productos**: cargar los reales (los 17 de ejemplo se pueden desactivar).
4. Celu de la caja: abrir el dominio en Chrome → menú → **Instalar app**.
5. Comandera WiFi + **RawBT** en el celu (impresora de red, IP de la comandera, puerto 9100,
   papel 80 mm). Hacer un pedido de prueba: al confirmar se abre el diálogo → RawBT → Imprimir.

## Vuelta atrás

- App: `docker-compose stop` en `/root/Gestion-Pedidos-Taberna` (nadie más depende de ella).
- Base: el script es repetible; para sacarla del todo, `DROP SCHEMA sgp CASCADE;`.
