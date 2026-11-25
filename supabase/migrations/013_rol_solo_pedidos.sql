-- ============================================================
-- SGP Migration 013: Rol "solo pedidos" (app_metadata.rol = 'taberna_pedidos')
-- Un segundo rol para quien toma pedidos: ve Pedido + e Historial, entrega y
-- reimprime, pero NO ve Caja, Productos, Configuración ni Cocina, y no puede
-- mandar pedidos a la papelera ni cancelarlos.
--
--   'taberna'          = admin (todo, como hasta ahora)
--   'taberna_pedidos'  = solo pedidos
--
-- sgp.es_taberna() NO cambia: sigue siendo "admin".
-- Requiere las migraciones 010, 011 y 012.
-- Para dar el rol a un usuario puntual:
--   UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"rol":"taberna_pedidos"}'
--   WHERE email = 'alguien@mail.com';
-- (el usuario cierra sesión y vuelve a entrar: el rol viaja en el token)
-- Vuelta atrás: 013_rol_solo_pedidos.rollback.sql
-- ============================================================

BEGIN;

-- ─── 1. Funciones de rol (se evalúan una vez por consulta con el (SELECT ...)) ──
-- Siempre app_metadata (lo edita solo el admin), nunca user_metadata.
CREATE OR REPLACE FUNCTION sgp.es_personal()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT auth.jwt())->'app_metadata'->>'rol', '') IN ('taberna', 'taberna_pedidos')
$$;

CREATE OR REPLACE FUNCTION sgp.es_solo_pedidos()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT auth.jwt())->'app_metadata'->>'rol', '') = 'taberna_pedidos'
$$;

REVOKE EXECUTE ON FUNCTION sgp.es_personal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sgp.es_solo_pedidos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sgp.es_personal() TO authenticated;
GRANT EXECUTE ON FUNCTION sgp.es_solo_pedidos() TO authenticated;

-- ─── 2. Policies que pasan de admin a "personal" (admin + solo pedidos) ──
DROP POLICY IF EXISTS "sgp_products_select" ON sgp.products;
CREATE POLICY "sgp_products_select" ON sgp.products FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_product_categories_select" ON sgp.product_categories;
CREATE POLICY "sgp_product_categories_select" ON sgp.product_categories FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_configuracion_select" ON sgp.configuracion;
CREATE POLICY "sgp_configuracion_select" ON sgp.configuracion FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_orders_select" ON sgp.orders;
CREATE POLICY "sgp_orders_select" ON sgp.orders FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_orders_insert" ON sgp.orders;
CREATE POLICY "sgp_orders_insert" ON sgp.orders FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_personal()));

-- orders UPDATE: el admin hace todo; solo pedidos puede entregar y editar, pero la
-- fila resultante no puede quedar en la papelera ni cancelada.
DROP POLICY IF EXISTS "sgp_orders_update" ON sgp.orders;
CREATE POLICY "sgp_orders_update" ON sgp.orders FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_personal()))
  WITH CHECK (
    (SELECT sgp.es_taberna())
    OR ((SELECT sgp.es_solo_pedidos()) AND deleted_at IS NULL AND status <> 'cancelado')
  );

DROP POLICY IF EXISTS "sgp_order_items_select" ON sgp.order_items;
CREATE POLICY "sgp_order_items_select" ON sgp.order_items FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_order_items_insert" ON sgp.order_items;
CREATE POLICY "sgp_order_items_insert" ON sgp.order_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_order_status_log_select" ON sgp.order_status_log;
CREATE POLICY "sgp_order_status_log_select" ON sgp.order_status_log FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_order_status_log_insert" ON sgp.order_status_log;
CREATE POLICY "sgp_order_status_log_insert" ON sgp.order_status_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_print_jobs_select" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_select" ON sgp.print_jobs FOR SELECT TO authenticated
  USING ((SELECT sgp.es_personal()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "sgp_print_jobs_insert" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_insert" ON sgp.print_jobs FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_personal()));

DROP POLICY IF EXISTS "sgp_print_jobs_update" ON sgp.print_jobs;
CREATE POLICY "sgp_print_jobs_update" ON sgp.print_jobs FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_personal())) WITH CHECK ((SELECT sgp.es_personal()));

-- Quedan SOLO admin (no se tocan): INSERT/UPDATE de products, INSERT/UPDATE de
-- product_categories, UPDATE de configuracion y sgp.renombrar_categoria() (esta
-- ya chequea rol = 'taberna' por dentro, así que el rol nuevo no la puede usar).

-- ─── 3. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN to_regprocedure('sgp.es_personal()') IS NULL THEN 'FALTA: función sgp.es_personal'
    WHEN to_regprocedure('sgp.es_solo_pedidos()') IS NULL THEN 'FALTA: función sgp.es_solo_pedidos'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') > 0
      THEN 'FALTA: quedan policies DELETE'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND policyname IN (
            'sgp_products_select', 'sgp_product_categories_select', 'sgp_configuracion_select',
            'sgp_orders_select', 'sgp_orders_insert', 'sgp_orders_update',
            'sgp_order_items_select', 'sgp_order_items_insert',
            'sgp_order_status_log_select', 'sgp_order_status_log_insert',
            'sgp_print_jobs_select', 'sgp_print_jobs_insert', 'sgp_print_jobs_update')
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_personal%') <> 13
      THEN 'FALTA: las 13 policies con es_personal'
    WHEN (SELECT with_check FROM pg_policies WHERE schemaname = 'sgp' AND policyname = 'sgp_orders_update') NOT LIKE '%es_solo_pedidos%'
      THEN 'FALTA: sgp_orders_update sin el límite del rol solo pedidos'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND policyname IN (
            'sgp_products_insert', 'sgp_products_update', 'sgp_product_categories_insert',
            'sgp_product_categories_update', 'sgp_configuracion_update')
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_personal%') > 0
      THEN 'FALTA: una policy de admin quedó abierta al rol solo pedidos'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
