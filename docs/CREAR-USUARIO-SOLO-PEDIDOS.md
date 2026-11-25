# Taberna — crear el usuario "solo pedidos", paso a paso

Ese usuario ve solo **Pedido +** e **Historial**. Puede cargar, entregar y reimprimir pedidos.
No ve Caja, Productos ni Configuración, y no puede mandar pedidos a la papelera.

## Paso 1 — Crear el usuario en Supabase (lo hacés vos)

1. Entrá a https://supabase.com/dashboard con la cuenta de siempre.
2. Abrí el proyecto **Sales Chatbot RAG** (es el que comparten la Taberna, dropshipping y el cotizador).
3. En el menú de la izquierda: **Authentication** → **Users**.
4. Arriba a la derecha: **Add user** → **Create new user**.
5. Completá:
   - **Email address**: el mail con el que va a entrar esa persona. No hace falta que exista de
     verdad; puede ser, por ejemplo, `pedidos@lataberna.com`.
   - **User Password**: la contraseña que le vas a dar (mínimo 6 caracteres).
   - **Auto Confirm User**: dejalo **tildado**.
6. Tocá **Create user**.

## Paso 2 — Avisame el mail

Escribime en el chat solo el mail (la contraseña no me la pases). Yo le asigno el rol
"solo pedidos" en la base y verifico que haya quedado.

## Paso 3 — Probar

1. En la tablet, abrí https://pedidostaberna.duckdns.org
2. Si hay otra sesión abierta, salí primero (botón de salir del menú).
3. Entrá con el mail y la contraseña nuevos.
4. Tiene que abrir directo en **Pedido +** y el menú mostrar solo **Pedido +** e **Historial**.

## Ojo con la impresión en esa tablet

La opción "¿Este aparato imprime los tickets?" está en Configuración, y el usuario "solo pedidos"
no ve Configuración. Antes de dejarle la tablet:

1. Entrá en la tablet con **tu** usuario.
2. **Configuración → Impresión** → "¿Este aparato imprime los tickets?" → **No**.
3. Salí y entrá con el usuario nuevo. La opción queda guardada en el aparato, no en el usuario.
