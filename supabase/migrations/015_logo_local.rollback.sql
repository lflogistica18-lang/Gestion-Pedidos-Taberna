-- ============================================================
-- Vuelta atrás de la 015: borra el bucket sgp-logo (y su logo), sus policies y la
-- columna logo_url. Deja la base como estaba antes de la 015.
-- ⚠️ Pierde el logo subido (se vuelve a subir). El borrado por SQL de storage.objects
-- y storage.buckets está protegido por Supabase: se habilita solo en esta transacción
-- con storage.allow_delete_query. Ojo: borrar filas por SQL no borra el archivo físico
-- del almacenamiento; si querés limpiarlo del todo, vaciá el bucket desde el panel
-- (Storage) antes de correr esto.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "sgp_logo_select" ON storage.objects;
DROP POLICY IF EXISTS "sgp_logo_insert" ON storage.objects;
DROP POLICY IF EXISTS "sgp_logo_update" ON storage.objects;

SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'sgp-logo';
DELETE FROM storage.buckets WHERE id = 'sgp-logo';

ALTER TABLE sgp.configuracion DROP COLUMN IF EXISTS logo_url;

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'sgp' AND table_name = 'configuracion' AND column_name = 'logo_url')
      THEN 'FALTA: sigue la columna logo_url'
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-logo') THEN 'FALTA: sigue el bucket sgp-logo'
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'sgp\_logo\_%')
      THEN 'FALTA: quedan policies sgp_logo_*'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
