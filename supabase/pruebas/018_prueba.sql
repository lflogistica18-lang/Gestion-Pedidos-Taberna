-- ============================================================
-- Prueba de la migración 018 (medio de pago en adelantos y pago dividido) — NO deja nada en la base.
-- Se corre ENTERO (psql o SQL Editor) después de aplicar 016, 017 y 018. Todo va dentro de
-- BEGIN … ROLLBACK: empleadas, pagos y novedades de prueba se deshacen.
-- Simula los roles con SET LOCAL ROLE authenticated + request.jwt.claims (como 017_prueba.sql).
-- Resultado: termina con un error a propósito (fuerza el rollback):
--   RESULTADO_PRUEBA total=N ok=N mal=N fallidos=<códigos de los casos MAL o "ninguno">
--   Todo bien = mal=0.
-- Casos:
--   a  adelanto nuevo: sin medio → error; con transferencia / efectivo OK; medio inválido → error;
--      medio en una novedad que no es adelanto → error; adelanto viejo sin medio se actualiza OK
--   b  borrador guarda los montos libremente y sigue borrador
--   c  pagar: dos montos → dividido; solo efectivo → efectivo; solo transferencia → transferencia;
--      el medio que mande la pantalla se pisa; nulos quedan en 0
--   d  con diferencia (de más y de menos) → OK, sin bloqueo
--   e  montos en 0 / un monto 0 y el otro nulo → error; sin montos ni medio → error; dividido sin montos → error
--   f  camino viejo (solo medio_pago): copia total_a_cobrar al monto de ese medio
--   g  un pagado no deja cambiar montos ni medio; recibo_ruta sí; anular un dividido OK
--   h  pago viejo (pagado, montos NULL) sigue válido: recibo_ruta y anular andan
--   i  montos negativos → error
--   j  ventas@ (taberna_pedidos) no ve novedades ni pagos
--   k  estructura: trigger y funciones INVOKER con search_path vacío, sin policies DELETE
-- ============================================================

BEGIN;

CREATE TEMP TABLE fx_018 (clave TEXT PRIMARY KEY, valor TEXT);
CREATE TEMP TABLE resultado_018 (caso TEXT, resultado TEXT);
GRANT ALL ON fx_018, resultado_018 TO PUBLIC;

-- ─── Datos de prueba (como dueño de la base) ──────────────────────────
DO $$
DECLARE
  v_ana UUID;
  v_p UUID;
  v_nov UUID;
BEGIN
  INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana) VALUES ('Prueba Ana 018', 200000, 6) RETURNING id INTO v_ana;
  INSERT INTO fx_018 VALUES ('ana', v_ana::TEXT);

  -- Pagos borrador, uno por semana (sueldo 200000): p1..p9 y p12
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-05', DATE '2030-01-11', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p1', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-12', DATE '2030-01-18', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p2', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-19', DATE '2030-01-25', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p3', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-01-26', DATE '2030-02-01', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p4', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-02-02', DATE '2030-02-08', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p5', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-02-09', DATE '2030-02-15', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p6', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-02-16', DATE '2030-02-22', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p7', v_p::TEXT);
  -- p8: con un extra de 5000 → total a cobrar 205000 (para el camino viejo)
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-02-23', DATE '2030-03-01', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p8', v_p::TEXT);
  INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, monto)
    VALUES (v_p, 'Hora extra', 'extra', 'fijo', 5000, 5000);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-03-02', DATE '2030-03-08', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p9', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-03-16', DATE '2030-03-22', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p12', v_p::TEXT);
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_ana, DATE '2030-03-23', DATE '2030-03-29', 200000, 6) RETURNING id INTO v_p;
  INSERT INTO fx_018 VALUES ('p13', v_p::TEXT);

  -- p10: pago VIEJO ya pagado (efectivo, sin montos), como el que hay en producción.
  -- Se carga apagando el candado solo para armar el dato (se vuelve a prender enseguida).
  ALTER TABLE sgp.pagos_personal DISABLE TRIGGER sgp_pagos_personal_a_candado;
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana, estado, medio_pago, pagado_at)
    VALUES (v_ana, DATE '2030-03-09', DATE '2030-03-15', 200000, 6, 'pagado', 'efectivo', now()) RETURNING id INTO v_p;
  ALTER TABLE sgp.pagos_personal ENABLE TRIGGER sgp_pagos_personal_a_candado;
  INSERT INTO fx_018 VALUES ('p10', v_p::TEXT);

  -- Adelanto VIEJO (sin medio), como los que ya existían antes de la 018
  ALTER TABLE sgp.novedades_personal DISABLE TRIGGER sgp_novedades_personal_a_medio_adelanto;
  INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto)
    VALUES (v_ana, DATE '2030-01-02', 'adelanto', 10000) RETURNING id INTO v_nov;
  ALTER TABLE sgp.novedades_personal ENABLE TRIGGER sgp_novedades_personal_a_medio_adelanto;
  INSERT INTO fx_018 VALUES ('nov_viejo', v_nov::TEXT);
