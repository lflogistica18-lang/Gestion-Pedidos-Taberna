-- ============================================================
-- SGP Migration 018: Medio de pago en adelantos y pago dividido (efectivo + transferencia)
-- Los adelantos al personal registran cómo se dieron (efectivo o transferencia) y un pago
-- semanal se puede cobrar repartido: parte en efectivo y parte por transferencia.
--
-- Cambios (todo aditivo; los datos ya cargados quedan igual, las columnas nuevas son NULL):
--   * sgp.novedades_personal: columna medio_pago ('efectivo' | 'transferencia'), solo para
--     adelantos. Es obligatorio AL CARGAR un adelanto nuevo (trigger BEFORE INSERT, no CHECK:
--     un CHECK rompería los UPDATE de los adelantos viejos sin medio, p. ej. al ponerles pago_id).
--   * sgp.pagos_personal: columnas monto_efectivo y monto_transferencia (>= 0, pueden ser NULL
--     en pagos viejos y en borradores) y medio_pago admite 'dividido'. NO se exige que los
--     montos sumen el total a cobrar (decisión de Lucas: se avisa en la pantalla, no se bloquea).
--   * Candado del pago (se reescribe partiendo de la versión de la 017, sin perder nada):
--     al pasar borrador -> pagado, si vienen montos: deben sumar más de 0, se normalizan los
--     nulos a 0 y el medio se DEDUCE (dos montos = dividido; uno solo = ese medio). Si no viene
--     ningún monto pero sí el medio (app vieja): el monto de ese medio = total a cobrar.
--
-- Seguridad: sin DELETE, sin policies nuevas (las de 016 alcanzan), sin tocar anon.
-- Funciones SECURITY INVOKER con search_path vacío.
--
-- Requiere las migraciones 016 y 017. Es idempotente (se puede correr más de una vez).
-- Vuelta atrás: 018_medio_pago_personal.rollback.sql
-- Prueba de roles: supabase/pruebas/018_prueba.sql
-- ============================================================

BEGIN;

-- ─── 1. Novedades: medio del adelanto ─────────────────────────────────
ALTER TABLE sgp.novedades_personal ADD COLUMN IF NOT EXISTS medio_pago TEXT;

ALTER TABLE sgp.novedades_personal DROP CONSTRAINT IF EXISTS novedades_personal_medio_pago_valido;
ALTER TABLE sgp.novedades_personal ADD CONSTRAINT novedades_personal_medio_pago_valido
  CHECK (medio_pago IS NULL OR medio_pago IN ('efectivo', 'transferencia'));

ALTER TABLE sgp.novedades_personal DROP CONSTRAINT IF EXISTS novedades_personal_medio_solo_adelanto;
ALTER TABLE sgp.novedades_personal ADD CONSTRAINT novedades_personal_medio_solo_adelanto
  CHECK (tipo = 'adelanto' OR medio_pago IS NULL);

-- ─── 2. Pagos: montos por medio y medio 'dividido' ────────────────────
ALTER TABLE sgp.pagos_personal ADD COLUMN IF NOT EXISTS monto_efectivo NUMERIC(12,2);
ALTER TABLE sgp.pagos_personal ADD COLUMN IF NOT EXISTS monto_transferencia NUMERIC(12,2);

ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_monto_efectivo_no_negativo;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_monto_efectivo_no_negativo
  CHECK (monto_efectivo IS NULL OR monto_efectivo >= 0);

ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_monto_transferencia_no_negativo;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_monto_transferencia_no_negativo
  CHECK (monto_transferencia IS NULL OR monto_transferencia >= 0);

-- (el nombre del CHECK de medio_pago es el que le puso Postgres a la columna en 016)
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_medio_pago_check;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_medio_pago_check
  CHECK (medio_pago IS NULL OR medio_pago IN ('efectivo', 'transferencia', 'dividido'));

-- ─── 3. Adelanto nuevo: el medio es obligatorio (solo al insertar) ────
CREATE OR REPLACE FUNCTION sgp.novedades_personal_medio_adelanto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.tipo = 'adelanto' AND NEW.medio_pago IS NULL THEN
    RAISE EXCEPTION 'Elegí cómo se dio el adelanto: efectivo o transferencia.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sgp_novedades_personal_a_medio_adelanto ON sgp.novedades_personal;
CREATE TRIGGER sgp_novedades_personal_a_medio_adelanto BEFORE INSERT ON sgp.novedades_personal
  FOR EACH ROW EXECUTE FUNCTION sgp.novedades_personal_medio_adelanto();

