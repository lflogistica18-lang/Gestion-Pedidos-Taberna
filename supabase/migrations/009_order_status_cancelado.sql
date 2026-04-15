-- SGP Migration 009: Agregar estado 'cancelado' a los pedidos

ALTER TABLE sgp.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE sgp.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'));

CREATE OR REPLACE FUNCTION sgp.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO sgp.order_status_log (order_id, action, previous_status, new_status)
    VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'en_preparacion' THEN 'accepted'
        WHEN 'listo' THEN 'ready'
        WHEN 'entregado' THEN 'delivered'
        WHEN 'cancelado' THEN 'cancelled'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';
