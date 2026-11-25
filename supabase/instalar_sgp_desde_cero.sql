-- ============================================================================
-- instalar_sgp_desde_cero.sql — instala el SGP (La Taberna) limpio en el proyecto
-- Supabase zslsosunvsbxxnzeckpg, schema `sgp`. Generado juntando las migraciones
-- 001 a 014 + seed, en orden. Se pega ENTERO en el SQL Editor y se corre una vez.
--
-- QUÉ BORRA: solo lo de la Taberna — el schema `sgp` (restos: secuencia y funciones)
-- y `papelera_sgp` (las 5 tablas que la limpieza de octubre movió ahí). Los datos
-- eran de prueba (decisión de Lucas, 2026-10-19). NO toca `public` (dropshipping),
-- `cotizador` ni ningún otro schema.
--
-- ANTES:  crear en Authentication → Users el/los usuarios de la Taberna. El paso 4 de
--         la migración 010 les da el rol a los que tengan mail @sgc-taberna.com; si
--         usan otro mail, cambiá ese WHERE antes de correr (buscá "sgc-taberna").
-- DESPUÉS: Settings → API → Exposed schemas: que figure `sgp`. Los usuarios cierran
--         sesión y vuelven a entrar (el rol viaja en el token).
-- RESULTADO: las cinco consultas de verificación (010, 011, 012, 013, 014) tienen que decir OK.
-- ============================================================================

BEGIN;

DROP SCHEMA IF EXISTS papelera_sgp CASCADE;
DROP SCHEMA IF EXISTS sgp CASCADE;

-- >>>>>>>>>>>>>>>>>>>> migrations/001_products.sql
-- ============================================================
-- SGP Migration 001: Schema + Tabla Products
-- Usa schema 'sgp' para aislar del resto del proyecto Supabase
-- ============================================================

CREATE SCHEMA IF NOT EXISTS sgp;

CREATE TABLE sgp.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comida', 'bebida', 'postre')),
  price NUMERIC NOT NULL CHECK (price >= 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sgp_products_category ON sgp.products(category);
CREATE INDEX idx_sgp_products_active ON sgp.products(active);

CREATE OR REPLACE FUNCTION sgp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON sgp.products
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();

-- >>>>>>>>>>>>>>>>>>>> migrations/002_orders.sql
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

-- >>>>>>>>>>>>>>>>>>>> migrations/003_rls_policies.sql
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

-- >>>>>>>>>>>>>>>>>>>> migrations/004_customer_fields.sql
-- Migration 004: Campos de cliente para pedidos
-- customer_name: nombre de quien pidio (para entrega)
-- delivery_address: obligatorio cuando type = 'delivery'

ALTER TABLE sgp.orders
  ADD COLUMN customer_name TEXT,
  ADD COLUMN delivery_address TEXT;

-- >>>>>>>>>>>>>>>>>>>> migrations/005_rls_delete_policies.sql
-- SGP Migration 005: RLS Delete Policies
-- Permite eliminar pedidos (y por cascada ítems e historial)

CREATE POLICY "sgp_orders_delete" ON sgp.orders FOR DELETE USING (true);
CREATE POLICY "sgp_order_items_delete" ON sgp.order_items FOR DELETE USING (true);
CREATE POLICY "sgp_order_status_log_delete" ON sgp.order_status_log FOR DELETE USING (true);

-- >>>>>>>>>>>>>>>>>>>> migrations/006_categories.sql
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

-- >>>>>>>>>>>>>>>>>>>> migrations/007_directo_order_type.sql
-- SGP Migration 007: Agregar tipo de pedido 'directo' (entrega inmediata, sin pasar por KDS)
-- El pedido se crea directamente como 'entregado', no aparece en la cocina

-- Eliminar constraint anterior y recrear con 'directo'
ALTER TABLE sgp.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE sgp.orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('local', 'delivery', 'directo'));

-- >>>>>>>>>>>>>>>>>>>> migrations/008_soft_delete_orders.sql
-- ============================================================
-- SGP Migration 008: Agregar soft-delete a Orders
-- ============================================================

