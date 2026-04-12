-- SGP Migration 003: RLS Policies
-- Schema sgp aislado del resto del proyecto Supabase

ALTER TABLE sgp.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.order_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgp_products_select" ON sgp.products FOR SELECT USING (true);
CREATE POLICY "sgp_products_insert" ON sgp.products FOR INSERT WITH CHECK (true);
CREATE POLICY "sgp_products_update" ON sgp.products FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sgp_orders_select" ON sgp.orders FOR SELECT USING (true);
CREATE POLICY "sgp_orders_insert" ON sgp.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "sgp_orders_update" ON sgp.orders FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sgp_order_items_select" ON sgp.order_items FOR SELECT USING (true);
CREATE POLICY "sgp_order_items_insert" ON sgp.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "sgp_order_status_log_select" ON sgp.order_status_log FOR SELECT USING (true);
CREATE POLICY "sgp_order_status_log_insert" ON sgp.order_status_log FOR INSERT WITH CHECK (true);

GRANT USAGE ON SCHEMA sgp TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA sgp TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sgp TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE sgp.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sgp.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE sgp.order_status_log;
ALTER PUBLICATION supabase_realtime ADD TABLE sgp.products;
