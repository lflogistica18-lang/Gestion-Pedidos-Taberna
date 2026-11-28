-- ============================================================
-- Vuelta atrás de la 018: deja todo como la 017 (candado del pago sin montos, medio_pago
-- sin 'dividido', adelantos sin medio).
-- OJO, esto pierde datos: se borran las columnas monto_efectivo / monto_transferencia de los
-- pagos y medio_pago de las novedades. Antes de borrar, cada pago 'dividido' pasa al medio
-- con más monto (si son iguales, efectivo), porque la 017 no conoce 'dividido'. Los pagos
-- ya pagados están bloqueados por el candado: se lo apaga SOLO durante ese paso y se vuelve
-- a encender enseguida, todo dentro de la misma transacción.
-- Idempotente.
-- ============================================================

BEGIN;

-- ─── 1. Los 'dividido' pasan al medio con más monto ───────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'sgp' AND table_name = 'pagos_personal' AND column_name = 'monto_efectivo') THEN
    ALTER TABLE sgp.pagos_personal DISABLE TRIGGER sgp_pagos_personal_a_candado;
    EXECUTE 'UPDATE sgp.pagos_personal
                SET medio_pago = CASE WHEN coalesce(monto_transferencia, 0) > coalesce(monto_efectivo, 0)
                                      THEN ''transferencia'' ELSE ''efectivo'' END
              WHERE medio_pago = ''dividido''';
    ALTER TABLE sgp.pagos_personal ENABLE TRIGGER sgp_pagos_personal_a_candado;
  END IF;
END $$;

-- ─── 2. Adelantos: sin trigger ni columna ─────────────────────────────
DROP TRIGGER IF EXISTS sgp_novedades_personal_a_medio_adelanto ON sgp.novedades_personal;
DROP FUNCTION IF EXISTS sgp.novedades_personal_medio_adelanto();
ALTER TABLE sgp.novedades_personal DROP CONSTRAINT IF EXISTS novedades_personal_medio_solo_adelanto;
ALTER TABLE sgp.novedades_personal DROP CONSTRAINT IF EXISTS novedades_personal_medio_pago_valido;
ALTER TABLE sgp.novedades_personal DROP COLUMN IF EXISTS medio_pago;

-- ─── 3. Pagos: sin montos y sin 'dividido' ────────────────────────────
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_monto_efectivo_no_negativo;
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_monto_transferencia_no_negativo;
ALTER TABLE sgp.pagos_personal DROP COLUMN IF EXISTS monto_efectivo;
ALTER TABLE sgp.pagos_personal DROP COLUMN IF EXISTS monto_transferencia;

ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_medio_pago_check;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_medio_pago_check
  CHECK (medio_pago IS NULL OR medio_pago IN ('efectivo', 'transferencia'));

-- ─── 4. Candado del pago: versión de la 017 ───────────────────────────
CREATE OR REPLACE FUNCTION sgp.pagos_personal_candado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_motivo TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'borrador' THEN
      RAISE EXCEPTION 'Un pago nuevo se crea como borrador; después se marca como pagado.';
    END IF;
    NEW.pagado_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.estado = 'anulado' THEN
    RAISE EXCEPTION 'Este pago está anulado y no se puede modificar. Para rehacer la semana, cargá un pago nuevo.';
  END IF;

  IF OLD.estado = 'pagado' THEN
    -- Único cambio libre: poner recibo_ruta cuando estaba vacía
    IF OLD.recibo_ruta IS NULL AND NEW.recibo_ruta IS NOT NULL
       AND (to_jsonb(NEW) - 'recibo_ruta' - 'updated_at') = (to_jsonb(OLD) - 'recibo_ruta' - 'updated_at') THEN
      RETURN NEW;
    END IF;

    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Un pago ya pagado no se borra: si hubo un error, anulalo con el motivo.';
    END IF;

    -- Única transición permitida: pagado -> anulado
    IF NEW.estado = 'anulado' THEN
      IF (to_jsonb(NEW) - 'estado' - 'anulado_motivo' - 'anulado_at' - 'updated_at')
         <> (to_jsonb(OLD) - 'estado' - 'anulado_motivo' - 'anulado_at' - 'updated_at') THEN
        RAISE EXCEPTION 'Al anular un pago no se puede cambiar nada más que el motivo.';
      END IF;
      v_motivo := btrim(coalesce(NEW.anulado_motivo, ''));
      IF length(v_motivo) < 3 THEN
        RAISE EXCEPTION 'Escribí el motivo de la anulación (mínimo 3 letras).';
      END IF;
      IF length(v_motivo) > 200 THEN
        RAISE EXCEPTION 'El motivo es muy largo (máximo 200 caracteres).';
      END IF;
      NEW.anulado_motivo := v_motivo;
      NEW.anulado_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Este pago ya está pagado y no se puede modificar. Si hubo un error, anulalo con el motivo y rehacé la semana.';
  END IF;

  -- OLD.estado = 'borrador'
  IF OLD.deleted_at IS NOT NULL AND NEW.estado <> 'borrador' THEN
    RAISE EXCEPTION 'Este borrador fue descartado: no se puede marcar como pagado.';
  END IF;
  IF NEW.estado = 'anulado' THEN
    RAISE EXCEPTION 'Un borrador no se anula: se descarta.';
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

-- ─── 5. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'sgp' AND table_name = 'pagos_personal'
                   AND column_name IN ('monto_efectivo', 'monto_transferencia'))
      OR EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'sgp' AND table_name = 'novedades_personal' AND column_name = 'medio_pago')
      THEN 'FALTA: quedan columnas de la 018'
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sgp_novedades_personal_a_medio_adelanto' AND NOT tgisinternal)
      OR to_regprocedure('sgp.novedades_personal_medio_adelanto()') IS NOT NULL
      THEN 'FALTA: queda el trigger o la función del medio del adelanto'
    WHEN EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_medio_pago_check'
                   AND pg_get_constraintdef(oid) LIKE '%dividido%')
      THEN 'FALTA: el CHECK de medio_pago sigue admitiendo dividido'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) LIKE '%dividido%'
      THEN 'FALTA: el candado sigue con la versión de la 018'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%anulado%'
      THEN 'FALTA: el candado perdió lo de la 017'
    WHEN (SELECT count(*) FROM pg_trigger t WHERE NOT t.tgisinternal
            AND t.tgrelid = 'sgp.pagos_personal'::regclass
            AND t.tgname = 'sgp_pagos_personal_a_candado' AND t.tgenabled = 'O') <> 1
      THEN 'FALTA: el trigger sgp_pagos_personal_a_candado quedó apagado o no existe'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
