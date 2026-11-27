-- ============================================================
-- Prueba de la migración 017 (anular pagos y borrar empleadas) — NO deja nada en la base.
-- Se corre ENTERO (psql o SQL Editor) después de aplicar 016 y 017. Todo va dentro de
-- BEGIN … ROLLBACK: empleadas, pagos y novedades de prueba se deshacen.
-- Simula los roles con SET LOCAL ROLE authenticated + request.jwt.claims (como 016_prueba_rls.sql).
-- Resultado: termina con un error a propósito (fuerza el rollback):
--   RESULTADO_PRUEBA total=N ok=N mal=N fallidos=<códigos de los casos MAL o "ninguno">
--   Todo bien = mal=0.
-- Casos:
--   a  anular un pago pagado con motivo (OK, novedades liberadas, anulado_at fijado)
--   b  motivo corto / vacío → error; el pago sigue pagado
--   c  anular un borrador → error; anular uno ya anulado → error
--   d  tocar un anulado (notas, estado, ítems) → error
--   e  deleted_at en un pagado o en un anulado → error
--   f  rehacer la semana tras anular (borrador nuevo misma semana) OK; un segundo vivo no
--   g  anular por UPDATE directo: ok solo cambiando estado+motivo
--   h  ventas@ (taberna_pedidos) y usuario sin rol no pueden anular
--   i  borrar empleada: sin pagos OK; con pagado → error; con solo anulados OK
--   j  estructura: función INVOKER, sin policies DELETE, anon sin EXECUTE
-- ============================================================

BEGIN;

CREATE TEMP TABLE fx_017 (clave TEXT PRIMARY KEY, valor TEXT);
CREATE TEMP TABLE resultado_017 (caso TEXT, resultado TEXT);
GRANT ALL ON fx_017, resultado_017 TO PUBLIC;

-- ─── Datos de prueba (como dueño de la base) ──────────────────────────
DO $$
DECLARE
  v_ana UUID;
  v_sin UUID;
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID; v_p5 UUID;
  v_nov UUID;
BEGIN
  INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana) VALUES ('Prueba Ana', 200000, 6) RETURNING id INTO v_ana;
  INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana) VALUES ('Prueba Sin Pagos', 100000, 5) RETURNING id INTO v_sin;

  -- P1: pagado (se va a anular), P2: pagado (queda pagado), P3: borrador, P4: pagado (anulación por UPDATE directo)
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-05', DATE '2030-01-11', 200000, 6) RETURNING id INTO v_p1;
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-12', DATE '2030-01-18', 200000, 6) RETURNING id INTO v_p2;
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-19', DATE '2030-01-25', 200000, 6) RETURNING id INTO v_p3;
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-26', DATE '2030-02-01', 200000, 6) RETURNING id INTO v_p4;

  -- Una novedad descontada en P1 (la ligamos antes de pagar)
  INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, descontar, pago_id)
    VALUES (v_ana, DATE '2030-01-07', 'inasistencia', true, v_p1) RETURNING id INTO v_nov;

  -- P5: pagado con un ítem (se anula para probar el candado de ítems de un anulado)
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-02-02', DATE '2030-02-08', 200000, 6) RETURNING id INTO v_p5;
  INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, monto)
    VALUES (v_p5, 'Hora extra', 'extra', 'fijo', 5000, 5000);

  UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo' WHERE id IN (v_p1, v_p2, v_p4, v_p5);

  INSERT INTO fx_017 VALUES ('ana', v_ana::TEXT), ('sin', v_sin::TEXT),
    ('p1', v_p1::TEXT), ('p2', v_p2::TEXT), ('p3', v_p3::TEXT), ('p4', v_p4::TEXT), ('p5', v_p5::TEXT), ('nov', v_nov::TEXT);
END $$;

-- ─── (a..g) admin ─────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ana UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'ana');
  v_p1 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p1');
  v_p2 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p2');
  v_p3 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p3');
  v_p4 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p4');
  v_p5 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p5');
  v_nov UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'nov');
  v_item UUID;
  v_pago sgp.pagos_personal;
  v_n INTEGER;
  v_estado TEXT;
