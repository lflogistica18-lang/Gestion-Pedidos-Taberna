-- ============================================================
-- SGP Migration 002: Tablas Orders
-- ============================================================

CREATE SEQUENCE sgp.order_number_seq START 1;

CREATE TABLE sgp.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INTEGER NOT NULL DEFAULT nextval('sgp.order_number_seq'),
  type TEXT NOT NULL CHECK (type IN ('local', 'delivery')),
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_preparacion', 'listo', 'entregado')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'debito', 'transferencia')),
  total NUMERIC NOT NULL CHECK (total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sgp.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES sgp.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES sgp.products(id),
  product_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  subtotal NUMERIC GENERATED ALWAYS AS (unit_price * quantity) STORED
);

CREATE TABLE sgp.order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES sgp.orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sgp_orders_status ON sgp.orders(status);
CREATE INDEX idx_sgp_orders_created_at ON sgp.orders(created_at);
CREATE INDEX idx_sgp_orders_status_created ON sgp.orders(status, created_at);
CREATE INDEX idx_sgp_order_items_order_id ON sgp.order_items(order_id);
CREATE INDEX idx_sgp_order_status_log_order_id ON sgp.order_status_log(order_id);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON sgp.orders
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();

CREATE OR REPLACE FUNCTION sgp.log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sgp.order_status_log (order_id, action, previous_status, new_status)
  VALUES (NEW.id, 'created', NULL, 'pendiente');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_log_order_creation
  AFTER INSERT ON sgp.orders
  FOR EACH ROW
  EXECUTE FUNCTION sgp.log_order_creation();

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
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON sgp.orders
  FOR EACH ROW
  EXECUTE FUNCTION sgp.log_order_status_change();
