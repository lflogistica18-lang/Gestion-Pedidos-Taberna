-- SGP Migration 005: RLS Delete Policies
-- Permite eliminar pedidos (y por cascada ítems e historial)

CREATE POLICY "sgp_orders_delete" ON sgp.orders FOR DELETE USING (true);
CREATE POLICY "sgp_order_items_delete" ON sgp.order_items FOR DELETE USING (true);
CREATE POLICY "sgp_order_status_log_delete" ON sgp.order_status_log FOR DELETE USING (true);
