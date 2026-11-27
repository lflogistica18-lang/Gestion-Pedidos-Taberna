-- ============================================================
-- SGP Migration 015: Logo del local, configurable desde Configuración → Local
-- Agrega sgp.configuracion.logo_url y el bucket PÚBLICO `sgp-logo`.
-- Es público porque la pantalla de entrada muestra el logo ANTES de iniciar sesión:
-- ahí la app no puede leer la base, pero sí abrir una URL pública.
-- La app sube siempre a la ruta fija `actual` (upsert) y guarda en logo_url la URL
-- pública + ?v=<epoch> (para que el navegador no muestre el logo viejo).
--   * Solo imágenes png / jpeg / webp, hasta 2 MB.
--   * Policies en storage.objects `sgp_logo_*`: INSERT, UPDATE y SELECT solo admin
--     (sgp.es_taberna()). Sin DELETE. La lectura pública no pasa por policies.
--     El SELECT de admin hace falta porque el upsert del Storage lee antes de pisar.
-- Requiere las migraciones 010 y 012 (sgp.es_taberna, sgp.configuracion).
-- Vuelta atrás: 015_logo_local.rollback.sql
-- ============================================================

BEGIN;

-- ─── 1. Columna ───────────────────────────────────────────────────────
ALTER TABLE sgp.configuracion
  ADD COLUMN IF NOT EXISTS logo_url TEXT CHECK (logo_url IS NULL OR length(logo_url) <= 500);

-- ─── 2. Bucket público sgp-logo ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sgp-logo', 'sgp-logo', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sgp_logo_select" ON storage.objects;
CREATE POLICY "sgp_logo_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sgp-logo' AND (SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_logo_insert" ON storage.objects;
CREATE POLICY "sgp_logo_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sgp-logo' AND (SELECT sgp.es_taberna()));

DROP POLICY IF EXISTS "sgp_logo_update" ON storage.objects;
CREATE POLICY "sgp_logo_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sgp-logo' AND (SELECT sgp.es_taberna()))
  WITH CHECK (bucket_id = 'sgp-logo' AND (SELECT sgp.es_taberna()));

-- ─── 3. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = 'sgp' AND table_name = 'configuracion' AND column_name = 'logo_url')
      THEN 'FALTA: columna sgp.configuracion.logo_url'
    WHEN NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-logo' AND public = true)
      THEN 'FALTA: bucket público sgp-logo'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname IN ('sgp_logo_select', 'sgp_logo_insert', 'sgp_logo_update')
            AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%es_taberna%') <> 3
      THEN 'FALTA: las 3 policies sgp_logo_* con es_taberna'
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname LIKE 'sgp\_logo\_%' AND cmd IN ('DELETE', 'ALL'))
      THEN 'FALTA: hay una policy DELETE/ALL en sgp-logo'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
