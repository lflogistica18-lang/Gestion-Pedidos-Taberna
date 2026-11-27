-- ============================================================
-- SGP Migration 016: Pagos al personal (solo admin)
-- Empleadas con sueldo SEMANAL fijo, conceptos de extra/descuento configurables,
-- un pago por empleada y semana (con la foto de los números de ese día), novedades
-- (inasistencia, llegada tarde, adelanto, charla) y el bucket privado de recibos PDF.
--
-- Tablas nuevas (todas en el esquema sgp):
--   sgp.empleados, sgp.conceptos_pago, sgp.pagos_personal,
--   sgp.pagos_personal_items, sgp.novedades_personal
-- Columna nueva: sgp.configuracion.dia_pago (0 = domingo … 6 = sábado; 5 = viernes)
-- Bucket privado: sgp-recibos (solo application/pdf, hasta 5 MB)
--
-- Seguridad: RLS con (SELECT sgp.es_taberna()) = solo admin. El rol 'taberna_pedidos'
-- (ventas@) no ve ni escribe nada de esto. Sin anon. Sin DELETE: se desactiva con
-- deleted_at. Las SELECT no filtran deleted_at (como sgp.orders): lo filtra la app;
-- así un soft delete con RETURNING no falla.
-- Montos NUMERIC(12,2) en pesos, >= 0.
--
-- Triggers (todas SECURITY INVOKER, search_path vacío; nada necesita más permisos):
--   * pagos_personal: candado de 'pagado', totales calculados por la base, updated_at.
--   * pagos_personal_items: candado (no se toca un pago pagado) y recálculo del pago.
--
-- Requiere las migraciones 001, 010, 012 y 013.
-- Vuelta atrás: 016_personal.rollback.sql
-- Prueba de roles: supabase/pruebas/016_prueba_rls.sql
-- ============================================================

BEGIN;

-- ─── 1. Día de pago en la configuración ───────────────────────────────
ALTER TABLE sgp.configuracion
  ADD COLUMN IF NOT EXISTS dia_pago SMALLINT NOT NULL DEFAULT 5 CHECK (dia_pago BETWEEN 0 AND 6);

-- ─── 2. Empleadas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgp.empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 60),
  telefono TEXT CHECK (telefono IS NULL OR length(telefono) <= 40),
  sueldo_semanal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sueldo_semanal >= 0),
  dias_por_semana SMALLINT NOT NULL DEFAULT 6 CHECK (dias_por_semana BETWEEN 1 AND 7),
  fecha_ingreso DATE,
  notas TEXT CHECK (notas IS NULL OR length(notas) <= 500),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ─── 3. Conceptos de extra y de descuento ─────────────────────────────
-- valor: monto fijo ($), porcentaje del sueldo semanal (%) o precio por unidad ($).
-- En modo 'dias_de_sueldo' no se usa y vale 0.
CREATE TABLE IF NOT EXISTS sgp.conceptos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 40),
  tipo TEXT NOT NULL CHECK (tipo IN ('extra', 'descuento')),
  modo TEXT NOT NULL CHECK (modo IN ('fijo', 'porcentaje', 'por_unidad', 'dias_de_sueldo')),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT conceptos_pago_dias_sin_valor CHECK (modo <> 'dias_de_sueldo' OR valor = 0)
);

-- Un solo concepto vivo por nombre (también sirve de destino al ON CONFLICT de la semilla)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sgp_conceptos_pago_nombre
  ON sgp.conceptos_pago (nombre) WHERE deleted_at IS NULL;

