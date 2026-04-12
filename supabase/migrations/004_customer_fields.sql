-- Migration 004: Campos de cliente para pedidos
-- customer_name: nombre de quien pidio (para entrega)
-- delivery_address: obligatorio cuando type = 'delivery'

ALTER TABLE sgp.orders
  ADD COLUMN customer_name TEXT,
  ADD COLUMN delivery_address TEXT;
