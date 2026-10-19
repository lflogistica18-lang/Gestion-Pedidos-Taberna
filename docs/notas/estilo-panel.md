Nació con Panel 0.9 (`omni/sistema/diseno/GUIA.md`, borrador 2026-10-14). Fuente de las piezas: depo-track `staging` (`61f77eb`).

# Estilo Panel — SGP (La Taberna)

> Vista derivada: si contradice a `.planning/STATE.md`, gana el estado.

## Decisiones del dueño (2026-10-19)

- **Color de marca: naranja Taberna**, no el azul del Panel. Estructura Panel, acento naranja.
- **Menú:** en celular (< `lg`) queda la **barra de abajo** (POS: un toque para cambiar de pantalla). Desde `lg`
  (tablet acostada, compu) **menú lateral oscuro** del Panel. La guía propone cajón en celular; acá no.
- Cocina (KDS) escondida (`COCINA_ACTIVA = false`): no se migra hasta que se reactive.

## Decisiones de diseño (orquestador)

- **Nombres de tokens en castellano** (los "Nombre 1.0" de la sección b de la guía), no los de depo-track. El SGP es el
  primer proyecto que los usa: valida la 1.0 antes de que el starter la adopte. Tailwind 4 `@theme` con `#hex`.
- **Acento:** `acento-primario #c2410c` / `acento-hover #9a3412` (naranja 700/800: texto blanco 5,2:1, AA). El naranja
  claro de la marca (`#f9a825` → `#f07621`) queda para el **banner degradé** de Reportes (`banner-desde/hasta`, texto
  grande en negrita, 3:1) y el ícono activo del menú (`menu-acento #fb923c`).
- **Caja (POS)** no está en la guía. Se decide: `EncabezadoPagina` compacto (título + botón "Pedidos" con contador),
  categorías como `FiltrosPastilla` con cantidad de productos, grilla de tarjetas `bg-tarjeta` (nombre, precio grande,
  − cantidad +), carrito como hoja inferior en celular y **panel fijo a la derecha** desde `lg` (CONVENCIONES §7
  "Sidebars info"). Pedidos activos en `Modal` con filas de pedido y `Pastilla` de estado.
- **Reportes = dashboard:** es la única pantalla con banner degradé y `KpiCard`.
- **Ticket impreso (`Receipt.tsx` y `@media print`) no se toca:** sale al mundo (papel de la comandera).

## Reglas (sección d de la guía, resumidas)

1. Un solo color fuerte por pantalla (banner en Reportes; botón primario en el resto).
2. No apagar los colores al pulir.
3. Tarjetas: `bg-tarjeta`, borde 1 px `borde-sutil`, radio 12 px, `sombra-tarjeta`.
4. Pastillas de estado: fondo suave + punto + texto fuerte del tono.
5. Encabezado de pantalla con `EncabezadoPagina`; banner solo en Reportes.
6. Filtros con `FiltrosPastilla` y contador.
7. Alertas en filtros, filas y modal (en el SGP: pedidos cancelados / en papelera, producto inactivo).
8. Modal de detalle: título + subtítulo + cierre cuadrado; datos en `TarjetaDato`.
9. Listas: números a la derecha; debajo de `md`, cards.
10. Control segmentado solo para período (Reportes: Hoy / Ayer / 7 días / 30 días).
11. Gráficos con `grafico-1…6`, con descripción de texto.
12. Cuatro estados: cargando, vacío, error con reintentar, datos.
13. Celular primero: 44×44, campos 16 px, sin scroll horizontal a 375 px.
14. Castellano rioplatense, sin jerga.

## Pantalla → piezas

| Pantalla | Piezas |
|---|---|
| Cáscara | `MenuLateral` (≥ lg), `NavBar` abajo (< lg), `BarraSuperior` (logo, reloj, usuario) |
| Login / Sin acceso | tarjeta centrada, `Boton` primario, `Campo` |
| Caja | `EncabezadoPagina`, `FiltrosPastilla`, tarjetas de producto, carrito (hoja / panel derecho), `Modal` de pedidos, `Pastilla` |
| Historial | `EncabezadoPagina`, `FiltrosPastilla` (Historial / Papelera y estados), buscador, filas → `Modal` con `TarjetaDato` |
| Productos | `EncabezadoPagina` con pestañas, `FiltrosPastilla` por categoría, `CrudManager` en estilo Panel, `Modal` de formulario |
| Reportes | `BannerSaludo`, `ControlSegmentado`, `KpiCard`, `TendenciaArea`, `BarrasRanking` |

## Pantallas hechas

(ninguna todavía)