ALTER TABLE sgp.orders ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Ignorar ordenes borradas lógicamente
-- (Deberás aplicar reglas RLS o cambiar las views si corresponde)

-- >>>>>>>>>>>>>>>>>>>> migrations/009_order_status_cancelado.sql
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

-- >>>>>>>>>>>>>>>>>>>> seed.sql (productos de ejemplo)
INSERT INTO sgp.products (name, category, price) VALUES
  ('Hamburguesa Clásica', 'comida', 3500),
  ('Hamburguesa Completa', 'comida', 4200),
  ('Milanesa Napolitana', 'comida', 4800),
  ('Papas Fritas', 'comida', 2000),
  ('Empanadas (x3)', 'comida', 2400),
  ('Pizza Muzzarella', 'comida', 5500),
  ('Lomito Completo', 'comida', 5000),
  ('Tostado J&Q', 'comida', 2800),
  ('Coca-Cola 500ml', 'bebida', 1500),
  ('Agua Mineral 500ml', 'bebida', 1000),
  ('Cerveza Artesanal', 'bebida', 2500),
  ('Fernet con Coca', 'bebida', 3000),
  ('Café con Leche', 'bebida', 1800),
  ('Jugo de Naranja', 'bebida', 1600),
  ('Flan Casero', 'postre', 2200),
  ('Brownie con Helado', 'postre', 2800),
  ('Ensalada de Frutas', 'postre', 2000);

-- >>>>>>>>>>>>>>>>>>>> migrations/010_seguridad_rls_y_columnas.sql
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
-- subtotal es columna generada sobre unit_price: Postgres no deja cambiar el tipo
-- de unit_price con ella encima, así que se saca y se vuelve a crear igual.
ALTER TABLE sgp.order_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE sgp.order_items ALTER COLUMN unit_price TYPE NUMERIC(12,2);
ALTER TABLE sgp.order_items
  ADD COLUMN subtotal NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED;

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
-- SECURITY DEFINER: la app no tiene DELETE en ninguna tabla, pero renombrar necesita
-- sacar del medio una categoría vieja ya borrada. El chequeo de rol va adentro.
CREATE OR REPLACE FUNCTION sgp.renombrar_categoria(p_viejo TEXT, p_nuevo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sgp, pg_temp
AS $$
BEGIN
  IF NOT coalesce((SELECT auth.jwt())->'app_metadata'->>'rol', '') = 'taberna' THEN
    RAISE EXCEPTION 'No tenés permiso para renombrar categorías';
  END IF;
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
-- Postgres da EXECUTE a PUBLIC por defecto: a la función con permisos propios, solo authenticated
REVOKE EXECUTE ON FUNCTION sgp.renombrar_categoria(TEXT, TEXT) FROM PUBLIC;
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

-- >>>>>>>>>>>>>>>>>>>> migrations/011_cola_impresion.sql
-- ============================================================
-- SGP Migration 011: Cola de impresión (print server)
-- La app deja un "trabajo" por ticket; el print server de la PC del local
-- lo escucha por realtime, lo manda a la comandera WiFi y lo marca impreso.
-- Solo se usa con MODO_IMPRESION = 'servidor' (src/shared/lib/config.ts).
-- Requiere la migración 010 (función sgp.es_taberna()).
-- ============================================================

CREATE TABLE IF NOT EXISTS sgp.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sgp.orders(id),
  tipo TEXT NOT NULL DEFAULT 'ticket' CHECK (tipo IN ('ticket')),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'imprimiendo', 'impreso', 'error')),
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_error TEXT,
  impreso_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- FK con índice + parcial para lo que el server busca seguido
CREATE INDEX IF NOT EXISTS idx_sgp_print_jobs_order_id ON sgp.print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_sgp_print_jobs_pendientes
  ON sgp.print_jobs(created_at) WHERE estado = 'pendiente' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS update_print_jobs_updated_at ON sgp.print_jobs;
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON sgp.print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();

ALTER TABLE sgp.print_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sgp.print_jobs TO authenticated;

