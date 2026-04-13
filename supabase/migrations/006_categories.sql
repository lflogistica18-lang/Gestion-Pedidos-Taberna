-- SGP Migration 006: Tabla de categorías de productos
-- Permite crear categorías dinámicamente desde la UI

CREATE TABLE sgp.product_categories (
  name TEXT PRIMARY KEY,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar categorías existentes
INSERT INTO sgp.product_categories (name, sort_order) VALUES
  ('comida', 1),
  ('bebida', 2),
  ('postre', 3);

-- Eliminar el CHECK constraint fijo de products.category
-- (Postgres auto-genera el nombre como products_category_check)
ALTER TABLE sgp.products DROP CONSTRAINT IF EXISTS products_category_check;

-- RLS para product_categories
ALTER TABLE sgp.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgp_product_categories_select" ON sgp.product_categories FOR SELECT USING (true);
CREATE POLICY "sgp_product_categories_insert" ON sgp.product_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "sgp_product_categories_delete" ON sgp.product_categories FOR DELETE USING (true);

GRANT ALL ON sgp.product_categories TO anon, authenticated, service_role;
