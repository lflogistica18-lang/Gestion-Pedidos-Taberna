# SGP — Sistema de Gestión de Pedidos Gastronómicos

## What This Is

Una PWA de gestión de ventas y producción para un local gastronómico con atención en local y delivery. Centraliza la toma de pedidos, la comunicación con cocina mediante un panel digital (KDS) y registra todas las ventas para tener trazabilidad completa del negocio. Pensada para correr en tablets y celulares.

## Core Value

Que ningún pedido se pierda y que al final del día se sepa exactamente cuánto se vendió y por qué método de pago — reemplazando el sistema actual de "todo a voz, cero registros".

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Gestión de productos: CRUD de platos, bebidas y postres con precio de venta y categoría
- [ ] Toma de pedidos (Caja): selección de productos, cantidades, notas especiales, tipo (local/delivery) y método de pago
- [ ] Cada pedido tiene un ID único y flujo de estados: Pendiente → En Preparación → Listo → Entregado
- [ ] Panel de cocina (KDS): vista en tiempo real de pedidos pendientes con acciones para aceptar y marcar como listo
- [ ] Registro de método de pago por pedido (Efectivo, Débito, Transferencia) sin integración de pasarela
- [ ] Log de movimientos: cada cambio de estado se registra con timestamp
- [ ] Reporte de cierre de día: total vendido + desglose por método de pago
- [ ] PWA instalable en tablets y celulares
- [ ] Soporte para 3-5 usuarios simultáneos
- [ ] Actualización de precios fácil y frecuente (cambios semanales/mensuales)

### Out of Scope

- Integración con plataformas de delivery (PedidosYa, Rappi) — no usan, piden por WhatsApp/teléfono
- Gestión de stock/inventario de insumos — se evalúa en fase posterior
- Impresión de tickets/comandas — se evalúa después, no hay impresora aún
- Modo offline — WiFi es estable en el local
- Gestión de mesas — no aplica, usan número de pedido (mostrador + delivery)
- Sistema de autenticación complejo — v1 con acceso simple
- Reportes avanzados (por producto, por franja horaria) — se evalúa post v1

## Context

- El local no tiene ningún sistema digital actualmente; todo se maneja a voz entre cajero y cocina
- No hay registros históricos de ventas ni datos para tomar decisiones
- Menú de 20-50 productos con precios que cambian frecuentemente
- Delivery se gestiona por WhatsApp/teléfono, no plataformas
- Hardware disponible: tablets y celulares, WiFi estable, sin impresoras térmicas por ahora
- El equipo simultáneo es de 3-5 personas (cajeros + cocineros)

## Constraints

- **Plataforma**: PWA — debe funcionar en cualquier navegador moderno, instalable en Android/iOS
- **Dispositivos**: Tablets y celulares como dispositivos principales — UI debe ser touch-friendly
- **Conectividad**: Requiere WiFi — no se necesita modo offline
- **Tiempo real**: El KDS de cocina debe actualizar en tiempo real sin recargar la página
- **Costo**: Infraestructura de bajo costo (Supabase free tier o similar)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA sobre app nativa | Funciona en cualquier dispositivo sin instalar desde store, menor costo de desarrollo | — Pending |
| Sin gestión de mesas | El local opera con mostrador + delivery, no servicio de mesa | — Pending |
| Sin impresión en v1 | No hay hardware de impresión disponible aún | — Pending |
| Delivery manual (no plataformas) | Los pedidos llegan por WhatsApp/teléfono, se cargan manualmente | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*
