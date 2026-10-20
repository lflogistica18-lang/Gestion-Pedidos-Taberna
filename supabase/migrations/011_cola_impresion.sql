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
