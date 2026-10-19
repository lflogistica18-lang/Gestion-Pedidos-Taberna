-- ============================================================
-- SGP Migration 010: Seguridad (RLS real + rol) y columnas faltantes
-- Resultado de la auditoría Omni 2026-10-19 (bloqueantes 1, 4 y 5)
--
-- Antes de esta migración todas las policies eran USING (true) y las tablas
-- estaban otorgadas a `anon`: cualquiera con la anon key (que viaja en el JS
-- público) podía leer, escribir y borrar ventas sin loguearse.
--
-- Ahora: solo usuarios autenticados con `app_metadata.rol = 'taberna'`.
-- El rol va en app_metadata (lo edita solo el admin), nunca en user_metadata
-- (lo edita el propio usuario).
-- ============================================================

-- ─── 1. Columnas que el código ya usaba pero ninguna migración creaba ──
ALTER TABLE sgp.products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE sgp.products DROP CONSTRAINT IF EXISTS products_cost_check;
ALTER TABLE sgp.products ADD CONSTRAINT products_cost_check CHECK (cost >= 0);

-- Precio con precisión fija (antes NUMERIC sin escala)
ALTER TABLE sgp.products ALTER COLUMN price TYPE NUMERIC(12,2);
ALTER TABLE sgp.orders ALTER COLUMN total TYPE NUMERIC(12,2);
ALTER TABLE sgp.order_items ALTER COLUMN unit_price TYPE NUMERIC(12,2);

-- product_categories: columnas obligatorias del Omni (id, updated_at, deleted_at).
-- `name` sigue siendo la PK porque products.category la referencia por nombre.
ALTER TABLE sgp.product_categories
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON sgp.product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON sgp.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();

-- ─── 2. Índices: FK sin índice y parciales de activos ─────────────────
CREATE INDEX IF NOT EXISTS idx_sgp_order_items_product_id
  ON sgp.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_sgp_orders_activos
  ON sgp.orders(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sgp_products_activos
  ON sgp.products(category, name) WHERE active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sgp_product_categories_activas
  ON sgp.product_categories(sort_order) WHERE deleted_at IS NULL;

-- ─── 3. Renombrar categoría en una sola transacción ───────────────────
-- Antes el frontend hacía insert → update productos → delete en 3 llamadas:
-- si fallaba la 2ª quedaba la categoría duplicada.
CREATE OR REPLACE FUNCTION sgp.renombrar_categoria(p_viejo TEXT, p_nuevo TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_nuevo IS NULL OR btrim(p_nuevo) = '' THEN
    RAISE EXCEPTION 'El nombre no puede estar vacío';
  END IF;
  IF p_nuevo = p_viejo THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM sgp.product_categories WHERE name = p_nuevo AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Ya existe una categoría "%"', p_nuevo;
  END IF;

  -- Si el nombre nuevo existía borrado, lo sacamos del medio para no chocar con la PK
  DELETE FROM sgp.product_categories WHERE name = p_nuevo AND deleted_at IS NOT NULL;

  UPDATE sgp.product_categories SET name = p_nuevo WHERE name = p_viejo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la categoría "%"', p_viejo;
  END IF;

  UPDATE sgp.products SET category = p_nuevo WHERE category = p_viejo;
END;
$$;

-- ─── 4. Rol de la app en app_metadata ─────────────────────────────────
-- ⚠️ AJUSTAR EL FILTRO si los usuarios de la taberna no usan ese dominio.
-- Para un usuario puntual:
--   UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"rol":"taberna"}'
--   WHERE email = 'alguien@mail.com';
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"taberna"}'::jsonb
WHERE email ILIKE '%@sgc-taberna.com';

-- Helper: se evalúa una vez por consulta gracias al (SELECT ...) en las policies
CREATE OR REPLACE FUNCTION sgp.es_taberna()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT auth.jwt())->'app_metadata'->>'rol', '') = 'taberna'
$$;

-- ─── 5. Fuera anon, fuera policies abiertas ───────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA sgp FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA sgp FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sgp FROM anon;
REVOKE USAGE ON SCHEMA sgp FROM anon;

GRANT USAGE ON SCHEMA sgp TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA sgp TO authenticated;
REVOKE DELETE ON ALL TABLES IN SCHEMA sgp FROM authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA sgp TO authenticated;
GRANT EXECUTE ON FUNCTION sgp.renombrar_categoria(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sgp.es_taberna() TO authenticated;

DROP POLICY IF EXISTS "sgp_products_select" ON sgp.products;
DROP POLICY IF EXISTS "sgp_products_insert" ON sgp.products;
DROP POLICY IF EXISTS "sgp_products_update" ON sgp.products;
DROP POLICY IF EXISTS "sgp_orders_select" ON sgp.orders;
DROP POLICY IF EXISTS "sgp_orders_insert" ON sgp.orders;
DROP POLICY IF EXISTS "sgp_orders_update" ON sgp.orders;
DROP POLICY IF EXISTS "sgp_orders_delete" ON sgp.orders;
DROP POLICY IF EXISTS "sgp_order_items_select" ON sgp.order_items;
DROP POLICY IF EXISTS "sgp_order_items_insert" ON sgp.order_items;
DROP POLICY IF EXISTS "sgp_order_items_delete" ON sgp.order_items;
DROP POLICY IF EXISTS "sgp_order_status_log_select" ON sgp.order_status_log;
DROP POLICY IF EXISTS "sgp_order_status_log_insert" ON sgp.order_status_log;
DROP POLICY IF EXISTS "sgp_order_status_log_delete" ON sgp.order_status_log;
DROP POLICY IF EXISTS "sgp_product_categories_select" ON sgp.product_categories;
DROP POLICY IF EXISTS "sgp_product_categories_insert" ON sgp.product_categories;
DROP POLICY IF EXISTS "sgp_product_categories_delete" ON sgp.product_categories;

-- ─── 6. Policies nuevas: rol taberna en todo; sin DELETE en ninguna ───
-- products: deleted_at se filtra en la policy (el catálogo no tiene papelera)
CREATE POLICY "sgp_products_select" ON sgp.products FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);
CREATE POLICY "sgp_products_insert" ON sgp.products FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_products_update" ON sgp.products FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

-- orders: el SELECT no filtra deleted_at porque la pantalla Historial tiene
-- pestaña Papelera (lo filtran las queries de Caja, Cocina y Reportes)
CREATE POLICY "sgp_orders_select" ON sgp.orders FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_orders_insert" ON sgp.orders FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_orders_update" ON sgp.orders FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_order_items_select" ON sgp.order_items FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_order_items_insert" ON sgp.order_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

-- order_status_log: lo escriben los triggers, que corren con los permisos
-- del usuario que hizo el INSERT/UPDATE en orders → necesita la policy
CREATE POLICY "sgp_order_status_log_select" ON sgp.order_status_log FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_order_status_log_insert" ON sgp.order_status_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_product_categories_select" ON sgp.product_categories FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_product_categories_insert" ON sgp.product_categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_product_categories_update" ON sgp.product_categories FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

-- ─── 7. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') > 0
      THEN 'FALTA: quedan policies DELETE'
    WHEN has_schema_privilege('anon', 'sgp', 'USAGE')
      THEN 'FALTA: anon todavía tiene USAGE en sgp'
    WHEN (SELECT count(*) FROM auth.users WHERE raw_app_meta_data->>'rol' = 'taberna') = 0
      THEN 'FALTA: ningún usuario tiene rol taberna (ver paso 4)'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sgp' AND table_name = 'products' AND column_name = 'cost')
      THEN 'FALTA: products.cost'
    ELSE 'OK'
  END AS verificacion;
