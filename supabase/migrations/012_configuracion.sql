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
