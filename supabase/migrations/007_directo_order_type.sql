-- SGP Migration 007: Agregar tipo de pedido 'directo' (entrega inmediata, sin pasar por KDS)
-- El pedido se crea directamente como 'entregado', no aparece en la cocina

-- Eliminar constraint anterior y recrear con 'directo'
ALTER TABLE sgp.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE sgp.orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('local', 'delivery', 'directo'));