BEGIN
  -- a1: anular P1 con motivo
  BEGIN
    v_pago := sgp.anular_pago_personal(v_p1, '  eran 2 horas extra  ');
    INSERT INTO resultado_017 VALUES ('a1 anular pagado con motivo',
      CASE WHEN v_pago.estado = 'anulado' AND v_pago.anulado_motivo = 'eran 2 horas extra'
                AND v_pago.anulado_at IS NOT NULL THEN 'OK' ELSE 'MAL: ' || v_pago.estado END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('a1 anular pagado con motivo', 'MAL: ' || SQLERRM); END;

  -- a2: la novedad quedó libre
  SELECT count(*) INTO v_n FROM sgp.novedades_personal WHERE id = v_nov AND pago_id IS NULL;
  INSERT INTO resultado_017 VALUES ('a2 novedades liberadas', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);

  -- b1: motivo corto
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, 'ab');
    INSERT INTO resultado_017 VALUES ('b1 motivo corto → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('b1 motivo corto → error', 'OK'); END;
  -- b2: motivo nulo y de puros espacios
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, NULL);
    INSERT INTO resultado_017 VALUES ('b2 motivo nulo → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('b2 motivo nulo → error', 'OK'); END;
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, '     ');
    INSERT INTO resultado_017 VALUES ('b3 motivo de espacios → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('b3 motivo de espacios → error', 'OK'); END;
  -- b4: motivo largo (201)
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, repeat('x', 201));
    INSERT INTO resultado_017 VALUES ('b4 motivo de 201 caracteres → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('b4 motivo de 201 caracteres → error', 'OK'); END;
  SELECT estado INTO v_estado FROM sgp.pagos_personal WHERE id = v_p2;
  INSERT INTO resultado_017 VALUES ('b5 P2 sigue pagado tras los errores', CASE WHEN v_estado = 'pagado' THEN 'OK' ELSE 'MAL: ' || v_estado END);

  -- c1: borrador por la RPC
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p3, 'me equivoqué');
    INSERT INTO resultado_017 VALUES ('c1 anular borrador (RPC) → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('c1 anular borrador (RPC) → error', 'OK'); END;
  -- c2: borrador por UPDATE directo
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'anulado', anulado_motivo = 'me equivoqué' WHERE id = v_p3;
    INSERT INTO resultado_017 VALUES ('c2 anular borrador (UPDATE) → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('c2 anular borrador (UPDATE) → error', 'OK'); END;
  -- c3: anular uno ya anulado
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p1, 'otra vez');
    INSERT INTO resultado_017 VALUES ('c3 anular un anulado → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('c3 anular un anulado → error', 'OK'); END;
  -- c4: pago inexistente
  BEGIN
    PERFORM sgp.anular_pago_personal(gen_random_uuid(), 'no existe');
    INSERT INTO resultado_017 VALUES ('c4 pago inexistente → error', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('c4 pago inexistente → error', 'OK'); END;

  -- d: tocar un anulado
  BEGIN
    UPDATE sgp.pagos_personal SET notas = 'toco' WHERE id = v_p1;
    INSERT INTO resultado_017 VALUES ('d1 tocar notas de un anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('d1 tocar notas de un anulado → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado' WHERE id = v_p1;
    INSERT INTO resultado_017 VALUES ('d2 reactivar un anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('d2 reactivar un anulado → error', 'OK'); END;
  BEGIN
    INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, monto)
      VALUES (v_p1, 'Extra', 'extra', 'fijo', 1, 1);
    INSERT INTO resultado_017 VALUES ('d3 ítem en un anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('d3 ítem en un anulado → error', 'OK'); END;

  -- e: deleted_at
  BEGIN
    UPDATE sgp.pagos_personal SET deleted_at = now() WHERE id = v_p2;
    INSERT INTO resultado_017 VALUES ('e1 deleted_at en pagado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e1 deleted_at en pagado → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET deleted_at = now() WHERE id = v_p1;
    INSERT INTO resultado_017 VALUES ('e2 deleted_at en anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e2 deleted_at en anulado → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET deleted_at = now() WHERE id = v_p3;
    INSERT INTO resultado_017 VALUES ('e3 descartar borrador con deleted_at sigue andando', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e3 descartar borrador con deleted_at sigue andando', 'MAL: ' || SQLERRM); END;

  -- e4: un borrador descartado no se puede pagar
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo' WHERE id = v_p3;
    INSERT INTO resultado_017 VALUES ('e4 borrador descartado → pagado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e4 borrador descartado → pagado → error',
    CASE WHEN SQLERRM LIKE '%descartado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END); END;

  -- e5: recibo_ruta + estado anulado en el mismo UPDATE (P2 pagado, sin recibo)
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'anulado', anulado_motivo = 'prueba', recibo_ruta = 'x/y.pdf' WHERE id = v_p2;
    INSERT INTO resultado_017 VALUES ('e5 anular + recibo_ruta juntos → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e5 anular + recibo_ruta juntos → error', 'OK'); END;

  -- e6: INSERT directo con estado anulado
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana, estado, anulado_at, anulado_motivo)
      VALUES (v_ana, DATE '2030-04-06', DATE '2030-04-12', 1, 6, 'anulado', now(), 'colado');
    INSERT INTO resultado_017 VALUES ('e6 INSERT directo anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e6 INSERT directo anulado → error', 'OK'); END;

  -- e7: ítems de un pago anulado (P5): no se actualizan ni se les pone deleted_at
  BEGIN
    SELECT id INTO v_item FROM sgp.pagos_personal_items WHERE pago_id = v_p5 LIMIT 1;
    PERFORM sgp.anular_pago_personal(v_p5, 'ítem mal cargado');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e7a preparar: anular P5', 'MAL: ' || SQLERRM); END;
  BEGIN
    UPDATE sgp.pagos_personal_items SET monto = 1 WHERE id = v_item;
    INSERT INTO resultado_017 VALUES ('e7b UPDATE de ítem de anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e7b UPDATE de ítem de anulado → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal_items SET deleted_at = now() WHERE id = v_item;
    INSERT INTO resultado_017 VALUES ('e7c soft-delete de ítem de anulado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('e7c soft-delete de ítem de anulado → error', 'OK'); END;

  -- f: rehacer la semana de P1 (2030-01-05)
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_ana, DATE '2030-01-05', DATE '2030-01-11', 200000, 6);
    INSERT INTO resultado_017 VALUES ('f1 rehacer la semana tras anular', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('f1 rehacer la semana tras anular', 'MAL: ' || SQLERRM); END;
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_ana, DATE '2030-01-05', DATE '2030-01-11', 200000, 6);
    INSERT INTO resultado_017 VALUES ('f2 dos pagos vivos misma semana → error', 'MAL: pudo');
  EXCEPTION WHEN unique_violation THEN INSERT INTO resultado_017 VALUES ('f2 dos pagos vivos misma semana → error', 'OK');
            WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('f2 dos pagos vivos misma semana → error', 'MAL: ' || SQLERRM); END;
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_ana, DATE '2030-01-12', DATE '2030-01-18', 200000, 6);
    INSERT INTO resultado_017 VALUES ('f3 semana con pagado vivo sigue única', 'MAL: pudo');
  EXCEPTION WHEN unique_violation THEN INSERT INTO resultado_017 VALUES ('f3 semana con pagado vivo sigue única', 'OK');
            WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('f3 semana con pagado vivo sigue única', 'MAL: ' || SQLERRM); END;

  -- g: anular P4 por UPDATE directo
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'anulado', anulado_motivo = 'x', medio_pago = 'transferencia' WHERE id = v_p4;
    INSERT INTO resultado_017 VALUES ('g1 anular cambiando otra columna → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('g1 anular cambiando otra columna → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'anulado', anulado_motivo = 'ab' WHERE id = v_p4;
    INSERT INTO resultado_017 VALUES ('g2 anular por UPDATE con motivo corto → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('g2 anular por UPDATE con motivo corto → error', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'anulado', anulado_motivo = 'carga equivocada' WHERE id = v_p4;
    SELECT count(*) INTO v_n FROM sgp.pagos_personal WHERE id = v_p4 AND estado = 'anulado' AND anulado_at IS NOT NULL;
    INSERT INTO resultado_017 VALUES ('g3 anular por UPDATE estado+motivo', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('g3 anular por UPDATE estado+motivo', 'MAL: ' || SQLERRM); END;
END $$;

RESET ROLE;

-- ─── (h) ventas@ (taberna_pedidos) y usuario sin rol no pueden anular ──
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"ventas@x","app_metadata":{"rol":"taberna_pedidos"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_p2 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p2');
BEGIN
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, 'quiero anular');
    INSERT INTO resultado_017 VALUES ('h1 ventas@ no anula', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('h1 ventas@ no anula', 'OK'); END;
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"u@x","app_metadata":{}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_p2 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p2');
BEGIN
  BEGIN
    PERFORM sgp.anular_pago_personal(v_p2, 'quiero anular');
    INSERT INTO resultado_017 VALUES ('h2 usuario sin rol no anula', 'MAL: anuló');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('h2 usuario sin rol no anula', 'OK'); END;
END $$;

RESET ROLE;

-- ─── (i) borrar empleada (admin) ──────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ana UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'ana');
  v_sin UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'sin');
  v_emp UUID;
  v_pago UUID;
BEGIN
  -- i1: sin pagos → se borra
  BEGIN
    UPDATE sgp.empleados SET deleted_at = now() WHERE id = v_sin;
    INSERT INTO resultado_017 VALUES ('i1 borrar empleada sin pagos', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('i1 borrar empleada sin pagos', 'MAL: ' || SQLERRM); END;

  -- i2: Ana tiene P2 pagado → error con el mensaje acordado
  BEGIN
    UPDATE sgp.empleados SET deleted_at = now() WHERE id = v_ana;
    INSERT INTO resultado_017 VALUES ('i2 borrar empleada con pagado → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('i2 borrar empleada con pagado → error',
    CASE WHEN SQLERRM LIKE '%Dar de baja%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END); END;

  -- i3: empleada con un solo pago, anulado → se puede borrar
  BEGIN
    INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana) VALUES ('Prueba Solo Anulados', 100000, 5) RETURNING id INTO v_emp;
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_emp, DATE '2030-03-02', DATE '2030-03-08', 100000, 5) RETURNING id INTO v_pago;
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo' WHERE id = v_pago;
    PERFORM sgp.anular_pago_personal(v_pago, 'carga equivocada');
    UPDATE sgp.empleados SET deleted_at = now() WHERE id = v_emp;
    INSERT INTO resultado_017 VALUES ('i3 borrar empleada con solo anulados', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('i3 borrar empleada con solo anulados', 'MAL: ' || SQLERRM); END;

  -- i4: dar de baja (active=false) sigue permitido con pagos
  BEGIN
    UPDATE sgp.empleados SET active = false WHERE id = v_ana;
    INSERT INTO resultado_017 VALUES ('i4 dar de baja con pagos sigue andando', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_017 VALUES ('i4 dar de baja con pagos sigue andando', 'MAL: ' || SQLERRM); END;
END $$;

RESET ROLE;

-- ─── (j) estructura y efectos finales (como dueño) ────────────────────
DO $$
DECLARE
  v_p2 UUID := (SELECT valor::UUID FROM fx_017 WHERE clave = 'p2');
BEGIN
  INSERT INTO resultado_017 VALUES ('j1 P2 sigue pagado al final',
    CASE WHEN (SELECT estado FROM sgp.pagos_personal WHERE id = v_p2) = 'pagado' THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_017 VALUES ('j2 la RPC es SECURITY INVOKER con search_path vacío',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'sgp.anular_pago_personal(uuid,text)'::regprocedure
                        AND NOT prosecdef AND proconfig @> ARRAY['search_path=""'])
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_017 VALUES ('j3 anon no ejecuta la RPC',
    CASE WHEN NOT has_function_privilege('anon', 'sgp.anular_pago_personal(uuid,text)', 'EXECUTE')
          AND has_function_privilege('authenticated', 'sgp.anular_pago_personal(uuid,text)', 'EXECUTE')
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_017 VALUES ('j4 ninguna policy DELETE en sgp',
    CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') = 0 THEN 'OK' ELSE 'MAL' END);
END $$;

-- Cierre: la excepción fuerza el rollback de todo y deja el resumen en el mensaje
-- (sirve para correrla por la API, que solo devuelve el último resultado). El detalle
-- completo, por si hace falta, queda en resultado_017 hasta ese momento.
DO $$
DECLARE
  v_total INTEGER;
  v_mal INTEGER;
  v_fallidos TEXT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE resultado NOT LIKE 'OK%'),
         coalesce(string_agg(split_part(caso, ' ', 1) || '=' || left(resultado, 60), '; ' ORDER BY caso)
                  FILTER (WHERE resultado NOT LIKE 'OK%'), 'ninguno')
    INTO v_total, v_mal, v_fallidos
    FROM resultado_017;
  RAISE EXCEPTION 'RESULTADO_PRUEBA total=% ok=% mal=% fallidos=%', v_total, v_total - v_mal, v_mal, left(v_fallidos, 600);
END $$;

ROLLBACK;
