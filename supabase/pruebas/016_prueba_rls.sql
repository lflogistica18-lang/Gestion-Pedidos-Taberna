-- ============================================================
-- Prueba de la migración 016 (pagos al personal) — NO deja nada en la base.
-- Se corre ENTERO (SQL Editor o psql) después de aplicar 015 y 016. Todo va dentro de
-- BEGIN … ROLLBACK: la empleada, los pagos y el archivo de prueba se deshacen.
-- Simula los roles con SET LOCAL ROLE authenticated + request.jwt.claims.
-- Resultado: un solo SELECT json_agg con una fila por caso: OK o MAL: <detalle>.
-- (Si el ejecutor solo devuelve el resultado del ÚLTIMO statement, correrlo con psql:
--  el SELECT json_agg va antes del ROLLBACK.)
-- Casos:
--   a  ventas@ (taberna_pedidos) no lee ni escribe personal ni el bucket de recibos
--   b  user_metadata no da permiso
--   c  admin (taberna) lee y escribe; no puede borrar
--   d  los totales los calcula el trigger (y pisan lo que mande el cliente)
--   e  descuentos que superan el total → error claro
--   f  candado de 'pagado' (medio de pago, pagado_at, nada se modifica, recibo_ruta una vez)
--   g  único por empleada y semana; no se pasa un ítem de un pago a otro
--   h  estructura: sin policies DELETE, bucket de recibos sin UPDATE/DELETE
-- ============================================================

BEGIN;

CREATE TEMP TABLE fx_016 (clave TEXT PRIMARY KEY, valor TEXT);
CREATE TEMP TABLE resultado_016 (caso TEXT, resultado TEXT);
GRANT ALL ON fx_016, resultado_016 TO PUBLIC;

-- ─── Datos de prueba (como dueño de la base) ──────────────────────────
DO $$
DECLARE
  v_emp UUID;
  v_pago UUID;
BEGIN
  INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana)
    VALUES ('Prueba Ana', 200000, 6) RETURNING id INTO v_emp;
  INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
    VALUES (v_emp, DATE '2030-01-05', DATE '2030-01-11', 200000, 6) RETURNING id INTO v_pago;
  INSERT INTO fx_016 VALUES ('emp', v_emp::TEXT), ('pago_dueno', v_pago::TEXT);

  -- Un recibo de prueba en el bucket privado (para ver que ventas@ no lo ve)
  INSERT INTO storage.objects (bucket_id, name) VALUES ('sgp-recibos', 'prueba/' || v_emp || '.pdf');
END $$;