END $$;

-- ─── (a..i) admin ─────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ana UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'ana');
  v_p1 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p1');
  v_p2 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p2');
  v_p3 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p3');
  v_p4 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p4');
  v_p5 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p5');
  v_p6 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p6');
  v_p7 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p7');
  v_p8 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p8');
  v_p9 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p9');
  v_p10 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p10');
  v_p12 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p12');
  v_p13 UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'p13');
  v_nov_viejo UUID := (SELECT valor::UUID FROM fx_018 WHERE clave = 'nov_viejo');
  r sgp.pagos_personal;
  v_n INTEGER;
BEGIN
  -- ── a: adelantos ──
  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto) VALUES (v_ana, DATE '2030-01-06', 'adelanto', 20000);
    INSERT INTO resultado_018 VALUES ('a1 adelanto nuevo sin medio → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a1 adelanto nuevo sin medio → error',
    CASE WHEN SQLERRM LIKE '%Elegí cómo se dio el adelanto%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto, medio_pago) VALUES (v_ana, DATE '2030-01-06', 'adelanto', 20000, 'transferencia');
    INSERT INTO resultado_018 VALUES ('a2 adelanto con transferencia', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a2 adelanto con transferencia', 'MAL: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto, medio_pago) VALUES (v_ana, DATE '2030-01-07', 'adelanto', 5000, 'efectivo');
    INSERT INTO resultado_018 VALUES ('a3 adelanto con efectivo', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a3 adelanto con efectivo', 'MAL: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto, medio_pago) VALUES (v_ana, DATE '2030-01-08', 'adelanto', 5000, 'cheque');
    INSERT INTO resultado_018 VALUES ('a4 adelanto con medio inválido → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a4 adelanto con medio inválido → error', 'OK'); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, medio_pago) VALUES (v_ana, DATE '2030-01-08', 'charla', 'efectivo');
    INSERT INTO resultado_018 VALUES ('a5 medio en novedad que no es adelanto → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a5 medio en novedad que no es adelanto → error', 'OK'); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo) VALUES (v_ana, DATE '2030-01-09', 'charla');
    INSERT INTO resultado_018 VALUES ('a6 novedad que no es adelanto sin medio sigue andando', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a6 novedad que no es adelanto sin medio sigue andando', 'MAL: ' || SQLERRM); END;

  -- a7: el adelanto viejo (sin medio) se puede actualizar (se le pone pago_id)
  BEGIN
    UPDATE sgp.novedades_personal SET pago_id = v_p1 WHERE id = v_nov_viejo;
    SELECT count(*) INTO v_n FROM sgp.novedades_personal WHERE id = v_nov_viejo AND pago_id = v_p1 AND medio_pago IS NULL;
    INSERT INTO resultado_018 VALUES ('a7 adelanto viejo sin medio se actualiza', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('a7 adelanto viejo sin medio se actualiza', 'MAL: ' || SQLERRM); END;

  -- ── b: el borrador guarda montos ──
  BEGIN
    UPDATE sgp.pagos_personal SET monto_efectivo = 80000, monto_transferencia = 100000 WHERE id = v_p9;
    SELECT count(*) INTO v_n FROM sgp.pagos_personal
      WHERE id = v_p9 AND estado = 'borrador' AND monto_efectivo = 80000 AND monto_transferencia = 100000
        AND pagado_at IS NULL AND medio_pago IS NULL;
    INSERT INTO resultado_018 VALUES ('b1 borrador guarda los montos y sigue borrador', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('b1 borrador guarda los montos y sigue borrador', 'MAL: ' || SQLERRM); END;

  -- ── c: pagar con montos ──
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 90000, monto_transferencia = 100000
      WHERE id = v_p1 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('c1 los dos montos → dividido',
      CASE WHEN r.estado = 'pagado' AND r.medio_pago = 'dividido' AND r.monto_efectivo = 90000
                AND r.monto_transferencia = 100000 AND r.pagado_at IS NOT NULL THEN 'OK'
           ELSE 'MAL: ' || coalesce(r.medio_pago, 'null') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('c1 los dos montos → dividido', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 200000 WHERE id = v_p2 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('c2 solo efectivo → efectivo, transferencia en 0',
      CASE WHEN r.medio_pago = 'efectivo' AND r.monto_efectivo = 200000 AND r.monto_transferencia = 0 THEN 'OK'
           ELSE 'MAL: ' || coalesce(r.medio_pago, 'null') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('c2 solo efectivo → efectivo, transferencia en 0', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_transferencia = 200000 WHERE id = v_p3 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('c3 solo transferencia → transferencia, efectivo en 0',
      CASE WHEN r.medio_pago = 'transferencia' AND r.monto_transferencia = 200000 AND r.monto_efectivo = 0 THEN 'OK'
           ELSE 'MAL: ' || coalesce(r.medio_pago, 'null') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('c3 solo transferencia → transferencia, efectivo en 0', 'MAL: ' || SQLERRM); END;

  -- c4: la pantalla manda medio 'efectivo' pero los montos dicen transferencia → manda lo deducido
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo', monto_efectivo = 0, monto_transferencia = 200000
      WHERE id = v_p4 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('c4 el medio de la pantalla se pisa con lo deducido',
      CASE WHEN r.medio_pago = 'transferencia' THEN 'OK' ELSE 'MAL: ' || coalesce(r.medio_pago, 'null') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('c4 el medio de la pantalla se pisa con lo deducido', 'MAL: ' || SQLERRM); END;

  -- ── d: diferencias, sin bloqueo ──
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 100000, monto_transferencia = 110000
      WHERE id = v_p5 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('d1 pago de más que lo calculado → OK',
      CASE WHEN r.estado = 'pagado' AND r.medio_pago = 'dividido' AND r.total_a_cobrar = 200000 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('d1 pago de más que lo calculado → OK', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 50000, monto_transferencia = 100000
      WHERE id = v_p6 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('d2 pago de menos que lo calculado → OK',
      CASE WHEN r.estado = 'pagado' AND r.medio_pago = 'dividido' AND r.total_a_cobrar = 200000 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('d2 pago de menos que lo calculado → OK', 'MAL: ' || SQLERRM); END;

  -- ── e: errores al pagar ──
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 0, monto_transferencia = 0 WHERE id = v_p7;
    INSERT INTO resultado_018 VALUES ('e1 los dos montos en 0 → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('e1 los dos montos en 0 → error',
    CASE WHEN SQLERRM LIKE '%Cargá cuánto se pagó%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 0 WHERE id = v_p7;
    INSERT INTO resultado_018 VALUES ('e2 un monto en 0 y el otro vacío → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('e2 un monto en 0 y el otro vacío → error', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado' WHERE id = v_p7;
    INSERT INTO resultado_018 VALUES ('e3 sin montos ni medio → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('e3 sin montos ni medio → error',
    CASE WHEN SQLERRM LIKE '%medio de pago%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'dividido' WHERE id = v_p7;
    INSERT INTO resultado_018 VALUES ('e4 medio dividido sin montos → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('e4 medio dividido sin montos → error', 'OK'); END;

  SELECT count(*) INTO v_n FROM sgp.pagos_personal WHERE id = v_p7 AND estado = 'borrador';
  INSERT INTO resultado_018 VALUES ('e5 tras los errores p7 sigue borrador', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);

  -- ── f: camino viejo (solo medio_pago) ──
  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'transferencia' WHERE id = v_p8 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('f1 camino viejo transferencia → monto = total a cobrar',
      CASE WHEN r.total_a_cobrar = 205000 AND r.monto_transferencia = 205000 AND r.monto_efectivo = 0
                AND r.medio_pago = 'transferencia' AND r.estado = 'pagado' THEN 'OK'
           ELSE 'MAL: total=' || r.total_a_cobrar || ' tr=' || coalesce(r.monto_transferencia::TEXT, 'null') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('f1 camino viejo transferencia → monto = total a cobrar', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo' WHERE id = v_p12 RETURNING * INTO r;
    INSERT INTO resultado_018 VALUES ('f2 camino viejo efectivo → monto = total a cobrar',
      CASE WHEN r.monto_efectivo = 200000 AND r.monto_transferencia = 0 AND r.medio_pago = 'efectivo' THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('f2 camino viejo efectivo → monto = total a cobrar', 'MAL: ' || SQLERRM); END;

  -- ── g: un pagado no se toca ──
  BEGIN
    UPDATE sgp.pagos_personal SET monto_efectivo = 1 WHERE id = v_p1;
    INSERT INTO resultado_018 VALUES ('g1 pagado no deja cambiar monto_efectivo → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('g1 pagado no deja cambiar monto_efectivo → error', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET monto_transferencia = 1 WHERE id = v_p1;
    INSERT INTO resultado_018 VALUES ('g2 pagado no deja cambiar monto_transferencia → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('g2 pagado no deja cambiar monto_transferencia → error', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET medio_pago = 'efectivo' WHERE id = v_p1;
    INSERT INTO resultado_018 VALUES ('g3 pagado no deja cambiar el medio → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('g3 pagado no deja cambiar el medio → error', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET recibo_ruta = 'x/p1.pdf' WHERE id = v_p1;
    INSERT INTO resultado_018 VALUES ('g4 pagado dividido acepta poner recibo_ruta', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('g4 pagado dividido acepta poner recibo_ruta', 'MAL: ' || SQLERRM); END;

  BEGIN
    PERFORM sgp.anular_pago_personal(v_p1, 'prueba de anulación');
    SELECT count(*) INTO v_n FROM sgp.pagos_personal WHERE id = v_p1 AND estado = 'anulado' AND medio_pago = 'dividido';
    INSERT INTO resultado_018 VALUES ('g5 anular un pago dividido (la RPC de la 017 sigue andando)', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('g5 anular un pago dividido (la RPC de la 017 sigue andando)', 'MAL: ' || SQLERRM); END;

  -- ── h: pago viejo (pagado, montos NULL) ──
  SELECT count(*) INTO v_n FROM sgp.pagos_personal
    WHERE id = v_p10 AND estado = 'pagado' AND medio_pago = 'efectivo' AND monto_efectivo IS NULL AND monto_transferencia IS NULL;
  INSERT INTO resultado_018 VALUES ('h1 el pago viejo con montos NULL es válido', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL' END);

  BEGIN
    UPDATE sgp.pagos_personal SET recibo_ruta = 'x/p10.pdf' WHERE id = v_p10;
    INSERT INTO resultado_018 VALUES ('h2 pago viejo acepta recibo_ruta', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('h2 pago viejo acepta recibo_ruta', 'MAL: ' || SQLERRM); END;

  BEGIN
    PERFORM sgp.anular_pago_personal(v_p10, 'prueba pago viejo');
    INSERT INTO resultado_018 VALUES ('h3 pago viejo se puede anular', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('h3 pago viejo se puede anular', 'MAL: ' || SQLERRM); END;

  -- ── i: montos negativos ──
  BEGIN
    UPDATE sgp.pagos_personal SET monto_efectivo = -5 WHERE id = v_p13;
    INSERT INTO resultado_018 VALUES ('i1 monto_efectivo negativo → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('i1 monto_efectivo negativo → error', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', monto_efectivo = 300000, monto_transferencia = -100000 WHERE id = v_p13;
    INSERT INTO resultado_018 VALUES ('i2 monto_transferencia negativo al pagar → error', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('i2 monto_transferencia negativo al pagar → error', 'OK'); END;
END $$;

RESET ROLE;

-- ─── (j) ventas@ (taberna_pedidos) no ve nada ─────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"ventas@x","app_metadata":{"rol":"taberna_pedidos"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_n INTEGER;
BEGIN
  SELECT count(*) INTO v_n FROM sgp.novedades_personal;
  INSERT INTO resultado_018 VALUES ('j1 ventas@ no ve novedades', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  SELECT count(*) INTO v_n FROM sgp.pagos_personal;
  INSERT INTO resultado_018 VALUES ('j2 ventas@ no ve pagos', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto, medio_pago)
      VALUES ((SELECT valor::UUID FROM fx_018 WHERE clave = 'ana'), DATE '2030-05-01', 'adelanto', 1000, 'efectivo');
    INSERT INTO resultado_018 VALUES ('j3 ventas@ no puede cargar un adelanto', 'MAL: pudo');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_018 VALUES ('j3 ventas@ no puede cargar un adelanto', 'OK'); END;
END $$;

RESET ROLE;

-- ─── (k) estructura (como dueño) ──────────────────────────────────────
DO $$
BEGIN
  INSERT INTO resultado_018 VALUES ('k1 trigger de medio del adelanto es INVOKER con search_path vacío',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'sgp.novedades_personal_medio_adelanto()'::regprocedure
                        AND NOT prosecdef AND proconfig @> ARRAY['search_path=""'])
          AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sgp_novedades_personal_a_medio_adelanto' AND NOT tgisinternal)
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_018 VALUES ('k2 el candado del pago es INVOKER con search_path vacío',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'sgp.pagos_personal_candado()'::regprocedure
                        AND NOT prosecdef AND proconfig @> ARRAY['search_path=""'])
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_018 VALUES ('k3 ninguna policy DELETE en sgp',
    CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') = 0 THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_018 VALUES ('k4 ninguna policy abierta en sgp',
    CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) = 0
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_018 VALUES ('k5 anon sin acceso a las tablas del personal',
    CASE WHEN NOT has_table_privilege('anon', 'sgp.pagos_personal', 'SELECT')
          AND NOT has_table_privilege('anon', 'sgp.novedades_personal', 'SELECT') THEN 'OK' ELSE 'MAL' END);
END $$;

-- Cierre: la excepción fuerza el rollback de todo y deja el resumen en el mensaje
-- (sirve para correrla por la API, que solo devuelve el último resultado).
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
    FROM resultado_018;
  RAISE EXCEPTION 'RESULTADO_PRUEBA total=% ok=% mal=% fallidos=%', v_total, v_total - v_mal, v_mal, left(v_fallidos, 600);
END $$;

ROLLBACK;