CREATE POLICY "sgp_print_jobs_select" ON sgp.print_jobs FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);
CREATE POLICY "sgp_print_jobs_insert" ON sgp.print_jobs FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_print_jobs_update" ON sgp.print_jobs FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

ALTER PUBLICATION supabase_realtime ADD TABLE sgp.print_jobs;

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN to_regclass('sgp.print_jobs') IS NULL THEN 'FALTA: tabla sgp.print_jobs'
    WHEN NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'sgp' AND tablename = 'print_jobs')
      THEN 'FALTA: print_jobs en realtime'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'print_jobs') < 3
      THEN 'FALTA: policies de print_jobs'
    ELSE 'OK'
  END AS verificacion;

-- >>>>>>>>>>>>>>>>>>>> migrations/012_configuracion.sql
-- ============================================================
-- SGP Migration 012: Configuración del local (una sola fila)
-- Reemplaza las constantes de src/shared/lib/config.ts y parte del .env del
-- print server. La app la lee al entrar y la edita la pantalla Configuración.
-- Requiere la migración 010 (función sgp.es_taberna()).
-- ============================================================

CREATE TABLE IF NOT EXISTS sgp.configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Garantiza una sola fila: solo puede valer true y es UNIQUE
  unica BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK (unica),

  -- Local (sale en el ticket)
  nombre_local TEXT NOT NULL DEFAULT 'La Taberna' CHECK (length(btrim(nombre_local)) BETWEEN 1 AND 60),
  direccion TEXT CHECK (direccion IS NULL OR length(direccion) <= 120),
  telefono TEXT CHECK (telefono IS NULL OR length(telefono) <= 40),

  -- Impresión
  modo_impresion TEXT NOT NULL DEFAULT 'navegador' CHECK (modo_impresion IN ('navegador', 'servidor')),
  papel_mm INTEGER NOT NULL DEFAULT 80 CHECK (papel_mm IN (58, 80)),
  pie_ticket TEXT NOT NULL DEFAULT '¡Gracias por su compra!' CHECK (length(pie_ticket) <= 120),

  -- Pantallas
  cocina_activa BOOLEAN NOT NULL DEFAULT false,

  -- Medios de pago que ofrece la Caja (valores de orders.payment_method)
  medios_pago TEXT[] NOT NULL DEFAULT ARRAY['efectivo', 'transferencia']
    CHECK (cardinality(medios_pago) >= 1
           AND medios_pago <@ ARRAY['efectivo', 'debito', 'transferencia']),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

DROP TRIGGER IF EXISTS update_configuracion_updated_at ON sgp.configuracion;
CREATE TRIGGER update_configuracion_updated_at
  BEFORE UPDATE ON sgp.configuracion
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();

-- La fila única, con los valores que hoy están en el código
INSERT INTO sgp.configuracion (unica) VALUES (true) ON CONFLICT (unica) DO NOTHING;

ALTER TABLE sgp.configuracion ENABLE ROW LEVEL SECURITY;

-- Solo leer y modificar: la fila no se crea ni se borra desde la app
GRANT SELECT, UPDATE ON sgp.configuracion TO authenticated;

CREATE POLICY "sgp_configuracion_select" ON sgp.configuracion FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()) AND deleted_at IS NULL);
CREATE POLICY "sgp_configuracion_update" ON sgp.configuracion FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN to_regclass('sgp.configuracion') IS NULL THEN 'FALTA: tabla sgp.configuracion'
    WHEN (SELECT count(*) FROM sgp.configuracion) <> 1 THEN 'FALTA: tiene que haber exactamente una fila'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'configuracion') < 2
      THEN 'FALTA: policies de configuracion'
    ELSE 'OK'
  END AS verificacion;

-- >>>>>>>>>>>>>>>>>>>> migrations/013_rol_solo_pedidos.sql
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


