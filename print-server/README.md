# Impresora de La Taberna

Un programa chiquito que se queda abierto en la compu del local. Cada vez que entra un pedido en la app, **imprime el ticket solo** en la impresora de tickets (la de papel de 80 mm).

> **Importante:** la compu tiene que estar **prendida y con internet** durante todo el servicio, y la impresora **enchufada y prendida**. Si algo de eso falla, los pedidos no se pierden: quedan esperando y salen cuando vuelva todo.

---

## Instalación (una sola vez, 10 minutos)

Hace falta la compu con Windows 11 donde va a quedar la impresora, y el archivo **`ImpresoraTaberna.exe`** (te lo pasa quien armó el sistema).

1. **Enchufá la impresora** a la compu con el cable USB y prendela. Esperá un minuto a que Windows la reconozca. Para chequearlo: en Windows, buscá "Impresoras y escáneres"; la impresora tiene que aparecer en la lista.
2. **Guardá `ImpresoraTaberna.exe` en una carpeta que no vayas a borrar**, por ejemplo en *Documentos*, dentro de una carpeta nueva llamada `Impresora Taberna`. (No lo dejes en *Descargas*: es fácil borrarlo sin querer.)
3. **Doble clic en `ImpresoraTaberna.exe`.**
   - Si Windows muestra un cartel azul **"Windows protegió su PC"**, es normal (el programa es nuevo y todavía no tiene firma de Microsoft). Tocá **"Más información"** y después **"Ejecutar de todas formas"**.
4. Se abre una ventana negra que te hace **3 preguntas**:
   1. **Email y contraseña** del usuario de impresión (te los dieron junto con el programa; al escribir la contraseña no se ve nada, es normal). El programa comprueba que anden antes de seguir.
   2. **Qué impresora es**: te muestra una lista numerada. Escribí el número de la impresora del local (si hay una que parece la correcta, ya te la sugiere: alcanza con apretar Enter).
   3. **Ticket de prueba**: sale un ticket con el nombre del local, con ñ y acentos. Si salió bien, respondé `s`. Si no salió o salió con símbolos raros, respondé `n` y podés reintentar o elegir otra impresora.
5. Listo. La ventana queda abierta con el título **"Impresora La Taberna"** y dice **"Esperando pedidos…"**. Cada ticket que imprime queda anotado con la hora y el número de pedido. **No la cierres**; si te molesta, minimizala.

El programa además queda configurado para **abrirse solo cada vez que se prende la compu**. No tenés que hacer nada más.

### Activar la impresión automática en la app

En la app de pedidos: **Configuración → Impresión → Modo de impresión** y elegí **"Print server en la compu"**. Después tocá **Guardar**. (Si dejás la otra opción, "Desde el celu (RawBT)", los tickets no salen por esta compu.)

Para probar: hacé un pedido de prueba en la app. En unos segundos tiene que salir el ticket y aparecer una línea nueva en la ventana.

---

## Uso de todos los días

- Prendés la compu → el programa se abre solo → prendés la impresora → listo.
- Si la ventana se cierra o la compu se reinició, alcanza con abrir de nuevo `ImpresoraTaberna.exe` (o reiniciar la compu).
- Conviene configurar Windows para que **no se suspenda solo** (Configuración → Sistema → Inicio/apagado y suspensión → "Nunca" cuando está enchufada).
- Si se corta internet, el programa **reintenta solo** y retoma cuando vuelve. No hace falta tocar nada.

## Si algo no anda

| Qué pasa | Qué hacer |
|---|---|
| La ventana dice **"No encuentro la impresora 'POS-80'. ¿Está prendida y enchufada?"** | Revisá que la impresora esté prendida, con el cable USB firme y con papel. Los pedidos quedan esperando y salen solos cuando vuelva. Si le cambiaste el nombre en Windows, corré el programa con `--configurar` (ver abajo). |
| Sale el ticket pero con **símbolos raros** en vez de ñ o acentos | Avisá a quien instaló el sistema (se cambia un número de configuración). |
| La ventana dice **"No se pudo iniciar sesión (el email o la contraseña no coinciden)"** | Pasó algo con el usuario de impresión (le cambiaron la clave, por ejemplo). Corré `--configurar` y cargalo de nuevo. |
| Dice **"no hay internet o no se llega al servidor"** | Revisá el WiFi/internet de la compu. Reintenta solo cada 30 segundos. |
| Hice un pedido y **no sale nada y la ventana está en blanco/cerrada** | Abrí `ImpresoraTaberna.exe`. Si la ventana está abierta, mirá si en la app está elegido "Print server en la compu". |
| Cambié de impresora o de compu | Corré el programa con `--configurar` en la compu nueva (o instalá todo de cero). |

### Opciones especiales (para cuando hace falta)

Se usan abriendo "Símbolo del sistema" en la carpeta del programa y escribiendo, por ejemplo, `ImpresoraTaberna.exe --configurar`:

