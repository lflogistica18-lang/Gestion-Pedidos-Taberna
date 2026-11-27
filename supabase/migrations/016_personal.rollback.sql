-- ============================================================
-- Vuelta atrás de la 016: borra las 5 tablas de personal, sus funciones, el bucket
-- sgp-recibos (con sus policies) y la columna dia_pago. Deja la base como estaba antes.
-- ⚠️ PIERDE todos los datos de personal (empleadas, pagos, novedades, recibos).
-- Si ya se usó de verdad, hacer antes un backup de esas tablas.
-- El borrado por SQL de storage.objects y storage.buckets está protegido por Supabase:
-- se habilita solo en esta transacción con storage.allow_delete_query. Borrar filas por
-- SQL no borra el archivo físico del almacenamiento: para limpiarlo del todo, vaciá el
-- bucket desde el panel (Storage) antes de correr esto.
-- ============================================================

BEGIN;

-- Storage
DROP POLICY IF EXISTS "sgp_recibos_select" ON storage.objects;
DROP POLICY IF EXISTS "sgp_recibos_insert" ON storage.objects;

SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'sgp-recibos';
DELETE FROM storage.buckets WHERE id = 'sgp-recibos';

-- Tablas (de la última a la primera; los triggers y policies se van con ellas)
DROP TABLE IF EXISTS sgp.pagos_personal_items;
DROP TABLE IF EXISTS sgp.novedades_personal;
DROP TABLE IF EXISTS sgp.pagos_personal;
DROP TABLE IF EXISTS sgp.conceptos_pago;
DROP TABLE IF EXISTS sgp.empleados;

-- Funciones de los triggers
DROP FUNCTION IF EXISTS sgp.pagos_personal_items_recalcular();
DROP FUNCTION IF EXISTS sgp.pagos_personal_items_candado();
DROP FUNCTION IF EXISTS sgp.pagos_personal_totales();
DROP FUNCTION IF EXISTS sgp.pagos_personal_candado();

-- Configuración
ALTER TABLE sgp.configuracion DROP COLUMN IF EXISTS dia_pago;

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN to_regclass('sgp.empleados') IS NOT NULL OR to_regclass('sgp.conceptos_pago') IS NOT NULL
      OR to_regclass('sgp.pagos_personal') IS NOT NULL OR to_regclass('sgp.pagos_personal_items') IS NOT NULL
      OR to_regclass('sgp.novedades_personal') IS NOT NULL
      THEN 'FALTA: siguen tablas de personal'
    WHEN to_regprocedure('sgp.pagos_personal_candado()') IS NOT NULL
      OR to_regprocedure('sgp.pagos_personal_totales()') IS NOT NULL
      OR to_regprocedure('sgp.pagos_personal_items_candado()') IS NOT NULL
      OR to_regprocedure('sgp.pagos_personal_items_recalcular()') IS NOT NULL
      THEN 'FALTA: siguen funciones de personal'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'sgp' AND table_name = 'configuracion' AND column_name = 'dia_pago')
      THEN 'FALTA: sigue la columna dia_pago'
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-recibos') THEN 'FALTA: sigue el bucket sgp-recibos'
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'sgp\_recibos\_%')
      THEN 'FALTA: quedan policies sgp_recibos_*'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
