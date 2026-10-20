-- ============================================================================
-- instalar_sgp_desde_cero.sql — instala el SGP (La Taberna) limpio en el proyecto
-- Supabase zslsosunvsbxxnzeckpg, schema `sgp`. Generado juntando las migraciones
-- 001 a 012 + seed, en orden. Se pega ENTERO en el SQL Editor y se corre una vez.
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
-- RESULTADO: las tres consultas de verificación (010, 011, 012) tienen que decir OK.
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

COMMIT;
