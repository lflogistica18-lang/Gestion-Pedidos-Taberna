-- ============================================================
-- SGP Migration 017: Anular pagos al personal y borrar empleadas cargadas por error
-- Un pago 'pagado' NO se edita (el recibo PDF ya salió): se ANULA con motivo y la semana
-- vuelve a quedar por pagar para rehacerlo. El pago anulado queda guardado (nada se borra).
--
-- Cambios (todo aditivo, sin perder datos; el pago ya pagado en producción sigue válido):
--   * sgp.pagos_personal: estado admite 'anulado'; columnas anulado_at y anulado_motivo.
--   * Índice único (empleado_id, semana_desde): ignora los anulados (así se rehace la semana).
--   * Candado: pagado -> anulado es la única transición permitida desde pagado (además de
--     poner recibo_ruta); un anulado no se toca más; pagado/anulado no admiten deleted_at;
--     un borrador no se anula (se descarta con deleted_at).
--   * Totales: no se recalculan si el pago está pagado o anulado. Ítems: candado también
--     para pagos anulados.
--   * RPC sgp.anular_pago_personal(p_pago_id, p_motivo): SECURITY INVOKER, solo admin
--     (es_taberna), anula el pago y libera sus novedades en una sola transacción.
--   * sgp.empleados: no se puede poner deleted_at si tiene pagos 'pagado' (los anulados no cuentan).
--
-- Seguridad: sin DELETE, sin policies nuevas (las de 016 alcanzan). La RPC es SECURITY INVOKER:
-- corre con los permisos (RLS) de quien llama; se chequea es_taberna() de todos modos.
--
-- Requiere la migración 016. Es idempotente (se puede correr más de una vez).
-- Vuelta atrás: 017_anular_pago_personal.rollback.sql
-- Prueba de roles: supabase/pruebas/017_prueba.sql
-- ============================================================

BEGIN;

-- ─── 1. Columnas nuevas ───────────────────────────────────────────────
ALTER TABLE sgp.pagos_personal ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMPTZ;
ALTER TABLE sgp.pagos_personal ADD COLUMN IF NOT EXISTS anulado_motivo TEXT;

-- ─── 2. Estado 'anulado' + coherencia del motivo ──────────────────────
-- (el nombre del CHECK de estado es el que le puso Postgres en 016)
ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_estado_check;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_estado_check
  CHECK (estado IN ('borrador', 'pagado', 'anulado'));

ALTER TABLE sgp.pagos_personal DROP CONSTRAINT IF EXISTS pagos_personal_anulado_con_motivo;
ALTER TABLE sgp.pagos_personal ADD CONSTRAINT pagos_personal_anulado_con_motivo
  CHECK (
    (estado = 'anulado'
       AND anulado_at IS NOT NULL
       AND anulado_motivo IS NOT NULL
       AND anulado_motivo = btrim(anulado_motivo)
       AND length(anulado_motivo) BETWEEN 3 AND 200)
    OR (estado <> 'anulado' AND anulado_at IS NULL AND anulado_motivo IS NULL)
  );

-- ─── 3. Índice único: la semana se puede rehacer si el pago anterior está anulado ──
DROP INDEX IF EXISTS sgp.uq_sgp_pagos_personal_empleado_semana;
CREATE UNIQUE INDEX uq_sgp_pagos_personal_empleado_semana
  ON sgp.pagos_personal (empleado_id, semana_desde)
  WHERE deleted_at IS NULL AND estado <> 'anulado';

-- ─── 4. Triggers (mismas funciones de 016, ampliadas; los triggers ya existen) ──
-- 4a. Candado del pago.
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

-- 4b. Totales: no se recalculan si el pago está pagado o anulado.
CREATE OR REPLACE FUNCTION sgp.pagos_personal_totales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.estado IN ('pagado', 'anulado') THEN
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

-- 4c. Ítems: candado también para pagos anulados.
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
  IF v_estado = 'anulado' THEN
    RAISE EXCEPTION 'Este pago está anulado: no se pueden agregar, cambiar ni quitar extras o descuentos.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4d. Empleadas: "Borrar empleada" (deleted_at) solo si no tiene pagos pagados.
CREATE OR REPLACE FUNCTION sgp.empleados_no_borrar_con_pagos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM sgp.pagos_personal p
                 WHERE p.empleado_id = OLD.id AND p.estado = 'pagado') THEN
    RAISE EXCEPTION 'Esta empleada tiene pagos hechos: usá Dar de baja para guardar su historial.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sgp_empleados_a_no_borrar_con_pagos ON sgp.empleados;
CREATE TRIGGER sgp_empleados_a_no_borrar_con_pagos BEFORE UPDATE ON sgp.empleados
  FOR EACH ROW EXECUTE FUNCTION sgp.empleados_no_borrar_con_pagos();

-- ─── 5. RPC sgp.anular_pago_personal ──────────────────────────────────
CREATE OR REPLACE FUNCTION sgp.anular_pago_personal(p_pago_id UUID, p_motivo TEXT)
RETURNS sgp.pagos_personal
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_pago sgp.pagos_personal%ROWTYPE;
  v_motivo TEXT;
