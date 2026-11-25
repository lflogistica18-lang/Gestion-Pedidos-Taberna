-- ============================================================
-- Vuelta atrás de la 013: deja las policies como estaban en 010–012
-- (todo con sgp.es_taberna()) y borra las dos funciones nuevas.
-- ⚠️ Si hay usuarios con rol 'taberna_pedidos', pierden el acceso (queda solo admin).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "sgp_products_select" ON sgp.products;
CREATE POLICY "sgp_products_select" ON sgp.products FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_product_categories_select" ON sgp.product_categories;
CREATE POLICY "sgp_product_categories_select" ON sgp.product_categories FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_configuracion_select" ON sgp.configuracion;
CREATE POLICY "sgp_configuracion_select" ON sgp.configuracion FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_orders_select" ON sgp.orders;
CREATE POLICY "sgp_orders_select" ON sgp.orders FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_orders_insert" ON sgp.orders;
CREATE POLICY "sgp_orders_insert" ON sgp.orders FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_orders_update" ON sgp.orders;
CREATE POLICY "sgp_orders_update" ON sgp.orders FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_order_items_select" ON sgp.order_items;
CREATE POLICY "sgp_order_items_select" ON sgp.order_items FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_order_items_insert" ON sgp.order_items;
CREATE POLICY "sgp_order_items_insert" ON sgp.order_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_order_status_log_select" ON sgp.order_status_log;
CREATE POLICY "sgp_order_status_log_select" ON sgp.order_status_log FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_order_status_log_insert" ON sgp.order_status_log;
CREATE POLICY "sgp_order_status_log_insert" ON sgp.order_status_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_print_jobs_select" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_select" ON sgp.print_jobs FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_print_jobs_insert" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_insert" ON sgp.print_jobs FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_print_jobs_update" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_update" ON sgp.print_jobs FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

DROP FUNCTION IF EXISTS sgp.es_personal();
DROP FUNCTION IF EXISTS sgp.es_solo_pedidos();

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN to_regprocedure('sgp.es_personal()') IS NOT NULL THEN 'FALTA: sigue existiendo sgp.es_personal'
    WHEN to_regprocedure('sgp.es_solo_pedidos()') IS NOT NULL THEN 'FALTA: sigue existiendo sgp.es_solo_pedidos'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp'
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_personal%') > 0
      THEN 'FALTA: quedan policies con es_personal'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