| Opción | Para qué |
|---|---|
| `--configurar` | Repetir las 3 preguntas (cambiar usuario o impresora). |
| `--prueba` | Imprimir un ticket de prueba y terminar. |
| `--impresoras` | Ver la lista de impresoras de la compu. |
| `--quitar-inicio` | Que **deje** de abrirse solo al prender la compu. |
| `--simular` | Probar sin impresora ni internet (no imprime; guarda el ticket en un archivo). |

Los datos que guarda el programa (usuario, impresora elegida) quedan en `%APPDATA%\ImpresoraTaberna\config.json`. Ahí está la contraseña del usuario de impresión (que solo sirve para imprimir). Para "empezar de cero", borrá ese archivo y abrí el programa.

---

## Parte técnica

### Cómo funciona

Lee la cola `sgp.print_jobs` de Supabase con un usuario de rol `taberna` (por Realtime y, de respaldo, cada 60 segundos) y manda los bytes ESC/POS a la impresora. Hay dos formas de llegar a la impresora, elegidas con `TIPO_IMPRESORA`:

- **`windows`** (el `.exe`): impresora instalada en Windows (USB) **por nombre**. Los bytes van al spooler como documento `RAW` (winspool: `OpenPrinter` / `StartDocPrinter` / `WritePrinter`), sin compartir la impresora. Se hace con `powershell.exe` (viene con Windows) y un `Add-Type` de una clase C#; no hay dependencias nativas. Tabla de caracteres por defecto: **16 (WPC1252)**. Si la impresora no existe, el pedido vuelve a la cola **sin gastar intentos** y se reintenta cada minuto.
- **`red`** (Node, como antes): comandera con IP, TCP puerto 9100. Tabla por defecto: 2 (PC850).

### Generar el `.exe`

```
npm install
npm run exe
```

Deja `dist-exe/ImpresoraTaberna.exe` (Windows x64, ~90 MB: trae adentro el runtime, no hace falta instalar Node). Usa [Bun](https://bun.sh) (`bun build --compile`, viene como devDependency; se puede compilar desde Linux/WSL). La URL de Supabase y la clave **anon** (pública por diseño) se leen de `../.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) al compilar y quedan embebidas; no se guardan en ningún archivo del repo. Alternativa: variables `SGP_SUPABASE_URL` y `SGP_SUPABASE_ANON_KEY`. El `.exe` no está firmado (de ahí el cartel de SmartScreen).

Para pruebas se puede apuntar `TABERNA_CONFIG_DIR` a otra carpeta de datos, y `--simular` evita tocar la impresora e internet.

### Modo red (sin `.exe`)

Para una comandera con IP (WiFi/Ethernet), con Node.js LTS instalado en la PC:

```
npm install
npm run build
```

Copiar `.env.example` a `.env` y completar:

| Variable | Qué poner |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | URL del proyecto y clave **anon** (nunca la service key) |
| `PRINT_EMAIL` / `PRINT_PASSWORD` | Usuario de impresión (ver abajo) |
| `TIPO_IMPRESORA` | `red` (por defecto) o `windows` |
| `IMPRESORA_IP` / `IMPRESORA_PUERTO` | IP de la impresora y `9100` (modo red) |
| `IMPRESORA_WINDOWS` | Nombre exacto en Windows (modo `windows`) |
| `COLUMNAS` | Respaldo: `48` (80 mm) o `32` (58 mm). Normalmente sale de **Configuración → Impresión → Ancho del papel** |
| `NOMBRE_LOCAL` | Respaldo. Nombre, dirección, teléfono y pie salen de la app en cada ticket |
| `CODEPAGE` | `2` en red, `16` con impresora de Windows (si salen mal los acentos, probar `0`, `16` o `19`) |
| `SIMULAR` | `true` = no imprime: muestra el ticket y lo guarda en `simulados/` |

Arrancar: `iniciar.bat` (reinicia solo si se cae) o `npm start`. Hoja de prueba: `npm run prueba:prod`. La IP de la impresora se ve en su hoja de autotest (apagar, mantener FEED y prender); conviene reservarla en el router.

### Crear el usuario de impresión

1. En Supabase: **Authentication → Users → Add user** (con "Auto Confirm User").
2. En el **SQL Editor** (cambiando el email):

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"rol":"taberna"}'
WHERE email = 'impresion@taberna.local';
```

El asistente del `.exe` comprueba que el usuario tenga ese rol.

### Si no imprime (técnico)

- En Supabase, tabla `print_jobs`, columna `ultimo_error`. Cada trabajo se intenta hasta 3 veces y queda en `error`; los fallos por impresora no encontrada (modo `windows`) no cuentan.
- Reimprimir: desde la app, o poniendo el trabajo en `estado = 'pendiente'` e `intentos = 0`.

### Desarrollo

- `npm run dev` — corre con recarga sin compilar. `SIMULAR=true npm run dev` — sin impresora.
- `npx tsx src/demo.ts` — muestra un ticket de ejemplo en texto (48 y 32 columnas).
- `npx tsx src/exe.ts --simular` — recorre el asistente sin imprimir (en Windows).
