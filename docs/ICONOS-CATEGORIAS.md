# Dibujos de las categorías (Pedido +)

## Qué son y de dónde salen

Son los dibujos que acompañan a cada categoría en la pantalla Pedido + de la tablet. Los 18 son
**propios**: se generaron con inteligencia artificial (Gemini, el motor de imagen de la skill de
creativos del Omni) **solo a partir de una descripción escrita**. Se hicieron el **2026-11-25**, con un
costo real de **USD 0,6048** (18 imágenes a USD 0,0336, un intento por dibujo, todos aprobados por el dueño).
Se pueden usar libremente en la app.

Las capturas de bancos de imágenes de la carpeta `Iconos a ver/` **no se usaron ni como modelo**: ni se
subieron a ningún servicio ni se pasaron como referencia. Sirvieron solo para entender qué quería ver el
dueño. El único modelo de estilo es el primer dibujo generado (Empanadas).

## El estilo (textual)

Este párrafo se repite **igual** en cada pedido al modelo, para que los 18 se vean de la misma mano:

```
Flat vector food illustration, vivid warm colors, simple shading, soft or no outline, appetizing three-quarter view, the object centered filling about 80% of the frame, pure flat white background #FFFFFF, no cast shadow on the floor, no text, no logos, no watermarks, no hands, no people. Big simple shapes, few elements, readable at 60 px.
```

Empanadas se generó primero, sin referencia, con ese párrafo y la descripción del contenido. Los otros 17
y el genérico llevaron además esta frase al principio y el dibujo de Empanadas como `--referencia`:

```
Match the exact illustration style of the reference image (same flat vector look, same warm vivid colors, same soft outline, same simple shading).
```

El prompt completo es: `<frase de referencia> <párrafo de estilo> Subject: <descripción>.`

## Tabla: categoría → archivo → qué se le pidió

| Categoría (nombre real) | Archivo | Descripción pedida (`Subject`, en inglés, textual) |
|---|---|---|
| Empanadas | `empanada.png` | 2 baked Argentine empanadas with braided repulgue edge, golden brown, on a plain surface |
| bebida | `bebida.png` | a generic soda bottle (unbranded, plain label-less) next to a glass of soda with ice cubes |
| postre | `postre.png` | a homemade flan with dulce de leche caramel sauce on a small plate |
| Pastas | `pasta.png` | a plate of tagliatelle pasta with red tomato sauce and a basil leaf |
| Milanesas al plato | `milanesa.png` | a breaded milanesa cutlet with french fries on a plate, with a lemon slice on top of the milanesa |
| Hamburguesas y papas fritas | `hamburguesa.png` | a complete hamburger with bun, patty, cheese, lettuce and tomato, with french fries beside it |
| Ensaladas | `ensalada.png` | a bowl of fresh salad with lettuce, tomato slices and hard-boiled egg halves |
| Sandwiches | `sandwich.png` | a triple-layer crustless white bread sandwich de miga cut in a triangle, showing ham and cheese layers |
| Sandiwiches de milanesa | `sandwich-milanesa.png` | a milanesa sandwich in a baguette-style french bread roll with lettuce and tomato slices visible |
| Tortillas | `tortilla.png` | a golden Spanish potato omelette (tortilla de papas), whole round with one wedge slice cut out showing the soft interior |
| Guisos | `guiso.png` | a clay terracotta cazuela pot with steaming lentil stew, a little steam rising |
| Medias tartas | `tarta.png` | a savory ham and cheese pie (tarta salada) in a round pie tin with one slice cut and lifted, golden crust, clearly a savory pie and not a dessert |
| Combos | `combo.png` | a food tray combo with a hamburger, french fries and a soda cup with straw together |
| Viandas | `vianda.png` | a takeaway lunch box tray with three compartments containing home-cooked food: rice, a piece of chicken and vegetables, seen from above at a slight angle |
| Carnes, pollo, pescado | `carnes.png` | a wooden board with a roasted chicken drumstick, a steak and a fish fillet together |
| Arrollados de miga | `arrollado.png` | a savory rolled sandwich cake (arrollado de miga, pionono) sliced into spiral slices showing the filling swirl |
| adicionales | `adicional.png` | a few slices of cooked ham, a wedge of yellow cheese and a fried egg together on one small plate |
| (reserva: cualquier otra) | `generico.png` | an empty round white plate with a fork and a knife beside it |

Puntos más flojos (aprobados igual): Viandas (colores pálidos), Medias tartas y el genérico.

## Cómo sumar el dibujo de una categoría nueva

Costo aproximado: **USD 0,034 por intento** (unos 4 centavos por dibujo con un reintento). Se hace desde el
Omni, en la compu de Lucas (la llave de Gemini ya está configurada, no hay que pedirla ni pegarla en ningún lado).

1. **Generar.** Desde `/home/lucas/PROYECTOS/omni/sistema/skills/creativos`. La herramienta solo escribe
   dentro de `herramientas/crudo/` de la skill y la referencia tiene que estar ahí, así que primero hay que
   copiar `public/iconos-categorias/empanada.png` a esa carpeta (por ejemplo como `ref-taberna.png`). Después:

   ```
   npx tsx herramientas/generar-imagen.ts \
     --prompt "Match the exact illustration style of the reference image (same flat vector look, same warm vivid colors, same soft outline, same simple shading). <PÁRRAFO DE ESTILO de arriba> Subject: <descripción en inglés>." \
     --salida herramientas/crudo/taberna-<nombre>-1.png \
     --referencia herramientas/crudo/ref-taberna.png \
     --proporcion 1:1 --para "iconos taberna" --corrida taberna-iconos-<n>
   ```

   La herramienta tiene un tope de 14 imágenes por corrida (cambiar `--corrida` si hace falta). Mirar el
   resultado; si no convence, probar otra descripción (máximo 3 intentos).
2. **Quitar el fondo y dejarlo en 256×256.** El crudo es de 1024 px con fondo blanco. Correr:

   ```
   node docs/herramientas/iconos-procesar.mjs <crudo.png> public/iconos-categorias/<nombre>.png
   ```

   (explicación de requisitos en el encabezado del script). Hace relleno desde los bordes, así no agujerea
   los blancos de adentro, recorta con 6% de margen y guarda un PNG transparente de 256×256. Mirarlo sobre
   fondo blanco y sobre el naranja claro de la tarjeta resaltada.
3. **Enchufarlo.** En `src/shared/lib/iconoCategoria.ts`:
   - agregar la línea `<nombre>: '<nombre>.png'` en `ARCHIVO_POR_ICONO`;
   - agregar (o ajustar) la regla en `REGLAS`: `{ icono: '<nombre>', palabras: ['palabra1', 'palabra2'] }`.
     El orden de las reglas importa: gana la primera que coincide.
4. **Ver cómo quedó.** Regenerar `public/iconos-categorias/muestra.html` con el nombre real de la categoría y
   comprobar que le toca su dibujo.

## Qué pasa si una categoría no coincide con nada

Sale `generico.png` (plato vacío con cubiertos). No rompe nada; se arregla agregando una palabra clave a la
regla que corresponda, o creando una regla nueva con su dibujo.

Los **8 extras** (papas, pizza, café, helado, cerveza, vino, sopa, desayuno) **siguen siendo Fluent Emoji de
Microsoft (licencia MIT, `.svg`)** hasta que se generen propios; ya están en el mapeo para categorías futuras.
Detalle de licencias en `public/iconos-categorias/LICENCIA.txt`.