-- ─── (a) ventas@ (rol solo pedidos): no lee ni escribe nada de personal ──
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"ventas@x","app_metadata":{"rol":"taberna_pedidos"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_emp UUID := (SELECT valor::UUID FROM fx_016 WHERE clave = 'emp');
  v_pago UUID := (SELECT valor::UUID FROM fx_016 WHERE clave = 'pago_dueno');
  v_n INTEGER;
BEGIN
  -- Lectura: 0 filas en cada tabla (existen filas, así que 0 es por la policy)
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.empleados;
    INSERT INTO resultado_016 VALUES ('a1 ventas no lee empleados', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a1 ventas no lee empleados', 'OK (' || SQLERRM || ')'); END;
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.conceptos_pago;
    INSERT INTO resultado_016 VALUES ('a2 ventas no lee conceptos', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a2 ventas no lee conceptos', 'OK (' || SQLERRM || ')'); END;
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.pagos_personal;
    INSERT INTO resultado_016 VALUES ('a3 ventas no lee pagos', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a3 ventas no lee pagos', 'OK (' || SQLERRM || ')'); END;
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.pagos_personal_items;
    INSERT INTO resultado_016 VALUES ('a4 ventas no lee ítems', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a4 ventas no lee ítems', 'OK (' || SQLERRM || ')'); END;
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.novedades_personal;
    INSERT INTO resultado_016 VALUES ('a5 ventas no lee novedades', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a5 ventas no lee novedades', 'OK (' || SQLERRM || ')'); END;
  BEGIN
    SELECT count(*) INTO v_n FROM storage.objects WHERE bucket_id = 'sgp-recibos';
    INSERT INTO resultado_016 VALUES ('a6 ventas no lee recibos', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a6 ventas no lee recibos', 'OK (' || SQLERRM || ')'); END;

  -- Escritura: INSERT falla
  BEGIN
    INSERT INTO sgp.empleados (nombre, sueldo_semanal) VALUES ('Colada', 1);
    INSERT INTO resultado_016 VALUES ('a7 ventas no crea empleados', 'MAL: pudo insertar');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a7 ventas no crea empleados', 'OK'); END;
  BEGIN
    INSERT INTO sgp.conceptos_pago (nombre, tipo, modo, valor) VALUES ('Colado', 'extra', 'fijo', 1);
    INSERT INTO resultado_016 VALUES ('a8 ventas no crea conceptos', 'MAL: pudo insertar');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a8 ventas no crea conceptos', 'OK'); END;
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_emp, DATE '2030-02-02', DATE '2030-02-08', 1, 6);
    INSERT INTO resultado_016 VALUES ('a9 ventas no crea pagos', 'MAL: pudo insertar');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a9 ventas no crea pagos', 'OK'); END;
  BEGIN
    INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, monto)
      VALUES (v_pago, 'Colado', 'extra', 'fijo', 1, 1);
    INSERT INTO resultado_016 VALUES ('a10 ventas no crea ítems', 'MAL: pudo insertar');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a10 ventas no crea ítems', 'OK'); END;
  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo) VALUES (v_emp, DATE '2030-01-06', 'charla');
    INSERT INTO resultado_016 VALUES ('a11 ventas no crea novedades', 'MAL: pudo insertar');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a11 ventas no crea novedades', 'OK'); END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('sgp-recibos', 'colado.pdf');
    INSERT INTO resultado_016 VALUES ('a12 ventas no sube recibos', 'MAL: pudo subir');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a12 ventas no sube recibos', 'OK'); END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('sgp-logo', 'actual');
    INSERT INTO resultado_016 VALUES ('a13 ventas no sube el logo', 'MAL: pudo subir');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a13 ventas no sube el logo', 'OK'); END;

  -- Escritura: UPDATE no toca ninguna fila
  BEGIN
    UPDATE sgp.empleados SET sueldo_semanal = 1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO resultado_016 VALUES ('a14 ventas no edita empleados', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: tocó ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a14 ventas no edita empleados', 'OK'); END;
  BEGIN
    UPDATE sgp.pagos_personal SET notas = 'hack';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO resultado_016 VALUES ('a15 ventas no edita pagos', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: tocó ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a15 ventas no edita pagos', 'OK'); END;
  BEGIN
    UPDATE sgp.configuracion SET dia_pago = 1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO resultado_016 VALUES ('a16 ventas no cambia el día de pago', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: tocó ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('a16 ventas no cambia el día de pago', 'OK'); END;
END $$;

RESET ROLE;

-- ─── (b) rol puesto en user_metadata: no da permiso ───────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"u@x","user_metadata":{"rol":"taberna"},"app_metadata":{}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_n INTEGER;
BEGIN
  SELECT count(*) INTO v_n FROM sgp.empleados;
  INSERT INTO resultado_016 VALUES ('b1 user_metadata no lee empleados', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('b1 user_metadata no lee empleados', 'OK'); END $$;

RESET ROLE;

-- ─── (c) admin: lee y escribe; no puede borrar ────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_n INTEGER;
  v_id UUID;
BEGIN
  BEGIN
    SELECT count(*) INTO v_n FROM sgp.empleados WHERE nombre = 'Prueba Ana';
    INSERT INTO resultado_016 VALUES ('c1 admin lee empleados', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c1 admin lee empleados', 'MAL: ' || SQLERRM); END;

  BEGIN
    SELECT count(*) INTO v_n FROM sgp.conceptos_pago WHERE nombre IN ('Adelanto', 'Inasistencia') AND deleted_at IS NULL;
    INSERT INTO resultado_016 VALUES ('c2 admin lee la semilla de conceptos', CASE WHEN v_n = 2 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c2 admin lee la semilla de conceptos', 'MAL: ' || SQLERRM); END;

  BEGIN
    SELECT count(*) INTO v_n FROM storage.objects WHERE bucket_id = 'sgp-recibos';
    INSERT INTO resultado_016 VALUES ('c3 admin lee recibos', CASE WHEN v_n >= 1 THEN 'OK' ELSE 'MAL: ve ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c3 admin lee recibos', 'MAL: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sgp.empleados (nombre, sueldo_semanal, dias_por_semana) VALUES ('Prueba Beto', 100000, 5) RETURNING id INTO v_id;
    UPDATE sgp.empleados SET telefono = '123' WHERE id = v_id;
    UPDATE sgp.empleados SET deleted_at = now() WHERE id = v_id;
    INSERT INTO resultado_016 VALUES ('c4 admin crea, edita y desactiva empleados', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c4 admin crea, edita y desactiva empleados', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.configuracion SET dia_pago = 5;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO resultado_016 VALUES ('c5 admin cambia el día de pago', CASE WHEN v_n = 1 THEN 'OK' ELSE 'MAL: tocó ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c5 admin cambia el día de pago', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.configuracion SET dia_pago = 7;
    INSERT INTO resultado_016 VALUES ('c6 día de pago fuera de 0 a 6', 'MAL: aceptó 7');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c6 día de pago fuera de 0 a 6', 'OK'); END;

  BEGIN
    DELETE FROM sgp.empleados WHERE nombre = 'Prueba Ana';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO resultado_016 VALUES ('c7 admin no borra empleados', CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: borró ' || v_n END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c7 admin no borra empleados', 'OK'); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, monto)
      VALUES ((SELECT valor::UUID FROM fx_016 WHERE clave = 'emp'), DATE '2030-01-06', 'adelanto', NULL);
    INSERT INTO resultado_016 VALUES ('c8 adelanto sin monto', 'MAL: aceptó adelanto sin monto');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c8 adelanto sin monto', 'OK'); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, descontar)
      VALUES ((SELECT valor::UUID FROM fx_016 WHERE clave = 'emp'), DATE '2030-01-06', 'charla', true);
    INSERT INTO resultado_016 VALUES ('c9 descontar solo en inasistencia', 'MAL: aceptó descontar en una charla');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c9 descontar solo en inasistencia', 'OK'); END;

  BEGIN
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, detalle, monto)
      VALUES ((SELECT valor::UUID FROM fx_016 WHERE clave = 'emp'), DATE '2030-01-06', 'adelanto', 'Adelanto de prueba', 50000);
    INSERT INTO sgp.novedades_personal (empleado_id, fecha, tipo, detalle, descontar)
      VALUES ((SELECT valor::UUID FROM fx_016 WHERE clave = 'emp'), DATE '2030-01-07', 'inasistencia', 'Faltó', true);
    INSERT INTO resultado_016 VALUES ('c10 admin carga novedades válidas', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('c10 admin carga novedades válidas', 'MAL: ' || SQLERRM); END;
END $$;

-- ─── (d) totales del trigger ──────────────────────────────────────────
-- Pago nuevo de otra semana, con totales "mentirosos" a propósito: la base los pisa.
DO $$
DECLARE
  v_emp UUID := (SELECT valor::UUID FROM fx_016 WHERE clave = 'emp');
  v_pago UUID;
  p sgp.pagos_personal%ROWTYPE;
  v_item_desc UUID;
BEGIN
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana,
                                    total_extras, total_descuentos, total_a_cobrar)
      VALUES (v_emp, DATE '2030-01-12', DATE '2030-01-18', 200000, 6, 999, 888, 777)
      RETURNING id INTO v_pago;
    INSERT INTO fx_016 VALUES ('pago', v_pago::TEXT);
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('d1 totales del cliente se pisan',
      CASE WHEN p.total_extras = 0 AND p.total_descuentos = 0 AND p.total_a_cobrar = 200000 AND p.estado = 'borrador'
           THEN 'OK' ELSE 'MAL: ' || p.total_extras || '/' || p.total_descuentos || '/' || p.total_a_cobrar END);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('d1 totales del cliente se pisan', 'MAL: ' || SQLERRM);
    RETURN;
  END;

  -- Ejemplo del diseño: 200000 + 3 h extra x 5000 (15000) - 1 día (200000/6 = 33333,33) = 181666,67
  BEGIN
    INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, cantidad, monto)
      VALUES (v_pago, 'Hora extra', 'extra', 'por_unidad', 5000, 3, 15000);
    INSERT INTO sgp.pagos_personal_items (pago_id, concepto_id, nombre, tipo, modo, valor, cantidad, monto)
      VALUES (v_pago, (SELECT id FROM sgp.conceptos_pago WHERE nombre = 'Inasistencia' AND deleted_at IS NULL),
              'Inasistencia', 'descuento', 'dias_de_sueldo', 0, 1, 33333.33)
      RETURNING id INTO v_item_desc;
    INSERT INTO fx_016 VALUES ('item_desc', v_item_desc::TEXT);
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('d2 total = sueldo + extras - descuentos',
      CASE WHEN p.total_extras = 15000 AND p.total_descuentos = 33333.33 AND p.total_a_cobrar = 181666.67
           THEN 'OK' ELSE 'MAL: ' || p.total_extras || '/' || p.total_descuentos || '/' || p.total_a_cobrar END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('d2 total = sueldo + extras - descuentos', 'MAL: ' || SQLERRM); END;

  -- Quitar un ítem (soft delete) recalcula
  BEGIN
    UPDATE sgp.pagos_personal_items SET deleted_at = now() WHERE id = v_item_desc;
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('d3 quitar un ítem recalcula',
      CASE WHEN p.total_extras = 15000 AND p.total_descuentos = 0 AND p.total_a_cobrar = 215000
           THEN 'OK' ELSE 'MAL: ' || p.total_extras || '/' || p.total_descuentos || '/' || p.total_a_cobrar END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('d3 quitar un ítem recalcula', 'MAL: ' || SQLERRM); END;

  -- Cambiar el sueldo del borrador recalcula
  BEGIN
    UPDATE sgp.pagos_personal SET sueldo_semanal = 100000 WHERE id = v_pago;
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('d4 cambiar el sueldo del borrador recalcula',
      CASE WHEN p.total_a_cobrar = 115000 THEN 'OK' ELSE 'MAL: ' || p.total_a_cobrar END);
    UPDATE sgp.pagos_personal SET sueldo_semanal = 200000 WHERE id = v_pago;
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('d4 cambiar el sueldo del borrador recalcula', 'MAL: ' || SQLERRM); END;

  -- (e) descuentos que superan el total → error claro
  BEGIN
    INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, cantidad, monto)
      VALUES (v_pago, 'Faltante enorme', 'descuento', 'fijo', 300000, 1, 300000);
    INSERT INTO resultado_016 VALUES ('e1 descuento que deja el total negativo', 'MAL: lo aceptó');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('e1 descuento que deja el total negativo',
      CASE WHEN SQLERRM LIKE '%negativo%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;

  -- (g) único por empleada y semana
  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_emp, DATE '2030-01-12', DATE '2030-01-18', 200000, 6);
    INSERT INTO resultado_016 VALUES ('g1 una sola vez por empleada y semana', 'MAL: duplicó la semana');
  EXCEPTION WHEN unique_violation THEN INSERT INTO resultado_016 VALUES ('g1 una sola vez por empleada y semana', 'OK');
            WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('g1 una sola vez por empleada y semana', 'MAL: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana)
      VALUES (v_emp, DATE '2030-03-02', DATE '2030-03-10', 200000, 6);
    INSERT INTO resultado_016 VALUES ('g2 la semana tiene que ser de 7 días', 'MAL: aceptó 9 días');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('g2 la semana tiene que ser de 7 días', 'OK'); END;

  BEGIN
    INSERT INTO sgp.pagos_personal (empleado_id, semana_desde, semana_hasta, sueldo_semanal, dias_por_semana, estado, medio_pago)
      VALUES (v_emp, DATE '2030-04-06', DATE '2030-04-12', 200000, 6, 'pagado', 'efectivo');
    INSERT INTO resultado_016 VALUES ('g3 un pago nuevo nace borrador', 'MAL: nació pagado');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('g3 un pago nuevo nace borrador', CASE WHEN SQLERRM LIKE '%borrador%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;

  BEGIN
    UPDATE sgp.pagos_personal_items SET pago_id = (SELECT valor::UUID FROM fx_016 WHERE clave = 'pago_dueno')
      WHERE pago_id = v_pago AND deleted_at IS NULL;
    INSERT INTO resultado_016 VALUES ('g4 un ítem no cambia de pago', 'MAL: lo movió');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('g4 un ítem no cambia de pago', CASE WHEN SQLERRM LIKE '%otro%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
END $$;

-- ─── (f) candado de 'pagado' ──────────────────────────────────────────
DO $$
DECLARE
  v_pago UUID := (SELECT valor::UUID FROM fx_016 WHERE clave = 'pago');
  p sgp.pagos_personal%ROWTYPE;
  v_item UUID;
BEGIN
  -- Dejo el pago con un descuento (adelanto de 50000) para que tenga contenido
  INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, cantidad, monto)
    VALUES (v_pago, 'Adelanto', 'descuento', 'fijo', 50000, 1, 50000) RETURNING id INTO v_item;
  INSERT INTO fx_016 VALUES ('item_adelanto', v_item::TEXT);
  -- esperado: 200000 + 15000 - 50000 = 165000

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado' WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f1 pagado sin medio de pago', 'MAL: lo marcó pagado');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('f1 pagado sin medio de pago', CASE WHEN SQLERRM LIKE '%medio de pago%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'pagado', medio_pago = 'efectivo' WHERE id = v_pago;
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f2 marcar pagado: pagado_at y total',
      CASE WHEN p.estado = 'pagado' AND p.pagado_at IS NOT NULL AND p.total_a_cobrar = 165000 AND p.medio_pago = 'efectivo'
           THEN 'OK' ELSE 'MAL: ' || p.estado || ' ' || coalesce(p.pagado_at::TEXT, 'sin fecha') || ' ' || p.total_a_cobrar END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f2 marcar pagado: pagado_at y total', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET sueldo_semanal = 1 WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f3 pagado no se edita', 'MAL: cambió el sueldo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('f3 pagado no se edita', CASE WHEN SQLERRM LIKE '%ya está pagado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;

  BEGIN
    UPDATE sgp.pagos_personal SET deleted_at = now() WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f4 pagado no se desactiva', 'MAL: lo desactivó');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f4 pagado no se desactiva', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal SET estado = 'borrador' WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f5 pagado no vuelve a borrador', 'MAL: volvió a borrador');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f5 pagado no vuelve a borrador', 'OK'); END;

  BEGIN
    INSERT INTO sgp.pagos_personal_items (pago_id, nombre, tipo, modo, valor, cantidad, monto)
      VALUES (v_pago, 'Tarde', 'extra', 'fijo', 1, 1, 1);
    INSERT INTO resultado_016 VALUES ('f6 pagado no admite ítems nuevos', 'MAL: agregó un ítem');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_016 VALUES ('f6 pagado no admite ítems nuevos', CASE WHEN SQLERRM LIKE '%ya está pagado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;

  BEGIN
    UPDATE sgp.pagos_personal_items SET monto = 1 WHERE id = v_item;
    INSERT INTO resultado_016 VALUES ('f7 pagado no admite cambiar un ítem', 'MAL: cambió el monto');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f7 pagado no admite cambiar un ítem', 'OK'); END;

  BEGIN
    UPDATE sgp.pagos_personal_items SET deleted_at = now() WHERE id = v_item;
    INSERT INTO resultado_016 VALUES ('f8 pagado no admite quitar un ítem', 'MAL: quitó el ítem');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f8 pagado no admite quitar un ítem', 'OK'); END;

  -- Lo único permitido: poner recibo_ruta cuando estaba vacío
  BEGIN
    UPDATE sgp.pagos_personal SET recibo_ruta = 'prueba/recibo.pdf' WHERE id = v_pago;
    SELECT * INTO p FROM sgp.pagos_personal WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f9 pagado admite poner recibo_ruta una vez',
      CASE WHEN p.recibo_ruta = 'prueba/recibo.pdf' AND p.total_a_cobrar = 165000 THEN 'OK' ELSE 'MAL: ' || coalesce(p.recibo_ruta, 'vacío') END);
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f9 pagado admite poner recibo_ruta una vez', 'MAL: ' || SQLERRM); END;

  BEGIN
    UPDATE sgp.pagos_personal SET recibo_ruta = 'otra/ruta.pdf' WHERE id = v_pago;
    INSERT INTO resultado_016 VALUES ('f10 recibo_ruta no se cambia', 'MAL: la cambió');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f10 recibo_ruta no se cambia', 'OK'); END;

  -- Subir el recibo al bucket privado: el admin puede, y no puede pisarlo ni borrarlo
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('sgp-recibos', 'prueba/subida-admin.pdf');
    INSERT INTO resultado_016 VALUES ('f11 admin sube un recibo', 'OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO resultado_016 VALUES ('f11 admin sube un recibo', 'MAL: ' || SQLERRM); END;
END $$;

RESET ROLE;

-- Un cobro ya hecho conserva sus números en la tabla (como dueño de la base)
DO $$
DECLARE p sgp.pagos_personal%ROWTYPE;
BEGIN
  SELECT * INTO p FROM sgp.pagos_personal WHERE id = (SELECT valor::UUID FROM fx_016 WHERE clave = 'pago');
  INSERT INTO resultado_016 VALUES ('f12 el pago pagado quedó intacto',
    CASE WHEN p.estado = 'pagado' AND p.sueldo_semanal = 200000 AND p.total_extras = 15000
              AND p.total_descuentos = 50000 AND p.total_a_cobrar = 165000 AND p.deleted_at IS NULL
         THEN 'OK' ELSE 'MAL: ' || to_jsonb(p)::TEXT END);
END $$;

-- ─── (h) estructura ───────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO resultado_016 VALUES ('h1 ninguna policy DELETE en sgp',
    CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND cmd = 'DELETE') = 0 THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_016 VALUES ('h2 sgp-recibos y sgp-logo sin DELETE; recibos sin UPDATE',
    CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND (policyname LIKE 'sgp\_recibos\_%' OR policyname LIKE 'sgp\_logo\_%') AND cmd IN ('DELETE', 'ALL')) = 0
          AND (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                 AND policyname LIKE 'sgp\_recibos\_%' AND cmd = 'UPDATE') = 0
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_016 VALUES ('h3 recibos privado y PDF; logo público',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-recibos' AND public = false
                        AND allowed_mime_types = ARRAY['application/pdf']::text[] AND file_size_limit = 5242880)
          AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sgp-logo' AND public = true AND file_size_limit = 2097152)
         THEN 'OK' ELSE 'MAL' END);
  INSERT INTO resultado_016 VALUES ('h4 anon sin acceso a las tablas de personal',
    CASE WHEN NOT (has_table_privilege('anon', 'sgp.empleados', 'SELECT') OR has_table_privilege('anon', 'sgp.pagos_personal', 'SELECT')
                   OR has_table_privilege('anon', 'sgp.pagos_personal_items', 'SELECT')
                   OR has_table_privilege('anon', 'sgp.novedades_personal', 'SELECT')
                   OR has_table_privilege('anon', 'sgp.conceptos_pago', 'SELECT'))
         THEN 'OK' ELSE 'MAL' END);
END $$;

SELECT json_agg(json_build_object('caso', caso, 'resultado', resultado) ORDER BY caso) AS resultado_prueba_016
FROM resultado_016;

ROLLBACK;
