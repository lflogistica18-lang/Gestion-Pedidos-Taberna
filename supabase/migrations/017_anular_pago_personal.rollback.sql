-- ============================================================
-- Vuelta atrás de la 017: deja todo como la 016 (candado, totales, ítems, estado, índice).
-- Quita la RPC sgp.anular_pago_personal, el trigger de empleadas y las columnas
-- anulado_at / anulado_motivo.
-- FRENA con un error claro si ya hay pagos anulados: volver a la 016 los perdería
-- (esa versión no conoce el estado 'anulado'). En ese caso hay que decidir qué hacer
-- con esos pagos antes de revertir; no se toca ningún dato.
-- Idempotente.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_n INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'sgp' AND table_name = 'pagos_personal' AND column_name = 'anulado_at') THEN
    EXECUTE 'SELECT count(*) FROM sgp.pagos_personal WHERE estado = ''anulado'''
      INTO v_n;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'No se puede volver atrás: hay % pago(s) anulado(s). Volver a la 016 los perdería. No se cambió nada.', v_n;
    END IF;
  END IF;
END $$;

-- RPC y trigger de empleadas
DROP FUNCTION IF EXISTS sgp.anular_pago_personal(UUID, TEXT);
DROP TRIGGER IF EXISTS sgp_empleados_a_no_borrar_con_pagos ON sgp.empleados;
DROP FUNCTION IF EXISTS sgp.empleados_no_borrar_con_pagos();

-- Constraints, índice y columnas
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_anulado_con_motivo;
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_estado_check;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_estado_check
  CHECK (estado IN ('borrador', 'pagado'));
ALTER TABLE sgp.pagos_personal DROP COLUMN IF EXISTS anulado_at;
ALTER TABLE sgp.pagos_personal DROP COLUMN IF EXISTS anulado_motivo;

DROP INDEX IF EXISTS sgp.uq_sgp_pagos_personal_empleado_semana;
CREATE UNIQUE INDEX uq_sgp_pagos_personal_empleado_semana
  ON sgp.pagos_personal (empleado_id, semana_desde) WHERE deleted_at IS NULL;

-- Funciones de los triggers: versión de la 016
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

-- Verificación: devuelve OK o FALTA
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'sgp' AND table_name = 'pagos_personal'
                   AND column_name IN ('anulado_at', 'anulado_motivo'))
      THEN 'FALTA: siguen las columnas de anulación'
    WHEN to_regprocedure('sgp.anular_pago_personal(uuid,text)') IS NOT NULL
      THEN 'FALTA: sigue la función sgp.anular_pago_personal'
    WHEN to_regprocedure('sgp.empleados_no_borrar_con_pagos()') IS NOT NULL
      OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sgp_empleados_a_no_borrar_con_pagos' AND NOT tgisinternal)
      THEN 'FALTA: sigue el trigger de empleadas'
    WHEN EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'sgp.pagos_personal'::regclass
                   AND (conname = 'pagos_personal_anulado_con_motivo'
                        OR (conname = 'pagos_personal_estado_check' AND pg_get_constraintdef(oid) LIKE '%anulado%')))
      THEN 'FALTA: siguen los CHECK de anulado'
    WHEN EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'sgp' AND indexname = 'uq_sgp_pagos_personal_empleado_semana'
                   AND indexdef LIKE '%anulado%')
      THEN 'FALTA: el índice único sigue con la condición de anulado'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) LIKE '%anulado%'
      OR (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_totales()'::regprocedure) LIKE '%anulado%'
      OR (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_items_candado()'::regprocedure) LIKE '%anulado%'
      THEN 'FALTA: las funciones de los triggers siguen con la versión 017'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