-- ─── 4. Pagos (una por empleada y semana) ─────────────────────────────
-- sueldo_semanal y dias_por_semana son la foto del momento. Los tres totales los
-- calcula SIEMPRE la base (trigger): lo que mande la pantalla se pisa.
CREATE TABLE IF NOT EXISTS sgp.pagos_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES sgp.empleados(id),
  semana_desde DATE NOT NULL,
  semana_hasta DATE NOT NULL,
  sueldo_semanal NUMERIC(12,2) NOT NULL CHECK (sueldo_semanal >= 0),
  dias_por_semana SMALLINT NOT NULL CHECK (dias_por_semana BETWEEN 1 AND 7),
  total_extras NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_extras >= 0),
  total_descuentos NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_descuentos >= 0),
  total_a_cobrar NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_a_cobrar >= 0),
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pagado')),
  pagado_at TIMESTAMPTZ,
  medio_pago TEXT CHECK (medio_pago IS NULL OR medio_pago IN ('efectivo', 'transferencia')),
  recibo_ruta TEXT CHECK (recibo_ruta IS NULL OR length(recibo_ruta) <= 300),
  notas TEXT CHECK (notas IS NULL OR length(notas) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT pagos_personal_semana_de_7_dias CHECK (semana_hasta = semana_desde + 6),
  CONSTRAINT pagos_personal_pagado_con_medio CHECK (estado <> 'pagado' OR medio_pago IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sgp_pagos_personal_empleado_semana
  ON sgp.pagos_personal (empleado_id, semana_desde) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sgp_pagos_personal_semana ON sgp.pagos_personal (semana_desde);

-- ─── 5. Novedades de la empleada ──────────────────────────────────────
-- (va antes que los ítems porque los ítems pueden apuntar a una novedad)
-- pago_id se llena cuando la novedad se descuenta en un pago.
CREATE TABLE IF NOT EXISTS sgp.novedades_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES sgp.empleados(id),
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('inasistencia', 'llegada_tarde', 'adelanto', 'charla', 'otro')),
  detalle TEXT NOT NULL DEFAULT '' CHECK (length(detalle) <= 500),
  monto NUMERIC(12,2) CHECK (monto IS NULL OR monto >= 0),
  descontar BOOLEAN NOT NULL DEFAULT false,
  pago_id UUID REFERENCES sgp.pagos_personal(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT novedades_personal_adelanto_con_monto CHECK (tipo <> 'adelanto' OR (monto IS NOT NULL AND monto > 0)),
  CONSTRAINT novedades_personal_descontar_solo_inasistencia CHECK (tipo = 'inasistencia' OR descontar = false)
);

CREATE INDEX IF NOT EXISTS idx_sgp_novedades_personal_empleado ON sgp.novedades_personal (empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_sgp_novedades_personal_pago ON sgp.novedades_personal (pago_id);

-- ─── 6. Ítems de cada pago (extras y descuentos, con foto del concepto) ──
-- monto lo calcula la pantalla (calculos.ts); la base solo suma. Quitar un ítem de un
-- borrador = ponerle deleted_at (no hay DELETE).
CREATE TABLE IF NOT EXISTS sgp.pagos_personal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id UUID NOT NULL REFERENCES sgp.pagos_personal(id),
  concepto_id UUID REFERENCES sgp.conceptos_pago(id),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 40),
  tipo TEXT NOT NULL CHECK (tipo IN ('extra', 'descuento')),
  modo TEXT NOT NULL CHECK (modo IN ('fijo', 'porcentaje', 'por_unidad', 'dias_de_sueldo')),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  novedad_id UUID REFERENCES sgp.novedades_personal(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_sgp_pagos_personal_items_pago ON sgp.pagos_personal_items (pago_id);

-- ─── 7. Triggers ──────────────────────────────────────────────────────
-- updated_at (función ya existente, migración 001)
DROP TRIGGER IF EXISTS update_empleados_updated_at ON sgp.empleados;
CREATE TRIGGER update_empleados_updated_at BEFORE UPDATE ON sgp.empleados
  FOR EACH ROW EXECUTE FUNCTION sgp.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conceptos_pago_updated_at ON sgp.conceptos_pago;
CREATE TRIGGER update_conceptos_pago_updated_at BEFORE UPDATE ON sgp.conceptos_pago
  FOR EACH ROW EXECUTE FUNCTION sgp.update_updated_at_column();

DROP TRIGGER IF EXISTS update_novedades_personal_updated_at ON sgp.novedades_personal;
CREATE TRIGGER update_novedades_personal_updated_at BEFORE UPDATE ON sgp.novedades_personal
  FOR EACH ROW EXECUTE FUNCTION sgp.update_updated_at_column();

-- 7a. Candado del pago. Se dispara PRIMERO (el nombre empieza con "a_"):
--   * se crea siempre como borrador;
--   * un pago 'pagado' no se toca, salvo poner recibo_ruta cuando estaba vacía;
--   * pasar a 'pagado' exige medio de pago y fija pagado_at = now().
CREATE OR REPLACE FUNCTION sgp.pagos_personal_candado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'borrador' THEN
      RAISE EXCEPTION 'Un pago nuevo se crea como borrador; después se marca como pagado.';
    END IF;
    NEW.pagado_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.estado = 'pagado' THEN
    IF OLD.recibo_ruta IS NULL AND NEW.recibo_ruta IS NOT NULL
       AND (to_jsonb(NEW) - 'recibo_ruta' - 'updated_at') = (to_jsonb(OLD) - 'recibo_ruta' - 'updated_at') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Este pago ya está pagado y no se puede modificar. Si hubo un error, hablalo con quien administra el sistema.';
  END IF;

  IF NEW.estado = 'pagado' THEN
    IF NEW.medio_pago IS NULL THEN
      RAISE EXCEPTION 'Para marcar el pago como pagado hay que elegir el medio de pago (efectivo o transferencia).';
    END IF;
    NEW.pagado_at := now();
  ELSE
    NEW.pagado_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 7b. Totales del pago: los calcula la base, nunca la pantalla. Un pago pagado no se recalcula.
CREATE OR REPLACE FUNCTION sgp.pagos_personal_totales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.estado = 'pagado' THEN
    RETURN NEW;
  END IF;

  NEW.total_extras := coalesce((SELECT sum(i.monto) FROM sgp.pagos_personal_items i
                                WHERE i.pago_id = NEW.id AND i.deleted_at IS NULL AND i.tipo = 'extra'), 0);
  NEW.total_descuentos := coalesce((SELECT sum(i.monto) FROM sgp.pagos_personal_items i
                                    WHERE i.pago_id = NEW.id AND i.deleted_at IS NULL AND i.tipo = 'descuento'), 0);
  NEW.total_a_cobrar := NEW.sueldo_semanal + NEW.total_extras - NEW.total_descuentos;

  IF NEW.total_a_cobrar < 0 THEN
    RAISE EXCEPTION 'Los descuentos de la semana superan lo que cobra la empleada: el total a cobrar quedaría en negativo. Revisá los montos.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sgp_pagos_personal_a_candado ON sgp.pagos_personal;
CREATE TRIGGER sgp_pagos_personal_a_candado BEFORE INSERT OR UPDATE ON sgp.pagos_personal
  FOR EACH ROW EXECUTE FUNCTION sgp.pagos_personal_candado();

DROP TRIGGER IF EXISTS sgp_pagos_personal_b_totales ON sgp.pagos_personal;
CREATE TRIGGER sgp_pagos_personal_b_totales BEFORE INSERT OR UPDATE ON sgp.pagos_personal
  FOR EACH ROW EXECUTE FUNCTION sgp.pagos_personal_totales();

DROP TRIGGER IF EXISTS sgp_pagos_personal_c_updated_at ON sgp.pagos_personal;
CREATE TRIGGER sgp_pagos_personal_c_updated_at BEFORE UPDATE ON sgp.pagos_personal
  FOR EACH ROW EXECUTE FUNCTION sgp.update_updated_at_column();

-- 7c. Ítems: candado (un pago pagado no admite ítems nuevos ni cambios) y recálculo.
CREATE OR REPLACE FUNCTION sgp.pagos_personal_items_candado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_estado TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.pago_id <> OLD.pago_id THEN
    RAISE EXCEPTION 'Un ítem no se puede pasar de un pago a otro.';
  END IF;

  SELECT estado INTO v_estado FROM sgp.pagos_personal WHERE id = NEW.pago_id;
  IF v_estado = 'pagado' THEN
    RAISE EXCEPTION 'Este pago ya está pagado: no se pueden agregar, cambiar ni quitar extras o descuentos.';
  END IF;
  RETURN NEW;
END;
$$;

-- Tocar el pago dispara sus triggers BEFORE, que recalculan los totales con los ítems vivos.
CREATE OR REPLACE FUNCTION sgp.pagos_personal_items_recalcular()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE sgp.pagos_personal SET updated_at = now() WHERE id = NEW.pago_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sgp_pagos_personal_items_a_candado ON sgp.pagos_personal_items;
CREATE TRIGGER sgp_pagos_personal_items_a_candado BEFORE INSERT OR UPDATE ON sgp.pagos_personal_items
  FOR EACH ROW EXECUTE FUNCTION sgp.pagos_personal_items_candado();

DROP TRIGGER IF EXISTS sgp_pagos_personal_items_b_recalcular ON sgp.pagos_personal_items;
CREATE TRIGGER sgp_pagos_personal_items_b_recalcular AFTER INSERT OR UPDATE ON sgp.pagos_personal_items
  FOR EACH ROW EXECUTE FUNCTION sgp.pagos_personal_items_recalcular();

-- ─── 8. Semilla de conceptos (ON CONFLICT por nombre: no pisa lo que ya editó el dueño) ──
INSERT INTO sgp.conceptos_pago (nombre, tipo, modo, valor) VALUES
  ('Adelanto', 'descuento', 'fijo', 0),
  ('Inasistencia', 'descuento', 'dias_de_sueldo', 0)
ON CONFLICT (nombre) WHERE deleted_at IS NULL DO NOTHING;

-- ─── 9. RLS: solo admin, sin DELETE, sin anon ─────────────────────────
ALTER TABLE sgp.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.conceptos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.pagos_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.pagos_personal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgp.novedades_personal ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON sgp.empleados, sgp.conceptos_pago, sgp.pagos_personal,
              sgp.pagos_personal_items, sgp.novedades_personal FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON sgp.empleados, sgp.conceptos_pago, sgp.pagos_personal,
                                sgp.pagos_personal_items, sgp.novedades_personal TO authenticated;

CREATE POLICY "sgp_empleados_select" ON sgp.empleados FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_empleados_insert" ON sgp.empleados FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_empleados_update" ON sgp.empleados FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_conceptos_pago_select" ON sgp.conceptos_pago FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_conceptos_pago_insert" ON sgp.conceptos_pago FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_conceptos_pago_update" ON sgp.conceptos_pago FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_pagos_personal_select" ON sgp.pagos_personal FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_pagos_personal_insert" ON sgp.pagos_personal FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_pagos_personal_update" ON sgp.pagos_personal FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_pagos_personal_items_select" ON sgp.pagos_personal_items FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_pagos_personal_items_insert" ON sgp.pagos_personal_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_pagos_personal_items_update" ON sgp.pagos_personal_items FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

CREATE POLICY "sgp_novedades_personal_select" ON sgp.novedades_personal FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_novedades_personal_insert" ON sgp.novedades_personal FOR INSERT TO authenticated
  WITH CHECK ((SELECT sgp.es_taberna()));
CREATE POLICY "sgp_novedades_personal_update" ON sgp.novedades_personal FOR UPDATE TO authenticated
  USING ((SELECT sgp.es_taberna())) WITH CHECK ((SELECT sgp.es_taberna()));

-- ─── 10. Bucket privado sgp-recibos (recibos PDF) ─────────────────────
-- Ruta: <empleado_id>/<semana_desde>_<pago_id>.pdf
-- SELECT (para la URL firmada) e INSERT solo admin. Sin UPDATE ni DELETE: un recibo
-- subido no se pisa ni se borra.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sgp-recibos', 'sgp-recibos', false, 5242880, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sgp_recibos_select" ON storage.objects;
CREATE POLICY "sgp_recibos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sgp-recibos' AND (SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_recibos_insert" ON storage.objects;
CREATE POLICY "sgp_recibos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sgp-recibos' AND (SELECT sgp.es_taberna()));

-- ─── 11. Verificación: devuelve OK o FALTA ────────────────────────────
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = 'sgp' AND table_name = 'configuracion' AND column_name = 'dia_pago')
      THEN 'FALTA: columna sgp.configuracion.dia_pago'
    WHEN to_regclass('sgp.empleados') IS NULL OR to_regclass('sgp.conceptos_pago') IS NULL
      OR to_regclass('sgp.pagos_personal') IS NULL OR to_regclass('sgp.pagos_personal_items') IS NULL
      OR to_regclass('sgp.novedades_personal') IS NULL
      THEN 'FALTA: alguna de las 5 tablas de personal'
    WHEN (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'sgp' AND c.relrowsecurity
            AND c.relname IN ('empleados', 'conceptos_pago', 'pagos_personal', 'pagos_personal_items', 'novedades_personal')) <> 5
      THEN 'FALTA: RLS activado en las 5 tablas'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp'
            AND tablename IN ('empleados', 'conceptos_pago', 'pagos_personal', 'pagos_personal_items', 'novedades_personal')
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_taberna%') <> 15
      THEN 'FALTA: las 15 policies (3 por tabla) con es_taberna'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') > 0
      THEN 'FALTA: quedan policies DELETE'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    WHEN has_table_privilege('anon', 'sgp.empleados', 'SELECT')
      OR has_table_privilege('anon', 'sgp.pagos_personal', 'SELECT')
      OR has_table_privilege('anon', 'sgp.pagos_personal_items', 'SELECT')
      OR has_table_privilege('anon', 'sgp.novedades_personal', 'SELECT')
      OR has_table_privilege('anon', 'sgp.conceptos_pago', 'SELECT')
      THEN 'FALTA: anon tiene acceso a tablas de personal'
    WHEN (SELECT count(*) FROM pg_trigger t WHERE NOT t.tgisinternal
            AND t.tgrelid IN ('sgp.pagos_personal'::regclass, 'sgp.pagos_personal_items'::regclass)
            AND t.tgname IN ('sgp_pagos_personal_a_candado', 'sgp_pagos_personal_b_totales',
                             'sgp_pagos_personal_c_updated_at', 'sgp_pagos_personal_items_a_candado',
                             'sgp_pagos_personal_items_b_recalcular')) <> 5
      THEN 'FALTA: los 5 triggers de pagos'
    WHEN (SELECT count(*) FROM sgp.conceptos_pago
          WHERE deleted_at IS NULL AND nombre IN ('Adelanto', 'Inasistencia')) <> 2
      THEN 'FALTA: conceptos Adelanto e Inasistencia'
    WHEN NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-recibos' AND public = false)
      THEN 'FALTA: bucket privado sgp-recibos'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname IN ('sgp_recibos_select', 'sgp_recibos_insert')
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_taberna%') <> 2
      THEN 'FALTA: policies sgp_recibos_select e insert con es_taberna'
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname LIKE 'sgp\_recibos\_%' AND cmd IN ('UPDATE', 'DELETE', 'ALL'))
      THEN 'FALTA: sgp-recibos tiene una policy UPDATE/DELETE'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
