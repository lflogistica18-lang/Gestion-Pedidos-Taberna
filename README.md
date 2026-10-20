# SGP — Sistema de Gestión de Pedidos Gastronómicos

PWA de gestión de ventas y producción para La Taberna (atención en local y delivery). Centraliza la toma de pedidos (POS), la comunicación con cocina mediante un panel digital en tiempo real (KDS) y registra todas las ventas para tener trazabilidad: cuánto se vendió y por qué método de pago. Pensada para tablets y celulares con WiFi.

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, Zustand, React Router v7, Supabase (PostgreSQL + Realtime + Auth), vite-plugin-pwa, Zod.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # tsc -b + build de producción
```

## Variables de entorno

Copiá `.env.example` a `.env` y completá con los datos de tu proyecto Supabase:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Vite las lee en tiempo de build (desde el `.env`, que entra a la imagen con `COPY . .`; el Dockerfile no declara `ARG`/`ENV`
para ellas porque vacías pisarían al `.env`).

## Base de datos

Las migraciones están en `supabase/migrations`. Aplicarlas en orden (por nombre de archivo) desde el SQL editor de Supabase.

## Deploy (VPS)

Servidor Ubuntu con docker-compose v1.29. En la carpeta del proyecto del VPS (con su `.env`):

```bash
git pull && \
docker build --no-cache -t sgp-taberna:latest . && \
docker-compose stop && \
docker-compose rm -f && \
docker-compose up -d
```

- El tag de la imagen debe ser exactamente `sgp-taberna:latest` (el que pide `docker-compose.yml`); otro tag deja corriendo la imagen vieja.
- Nunca usar `--force-recreate`: falla con `KeyError: 'ContainerConfig'` en docker-compose v1.29.
- El error "network has active endpoints" al hacer `down` es normal y no bloquea el `up -d`.
