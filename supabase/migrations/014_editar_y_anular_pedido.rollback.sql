-- ============================================================
-- Vuelta atrás de la 014: borra las dos funciones, la tabla de historial y las
-- columnas nuevas de sgp.orders.
-- ⚠️ Se pierde el historial de ediciones (sgp.order_edits) y los motivos y autores
-- de las anulaciones (anulado_por, motivo_anulacion). Los pedidos ya anulados siguen
-- en la papelera (deleted_at no se toca), pero sin el motivo.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS sgp.editar_pedido(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS sgp.anular_pedido(UUID, TEXT);

DROP TABLE IF EXISTS sgp.order_edits;

ALTER TABLE sgp.orders DROP COLUMN IF EXISTS anulado_por;
ALTER TABLE sgp.orders DROP COLUMN IF EXISTS motivo_anulacion;
ALTER TABLE sgp.orders DROP COLUMN IF EXISTS editado_at;
ALTER TABLE sgp.orders DROP COLUMN IF EXISTS ediciones;

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN to_regprocedure('sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)') IS NOT NULL
      THEN 'FALTA: sigue existiendo sgp.editar_pedido'
    WHEN to_regprocedure('sgp.anular_pedido(uuid,text)') IS NOT NULL
      THEN 'FALTA: sigue existiendo sgp.anular_pedido'
    WHEN to_regclass('sgp.order_edits') IS NOT NULL
      THEN 'FALTA: sigue existiendo sgp.order_edits'
    WHEN (SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'sgp' AND table_name = 'orders'
              AND column_name IN ('anulado_por', 'motivo_anulacion', 'editado_at', 'ediciones')) > 0
      THEN 'FALTA: quedan columnas nuevas en sgp.orders'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