BEGIN
  IF NOT (SELECT sgp.es_taberna()) THEN
    RAISE EXCEPTION 'No tenés permiso para anular pagos.' USING ERRCODE = '42501';
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF length(v_motivo) < 3 THEN
    RAISE EXCEPTION 'Escribí el motivo de la anulación (mínimo 3 letras).';
  END IF;
  IF length(v_motivo) > 200 THEN
    RAISE EXCEPTION 'El motivo es muy largo (máximo 200 caracteres).';
  END IF;

  SELECT * INTO v_pago FROM sgp.pagos_personal WHERE id = p_pago_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pago no existe.';
  END IF;
  IF v_pago.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'El pago no existe.';
  END IF;
  IF v_pago.estado = 'anulado' THEN
    RAISE EXCEPTION 'Este pago ya está anulado.';
  END IF;
  IF v_pago.estado <> 'pagado' THEN
    RAISE EXCEPTION 'Solo se anulan pagos ya pagados. Un borrador se descarta.';
  END IF;

  -- anulado_at lo fija el trigger con now()
  UPDATE sgp.pagos_personal
     SET estado = 'anulado', anulado_motivo = v_motivo
   WHERE id = p_pago_id
   RETURNING * INTO v_pago;

  -- Las novedades que se habían descontado en este pago vuelven a quedar libres
  UPDATE sgp.novedades_personal SET pago_id = NULL WHERE pago_id = p_pago_id;

  RETURN v_pago;
END;
$$;

REVOKE EXECUTE ON FUNCTION sgp.anular_pago_personal(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sgp.anular_pago_personal(UUID, TEXT) TO authenticated;

-- ─── 6. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN (SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'sgp' AND table_name = 'pagos_personal'
              AND column_name IN ('anulado_at', 'anulado_motivo')) <> 2
      THEN 'FALTA: columnas anulado_at / anulado_motivo'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_estado_check'
                       AND pg_get_constraintdef(oid) LIKE '%anulado%')
      THEN 'FALTA: CHECK de estado con anulado'
    WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'sgp.pagos_personal'::regclass AND conname = 'pagos_personal_anulado_con_motivo')
      THEN 'FALTA: CHECK pagos_personal_anulado_con_motivo'
    WHEN NOT EXISTS (SELECT 1 FROM pg_indexes
                     WHERE schemaname = 'sgp' AND indexname = 'uq_sgp_pagos_personal_empleado_semana'
                       AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%anulado%')
      THEN 'FALTA: índice único que ignora los anulados'
    WHEN (SELECT count(*) FROM pg_trigger t WHERE NOT t.tgisinternal
            AND t.tgrelid IN ('sgp.pagos_personal'::regclass, 'sgp.pagos_personal_items'::regclass)
            AND t.tgname IN ('sgp_pagos_personal_a_candado', 'sgp_pagos_personal_b_totales',
                             'sgp_pagos_personal_c_updated_at', 'sgp_pagos_personal_items_a_candado',
                             'sgp_pagos_personal_items_b_recalcular')) <> 5
      THEN 'FALTA: los 5 triggers de pagos'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%anulado%'
      THEN 'FALTA: candado del pago sin la transición a anulado'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure) NOT LIKE '%fue descartado%'
      THEN 'FALTA: candado del pago sin el bloqueo de borradores descartados'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_totales()'::regprocedure) NOT LIKE '%anulado%'
      THEN 'FALTA: totales sin el caso anulado'
    WHEN (SELECT prosrc FROM pg_proc WHERE oid = 'sgp.pagos_personal_items_candado()'::regprocedure) NOT LIKE '%anulado%'
      THEN 'FALTA: candado de ítems sin el caso anulado'
    WHEN to_regprocedure('sgp.anular_pago_personal(uuid,text)') IS NULL
      THEN 'FALTA: función sgp.anular_pago_personal'
    WHEN (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.anular_pago_personal(uuid,text)'::regprocedure)
      THEN 'FALTA: sgp.anular_pago_personal tiene que ser SECURITY INVOKER'
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc
                     WHERE oid = 'sgp.anular_pago_personal(uuid,text)'::regprocedure
                       AND proconfig @> ARRAY['search_path=""'])
      THEN 'FALTA: search_path vacío en sgp.anular_pago_personal'
    WHEN has_function_privilege('anon', 'sgp.anular_pago_personal(uuid,text)', 'EXECUTE')
      THEN 'FALTA: anon puede ejecutar la función'
    WHEN EXISTS (
           SELECT 1 FROM pg_proc p,
                LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
           WHERE p.oid = 'sgp.anular_pago_personal(uuid,text)'::regprocedure
             AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
      THEN 'FALTA: PUBLIC puede ejecutar la función'
    WHEN NOT has_function_privilege('authenticated', 'sgp.anular_pago_personal(uuid,text)', 'EXECUTE')
      THEN 'FALTA: authenticated no puede ejecutar la función'
    WHEN NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE NOT t.tgisinternal
                     AND t.tgrelid = 'sgp.empleados'::regclass
                     AND t.tgname = 'sgp_empleados_a_no_borrar_con_pagos')
      THEN 'FALTA: trigger que impide borrar empleadas con pagos'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') > 0
      THEN 'FALTA: quedan policies DELETE'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