-- >>>>>>>>>>>>>>>>>>>> migrations/014_editar_y_anular_pedido.sql
-- ============================================================
-- SGP Migration 014: Editar y anular pedidos desde la vista de Pedidos
-- Los dos roles de la app (admin 'taberna' y solo pedidos 'taberna_pedidos') pueden:
--   * EDITAR un pedido que todavía no se entregó: es el mismo pedido (mismo número),
--     se reemplazan sus líneas y queda un historial de ediciones (sgp.order_edits).
--   * ANULAR un pedido con un motivo escrito: va a la papelera (deleted_at) y queda
--     quién lo anuló y por qué.
-- Todo pasa por dos funciones SECURITY DEFINER que chequean el rol por dentro; las
-- policies de la 013 NO cambian (el rol solo pedidos sigue sin poder mandar a la
-- papelera por UPDATE directo). El precio y el nombre de cada línea los decide la
-- base: el front no puede fijarlos.
--
-- Requiere las migraciones 010 y 013 (sgp.es_taberna, es_personal, es_solo_pedidos).
-- Vuelta atrás: 014_editar_y_anular_pedido.rollback.sql
-- Prueba de roles: supabase/pruebas/014_prueba_rls.sql
-- ============================================================


-- ─── 1. Columnas nuevas en sgp.orders ────────────────────────────────
ALTER TABLE sgp.orders
  ADD COLUMN IF NOT EXISTS anulado_por TEXT,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS editado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ediciones INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Historial de ediciones: solo lo escribe sgp.editar_pedido ────
CREATE TABLE IF NOT EXISTS sgp.order_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sgp.orders(id),
  editado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  antes JSONB NOT NULL,
  despues JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sgp_order_edits_order_id ON sgp.order_edits(order_id);

ALTER TABLE sgp.order_edits ENABLE ROW LEVEL SECURITY;

-- Solo lectura para la app; sin policies de INSERT/UPDATE/DELETE
REVOKE ALL ON sgp.order_edits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON sgp.order_edits TO authenticated;

DROP POLICY IF EXISTS "sgp_order_edits_select" ON sgp.order_edits;
CREATE POLICY "sgp_order_edits_select" ON sgp.order_edits FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