-- ─── 4. Candado del pago (versión de la 017 + reparto de montos) ──────
-- Orden de triggers (alfabético): a_candado corre ANTES que b_totales; en el camino viejo
-- (solo medio_pago) se usa NEW.total_a_cobrar tal como viene en la fila (ya calculado al
-- cargar los ítems).
CREATE OR REPLACE FUNCTION sgp.pagos_personal_candado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_motivo TEXT;
  v_ef NUMERIC;
  v_tr NUMERIC;
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
    IF NEW.monto_efectivo IS NOT NULL OR NEW.monto_transferencia IS NOT NULL THEN
      -- Camino nuevo: vienen los montos; el medio se deduce de ellos
      v_ef := coalesce(NEW.monto_efectivo, 0);
      v_tr := coalesce(NEW.monto_transferencia, 0);
      IF v_ef + v_tr <= 0 THEN
        RAISE EXCEPTION 'Cargá cuánto se pagó en efectivo o por transferencia.';
      END IF;
      NEW.monto_efectivo := v_ef;
      NEW.monto_transferencia := v_tr;
      IF v_ef > 0 AND v_tr > 0 THEN
        NEW.medio_pago := 'dividido';
      ELSIF v_ef > 0 THEN
        NEW.medio_pago := 'efectivo';
      ELSE
        NEW.medio_pago := 'transferencia';
      END IF;
    ELSIF NEW.medio_pago IN ('efectivo', 'transferencia') THEN
      -- Camino viejo (app anterior): todo el total en ese medio
      IF NEW.medio_pago = 'efectivo' THEN
        NEW.monto_efectivo := NEW.total_a_cobrar;
        NEW.monto_transferencia := 0;
      ELSE
        NEW.monto_efectivo := 0;
        NEW.monto_transferencia := NEW.total_a_cobrar;
      END IF;
    ELSE
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
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = 'sgp' AND table_name = 'novedades_personal' AND column_name = 'medio_pago')
      THEN 'FALTA: columna novedades_personal.medio_pago'
    WHEN (SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'sgp' AND table_name = 'pagos_personal'
              AND column_name IN ('monto_efectivo', 'monto_transferencia')) <> 2
      THEN 'FALTA: columnas monto_efectivo / monto_transferencia'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.novedades_personal'::regclass AND conname = 'novedades_personal_medio_pago_valido')
      THEN 'FALTA: CHECK novedades_personal_medio_pago_valido'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.novedades_personal'::regclass AND conname = 'novedades_personal_medio_solo_adelanto')
      THEN 'FALTA: CHECK novedades_personal_medio_solo_adelanto'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_monto_efectivo_no_negativo')
      THEN 'FALTA: CHECK pagos_personal_monto_efectivo_no_negativo'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_monto_transferencia_no_negativo')
      THEN 'FALTA: CHECK pagos_personal_monto_transferencia_no_negativo'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_medio_pago_check'
                       AND pg_get_constraintdef(oid) LIKE '%dividido%')
      THEN 'FALTA: CHECK de medio_pago con dividido'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_pagado_con_medio')
      THEN 'FALTA: CHECK pagos_personal_pagado_con_medio (de la 016)'
    WHEN NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE NOT t.tgisinternal
                     AND t.tgrelid = 'sgp.novedades_personal'::regclass
                     AND t.tgname = 'sgp_novedades_personal_a_medio_adelanto')
      THEN 'FALTA: trigger del medio obligatorio en adelantos nuevos'
    WHEN to_regprocedure('sgp.novedades_personal_medio_adelanto()') IS NULL
      THEN 'FALTA: función sgp.novedades_personal_medio_adelanto'
    WHEN (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.novedades_personal_medio_adelanto()'::regprocedure)
      THEN 'FALTA: novedades_personal_medio_adelanto tiene que ser SECURITY INVOKER'
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc
                     WHERE oid = 'sgp.novedades_personal_medio_adelanto()'::regprocedure
                       AND proconfig @> ARRAY['search_path=""'])
      THEN 'FALTA: search_path vacío en novedades_personal_medio_adelanto'
    WHEN (SELECT count(*) FROM pg_trigger t WHERE NOT t.tgisinternal
            AND t.tgrelid IN ('sgp.pagos_personal'::regclass, 'sgp.pagos_personal_items'::regclass)
            AND t.tgname IN ('sgp_pagos_personal_a_candado', 'sgp_pagos_personal_b_totales',
                             'sgp_pagos_personal_c_updated_at', 'sgp_pagos_personal_items_a_candado',
                             'sgp_pagos_personal_items_b_recalcular')) <> 5
      THEN 'FALTA: los 5 triggers de pagos'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%dividido%'
      THEN 'FALTA: candado del pago sin el medio dividido'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%anulado%'
      THEN 'FALTA: candado del pago sin la transición a anulado'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%fue descartado%'
      THEN 'FALTA: candado del pago sin el bloqueo de borradores descartados'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%recibo_ruta%'
      THEN 'FALTA: candado del pago sin el caso recibo_ruta'
    WHEN (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure)
      THEN 'FALTA: pagos_personal_candado tiene que ser SECURITY INVOKER'
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc
                     WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure
                       AND proconfig @> ARRAY['search_path=""'])
      THEN 'FALTA: search_path vacío en pagos_personal_candado'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') > 0
      THEN 'FALTA: quedan policies DELETE'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
