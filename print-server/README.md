# Servidor de impresión — La Taberna

Programa que corre en una PC del local. Cada vez que la app crea un pedido, este programa lo recibe y **imprime el ticket automáticamente** en la comandera térmica (80 mm) por WiFi/cable de red. No necesita drivers.

> **Importante:** la PC tiene que estar **prendida y con internet** durante todo el servicio. Si está apagada, los pedidos quedan en cola y se imprimen cuando vuelva.

## 1. Requisitos

- Una PC (Windows, Mac o Linux) en la **misma red** que la impresora.
- **Node.js LTS** instalado: descargarlo de <https://nodejs.org> (botón "LTS") e instalar con todo por defecto.
- Impresora térmica ESC/POS con WiFi o Ethernet (puerto 9100).

## 2. Instalar

Abrir una terminal (en Windows: "Símbolo del sistema") dentro de esta carpeta `print-server` y ejecutar:

```
npm install
npm run build
```

## 3. Configurar el archivo `.env`

1. Copiar `.env.example` y renombrar la copia a `.env`.
2. Completar los valores:

| Variable | Qué poner |
|---|---|
| `SUPABASE_URL` | La URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | La clave **anon** (nunca la service key) |
| `PRINT_EMAIL` / `PRINT_PASSWORD` | Usuario de impresión (ver abajo) |
| `IMPRESORA_IP` | IP de la impresora (ver punto 4) |
| `IMPRESORA_PUERTO` | `9100` (casi siempre) |
| `COLUMNAS` | `48` para papel de 80 mm, `32` para 58 mm |
| `NOMBRE_LOCAL` | Nombre que sale arriba del ticket |
| `CODEPAGE` | `2` (si salen mal las tildes o la ñ, probar `0`, `16` o `19`) |
| `SIMULAR` | `false`. Con `true` no imprime: muestra el ticket en pantalla y lo guarda en `simulados/` |

### Crear el usuario de impresión

1. En Supabase: **Authentication → Users → Add user**. Crear un usuario con un email (ej. `impresion@taberna.local`) y una contraseña, marcando "Auto Confirm User".
2. En **SQL Editor** ejecutar (cambiando el email por el que creaste):

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"rol":"taberna"}'
WHERE email = 'impresion@taberna.local';
```

3. Poner ese email y contraseña en `PRINT_EMAIL` y `PRINT_PASSWORD`.

## 4. Saber la IP de la impresora

1. Apagar la impresora, **mantener apretado el botón FEED** y prenderla sin soltar.
2. Imprime una hoja de autotest con la configuración de red: ahí figura la **IP**.
3. **Fijar esa IP** para que no cambie: en el router, buscar "reserva de DHCP" / "IP estática" y asociar la IP a la impresora. Si cambia, el programa deja de imprimir.

## 5. Probar

```
npm run prueba:prod
```

Debe salir una hoja de prueba con acentos y ñ ("ñandú, pingüino, ¿café?") y el corte de papel. Si no sale, ver el punto 7.

## 6. Dejarlo funcionando solo

- Para arrancar a mano: doble clic en `iniciar.bat`. Deja una ventana abierta (**no cerrarla**) y, si el programa se cae, lo reinicia solo a los 5 segundos.
- Para que arranque cuando se prende la PC: apretar `Windows + R`, escribir `shell:startup` y Enter. En esa carpeta, crear un **acceso directo** a `iniciar.bat` (clic derecho en `iniciar.bat` → Crear acceso directo, y mover el acceso directo ahí).
- Conviene configurar la PC para que no se suspenda sola.

## 7. Si no imprime

1. **Revisar la IP**: ¿sigue siendo la misma que en el `.env`? (hoja de autotest).
2. **Misma red**: la PC y la impresora deben estar en el mismo WiFi/router.
3. Que la impresora esté prendida, con papel y la tapa cerrada.
4. Mirar la ventana del programa: los mensajes con ⚠️ explican el problema.
5. En Supabase, tabla `print_jobs`, mirar la columna **`ultimo_error`** de los trabajos. Cada trabajo se intenta hasta 3 veces; si falla las 3 queda en estado `error`.
6. **Reimprimir** desde la app (crea un nuevo trabajo de impresión), o en Supabase poner el trabajo en `estado = 'pendiente'` e `intentos = 0`.
7. Si salen símbolos raros en lugar de tildes: cambiar `CODEPAGE` en el `.env` y reiniciar.
8. Si el programa dice que no puede iniciar sesión, revisar `PRINT_EMAIL`, `PRINT_PASSWORD` y que se haya ejecutado el `UPDATE` del rol.

## Desarrollo

- `npm run dev` — corre con recarga sin compilar.
- `SIMULAR=true npm run dev` — prueba sin impresora.
- `npx tsx src/demo.ts` — muestra un ticket de ejemplo en texto (48 y 32 columnas).