-- ─── 3. sgp.editar_pedido ────────────────────────────────────────────
-- p_items: [{ "product_id": uuid, "quantity": int, "notes": text|null (opcional) }]
-- Cualquier otro campo del JSON (por ejemplo unit_price) se ignora.
CREATE OR REPLACE FUNCTION sgp.editar_pedido(
  p_order_id UUID,
  p_items JSONB,
  p_type TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_customer_name TEXT,
  p_delivery_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pedido sgp.orders%ROWTYPE;
  v_viejo sgp.order_items%ROWTYPE;
  v_prod sgp.products%ROWTYPE;
  v_elem JSONB;
  v_pid UUID;
  v_cant NUMERIC;
  v_nombre TEXT;
  v_precio NUMERIC(12,2);
  v_nota TEXT;
  v_vistos UUID[] := ARRAY[]::UUID[];
  v_lineas JSONB := '[]'::JSONB;
  v_total NUMERIC(12,2) := 0;
  v_email TEXT;
  v_cliente TEXT;
  v_direccion TEXT;
  v_notas TEXT;
  v_antes JSONB;
  v_despues JSONB;
BEGIN
  IF NOT (SELECT sgp.es_personal()) THEN
    RAISE EXCEPTION 'No tenés permiso' USING ERRCODE = '42501';
  END IF;

  -- Bloquea la fila: dos personas editando a la vez se hacen cola
  SELECT * INTO v_pedido FROM sgp.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;
  IF v_pedido.deleted_at IS NOT NULL OR v_pedido.status IN ('entregado', 'cancelado') THEN
    RAISE EXCEPTION 'El pedido ya fue entregado o anulado: no se puede editar';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('local', 'delivery') THEN
    RAISE EXCEPTION 'El tipo de pedido no es válido';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('efectivo', 'debito', 'transferencia') THEN
    RAISE EXCEPTION 'El medio de pago no es válido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido tiene que tener al menos un producto';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'El pedido tiene demasiados productos';
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END IF;

    BEGIN
      v_pid := (v_elem->>'product_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END;
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END IF;
    IF v_pid = ANY (v_vistos) THEN
      RAISE EXCEPTION 'Hay un producto repetido en el pedido';
    END IF;
    v_vistos := v_vistos || v_pid;

    IF jsonb_typeof(v_elem->'quantity') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'La cantidad de un producto no es válida';
    END IF;
    v_cant := (v_elem->>'quantity')::NUMERIC;
    IF v_cant <> trunc(v_cant) OR v_cant < 1 OR v_cant > 999 THEN
      RAISE EXCEPTION 'La cantidad de un producto no es válida (de 1 a 999)';
    END IF;

    -- Precio y nombre: si la línea ya estaba, se conservan; si es nueva, del catálogo.
    -- Lo que mande el cliente en unit_price / product_name se ignora.
    SELECT * INTO v_viejo
      FROM sgp.order_items
      WHERE order_id = p_order_id AND product_id = v_pid
      ORDER BY id LIMIT 1;
    IF FOUND THEN
      v_nombre := v_viejo.product_name;
      v_precio := v_viejo.unit_price;
      IF v_elem ? 'notes' THEN
        v_nota := nullif(btrim(v_elem->>'notes'), '');
      ELSE
        v_nota := v_viejo.notes;
      END IF;
    ELSE
      SELECT * INTO v_prod
        FROM sgp.products
        WHERE id = v_pid AND active = true AND deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Hay un producto que ya no está disponible';
      END IF;
      v_nombre := v_prod.name;
      v_precio := v_prod.price;
      v_nota := nullif(btrim(v_elem->>'notes'), '');
    END IF;

    v_lineas := v_lineas || jsonb_build_object(
      'product_id', v_pid,
      'product_name', v_nombre,
      'unit_price', v_precio,
      'quantity', v_cant::INTEGER,
      'notes', v_nota
    );
    v_total := v_total + v_precio * v_cant;
  END LOOP;

  v_cliente := nullif(btrim(p_customer_name), '');
  v_notas := nullif(btrim(p_notes), '');
  v_direccion := CASE WHEN p_type = 'delivery' THEN nullif(btrim(p_delivery_address), '') ELSE NULL END;

  -- Foto de antes (pedido + líneas)
  v_antes := jsonb_build_object(
    'pedido', jsonb_build_object(
      'type', v_pedido.type,
      'payment_method', v_pedido.payment_method,
      'notes', v_pedido.notes,
      'customer_name', v_pedido.customer_name,
      'delivery_address', v_pedido.delivery_address,
      'total', v_pedido.total
    ),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', i.product_id,
        'product_name', i.product_name,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'notes', i.notes
      ) ORDER BY i.id)
      FROM sgp.order_items i
      WHERE i.order_id = p_order_id
    ), '[]'::JSONB)
  );

  v_despues := jsonb_build_object(
    'pedido', jsonb_build_object(
      'type', p_type,
      'payment_method', p_payment_method,
      'notes', v_notas,
      'customer_name', v_cliente,
      'delivery_address', v_direccion,
      'total', v_total
    ),
    'items', v_lineas
  );

  -- Reemplazar las líneas (subtotal es columna generada: no se inserta)
  DELETE FROM sgp.order_items WHERE order_id = p_order_id;

  INSERT INTO sgp.order_items (order_id, product_id, product_name, unit_price, quantity, notes)
  SELECT p_order_id, l.product_id, l.product_name, l.unit_price, l.quantity, l.notes
  FROM jsonb_to_recordset(v_lineas) AS l(
    product_id UUID, product_name TEXT, unit_price NUMERIC, quantity INTEGER, notes TEXT
  );

  -- No toca status ni order_number
  UPDATE sgp.orders SET
    total = v_total,
    type = p_type,
    payment_method = p_payment_method,
    notes = v_notas,
    customer_name = v_cliente,
    delivery_address = v_direccion,
    editado_at = now(),
    ediciones = ediciones + 1
  WHERE id = p_order_id;

  v_email := coalesce((SELECT auth.jwt())->>'email', 'desconocido');

  INSERT INTO sgp.order_edits (order_id, editado_por, antes, despues)
  VALUES (p_order_id, v_email, v_antes, v_despues);

  RETURN p_order_id;
END;
$$;

-- ─── 4. sgp.anular_pedido ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sgp.anular_pedido(p_order_id UUID, p_motivo TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pedido sgp.orders%ROWTYPE;
  v_motivo TEXT;
BEGIN
  IF NOT (SELECT sgp.es_personal()) THEN
    RAISE EXCEPTION 'No tenés permiso' USING ERRCODE = '42501';
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF length(v_motivo) < 3 THEN
    RAISE EXCEPTION 'Escribí el motivo de la anulación (mínimo 3 letras)';
  END IF;
  IF length(v_motivo) > 200 THEN
    RAISE EXCEPTION 'El motivo es muy largo (máximo 200 caracteres)';
  END IF;

  SELECT * INTO v_pedido FROM sgp.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;
  IF v_pedido.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'El pedido ya está anulado';
  END IF;
  IF v_pedido.status = 'entregado' AND (SELECT sgp.es_solo_pedidos()) THEN
    RAISE EXCEPTION 'Un pedido entregado solo lo puede anular el administrador';
  END IF;

  UPDATE sgp.orders SET
    deleted_at = now(),
    anulado_por = coalesce((SELECT auth.jwt())->>'email', 'desconocido'),
    motivo_anulacion = v_motivo
  WHERE id = p_order_id;

  RETURN p_order_id;
END;
$$;

-- ─── 5. Permisos: solo usuarios logueados, nunca anon ni PUBLIC ──────
REVOKE EXECUTE ON FUNCTION sgp.editar_pedido(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION sgp.anular_pedido(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sgp.editar_pedido(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sgp.anular_pedido(UUID, TEXT) TO authenticated;

-- ─── 6. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN (SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'sgp' AND table_name = 'orders'
              AND column_name IN ('anulado_por', 'motivo_anulacion', 'editado_at', 'ediciones')) <> 4
      THEN 'FALTA: columnas nuevas de sgp.orders'
    WHEN to_regclass('sgp.order_edits') IS NULL THEN 'FALTA: tabla sgp.order_edits'
    WHEN NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'sgp.order_edits'::regclass)
      THEN 'FALTA: RLS en sgp.order_edits'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'order_edits') <> 1
      THEN 'FALTA: sgp.order_edits tiene que tener una sola policy (SELECT)'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'order_edits'
            AND policyname = 'sgp_order_edits_select' AND cmd = 'SELECT'
            AND qual LIKE '%es_taberna%') <> 1
      THEN 'FALTA: policy de SELECT solo admin en sgp.order_edits'
    WHEN to_regprocedure('sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)') IS NULL
      THEN 'FALTA: función sgp.editar_pedido'
    WHEN to_regprocedure('sgp.anular_pedido(uuid,text)') IS NULL
      THEN 'FALTA: función sgp.anular_pedido'
    WHEN NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)'::regprocedure)
      THEN 'FALTA: sgp.editar_pedido no es SECURITY DEFINER'
    WHEN NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.anular_pedido(uuid,text)'::regprocedure)
      THEN 'FALTA: sgp.anular_pedido no es SECURITY DEFINER'
    WHEN has_function_privilege('anon', 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
      OR has_function_privilege('anon', 'sgp.anular_pedido(uuid,text)', 'EXECUTE')
      THEN 'FALTA: anon puede ejecutar las funciones'
    WHEN EXISTS (
           SELECT 1 FROM pg_proc p,
                LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
           WHERE p.oid IN ('sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)'::regprocedure,
                           'sgp.anular_pedido(uuid,text)'::regprocedure)
             AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
      THEN 'FALTA: PUBLIC puede ejecutar las funciones'
    WHEN NOT has_function_privilege('authenticated', 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
      OR NOT has_function_privilege('authenticated', 'sgp.anular_pedido(uuid,text)', 'EXECUTE')
      THEN 'FALTA: authenticated no puede ejecutar las funciones'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    ELSE 'OK'
  END AS verificacion;


COMMIT;
