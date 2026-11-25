-- ============================================================
-- Prueba de la migración 014 (editar y anular pedidos) — NO deja nada en la base.
-- Se corre ENTERO (SQL Editor o psql) después de aplicar la 014. Todo va dentro de
-- BEGIN … ROLLBACK: los pedidos de prueba, el historial y las anulaciones se deshacen.
-- Hace falta que haya al menos 3 productos activos en sgp.products.
-- Simula los roles con SET LOCAL ROLE authenticated + request.jwt.claims.
-- Resultado: un solo SELECT json_agg con una fila por caso: OK o MAL: <detalle>.
-- (Si el ejecutor solo devuelve el resultado del ÚLTIMO statement, correrlo con psql:
--  el SELECT json_agg va antes del ROLLBACK.)
-- ============================================================

BEGIN;

CREATE TEMP TABLE fx_014 (clave TEXT PRIMARY KEY, valor TEXT);
CREATE TEMP TABLE resultado_014 (caso TEXT, resultado TEXT);
GRANT ALL ON fx_014, resultado_014 TO PUBLIC;

-- ─── Datos de prueba (como dueño de la base) ──────────────────────────
DO $$
DECLARE
  p UUID[];
  v_a UUID;
  v_b UUID;
  v_p1 NUMERIC;
  v_p2 NUMERIC;
BEGIN
  SELECT array_agg(id ORDER BY name) INTO p
  FROM (SELECT id, name FROM sgp.products WHERE active = true AND deleted_at IS NULL ORDER BY name LIMIT 3) x;
  IF coalesce(array_length(p, 1), 0) < 3 THEN
    RAISE EXCEPTION 'Hacen falta al menos 3 productos activos para correr la prueba';
  END IF;

  SELECT price INTO v_p1 FROM sgp.products WHERE id = p[1];
  SELECT price INTO v_p2 FROM sgp.products WHERE id = p[2];

  -- Pedido A (pendiente): línea 1 con un precio DISTINTO al del catálogo (+1000),
  -- para comprobar que la edición conserva el precio de la línea
  INSERT INTO sgp.orders (type, payment_method, total) VALUES ('local', 'efectivo', 0) RETURNING id INTO v_a;
  INSERT INTO sgp.order_items (order_id, product_id, product_name, unit_price, quantity)
    SELECT v_a, p[1], name, v_p1 + 1000, 2 FROM sgp.products WHERE id = p[1];
  INSERT INTO sgp.order_items (order_id, product_id, product_name, unit_price, quantity)
    SELECT v_a, p[2], name, v_p2, 1 FROM sgp.products WHERE id = p[2];
  UPDATE sgp.orders SET total = (v_p1 + 1000) * 2 + v_p2 WHERE id = v_a;

  -- Pedido B (ya entregado)
  INSERT INTO sgp.orders (type, payment_method, total, status) VALUES ('local', 'efectivo', v_p1, 'entregado') RETURNING id INTO v_b;
  INSERT INTO sgp.order_items (order_id, product_id, product_name, unit_price, quantity)
    SELECT v_b, p[1], name, v_p1, 1 FROM sgp.products WHERE id = p[1];

  INSERT INTO fx_014 VALUES
    ('p1', p[1]::TEXT), ('p2', p[2]::TEXT), ('p3', p[3]::TEXT),
    ('a', v_a::TEXT), ('b', v_b::TEXT),
    ('a_numero', (SELECT order_number FROM sgp.orders WHERE id = v_a)::TEXT),
    ('precio_p1_viejo', (v_p1 + 1000)::TEXT),
    ('precio_p3', (SELECT price FROM sgp.products WHERE id = p[3])::TEXT);
END $$;

-- ─── (a) y (b): rol solo pedidos edita; el precio del cliente se ignora ──
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"prueba@x","app_metadata":{"rol":"taberna_pedidos"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_p1 TEXT := (SELECT valor FROM fx_014 WHERE clave = 'p1');
  v_p3 TEXT := (SELECT valor FROM fx_014 WHERE clave = 'p3');
BEGIN
  -- Cambia cantidad de p1 (2 → 3), saca p2, agrega p3. Manda unit_price: 1 a propósito.
  PERFORM sgp.editar_pedido(
    v_a,
    jsonb_build_array(
      jsonb_build_object('product_id', v_p1, 'quantity', 3, 'unit_price', 1, 'product_name', 'Hackeado'),
      jsonb_build_object('product_id', v_p3, 'quantity', 1, 'unit_price', 1)
    ),
    'delivery', 'transferencia', 'sin sal', 'Cliente Prueba', 'Calle 123'
  );
  INSERT INTO fx_014 VALUES ('a_error', '');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO fx_014 VALUES ('a_error', SQLERRM);
END $$;

-- (h) lectura de order_edits con el rol solo pedidos: tiene que ver 0 filas
DO $$
DECLARE v_n INTEGER;
BEGIN
  SELECT count(*) INTO v_n FROM sgp.order_edits;
  INSERT INTO resultado_014 VALUES ('h1 solo pedidos no lee order_edits',
    CASE WHEN v_n = 0 THEN 'OK' ELSE 'MAL: ve ' || v_n || ' filas' END);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO resultado_014 VALUES ('h1 solo pedidos no lee order_edits', 'OK (' || SQLERRM || ')');
END $$;

RESET ROLE;

DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_err TEXT := (SELECT valor FROM fx_014 WHERE clave = 'a_error');
  v_esperado NUMERIC := (SELECT valor::NUMERIC FROM fx_014 WHERE clave = 'precio_p1_viejo') * 3
                        + (SELECT valor::NUMERIC FROM fx_014 WHERE clave = 'precio_p3');
  o sgp.orders%ROWTYPE;
  v_ed INTEGER;
  v_quien TEXT;
  v_p1 UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'p1');
  v_p2 UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'p2');
  v_p3 UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'p3');
  v_precio_l1 NUMERIC;
  v_precio_l3 NUMERIC;
  v_nombre_l1 TEXT;
BEGIN
  IF v_err <> '' THEN
    INSERT INTO resultado_014 VALUES ('a edición del rol solo pedidos', 'MAL: falló con ' || v_err);
    INSERT INTO resultado_014 VALUES ('b precio del cliente ignorado', 'MAL: no se pudo evaluar');
    RETURN;
  END IF;

  SELECT * INTO o FROM sgp.orders WHERE id = v_a;
  SELECT count(*), max(editado_por) INTO v_ed, v_quien FROM sgp.order_edits WHERE order_id = v_a;

  INSERT INTO resultado_014 VALUES ('a1 total recalculado',
    CASE WHEN o.total = v_esperado THEN 'OK' ELSE 'MAL: total ' || o.total || ' esperado ' || v_esperado END);
  INSERT INTO resultado_014 VALUES ('a2 ediciones = 1 y editado_at cargado',
    CASE WHEN o.ediciones = 1 AND o.editado_at IS NOT NULL THEN 'OK'
         ELSE 'MAL: ediciones=' || o.ediciones || ' editado_at=' || coalesce(o.editado_at::TEXT, 'null') END);
  INSERT INTO resultado_014 VALUES ('a3 historial en order_edits',
    CASE WHEN v_ed = 1 AND v_quien = 'prueba@x' THEN 'OK' ELSE 'MAL: filas=' || v_ed || ' por=' || coalesce(v_quien, 'null') END);
  INSERT INTO resultado_014 VALUES ('a4 mismo número, mismo estado, campos nuevos',
    CASE WHEN o.order_number = (SELECT valor::INTEGER FROM fx_014 WHERE clave = 'a_numero')
          AND o.status = 'pendiente' AND o.type = 'delivery' AND o.payment_method = 'transferencia'
          AND o.notes = 'sin sal' AND o.customer_name = 'Cliente Prueba' AND o.delivery_address = 'Calle 123'
         THEN 'OK' ELSE 'MAL: ' || to_jsonb(o)::TEXT END);
  INSERT INTO resultado_014 VALUES ('a5 líneas: sale p2, entra p3, p1 con 3',
    CASE WHEN (SELECT count(*) FROM sgp.order_items WHERE order_id = v_a) = 2
          AND NOT EXISTS (SELECT 1 FROM sgp.order_items WHERE order_id = v_a AND product_id = v_p2)
          AND EXISTS (SELECT 1 FROM sgp.order_items WHERE order_id = v_a AND product_id = v_p3 AND quantity = 1)
          AND EXISTS (SELECT 1 FROM sgp.order_items WHERE order_id = v_a AND product_id = v_p1 AND quantity = 3)
         THEN 'OK' ELSE 'MAL: líneas inesperadas' END);

  SELECT unit_price, product_name INTO v_precio_l1, v_nombre_l1 FROM sgp.order_items WHERE order_id = v_a AND product_id = v_p1;
  SELECT unit_price INTO v_precio_l3 FROM sgp.order_items WHERE order_id = v_a AND product_id = v_p3;
  INSERT INTO resultado_014 VALUES ('b precio del cliente ignorado',
    CASE WHEN v_precio_l1 = (SELECT valor::NUMERIC FROM fx_014 WHERE clave = 'precio_p1_viejo')
          AND v_precio_l3 = (SELECT valor::NUMERIC FROM fx_014 WHERE clave = 'precio_p3')
          AND v_nombre_l1 <> 'Hackeado'
         THEN 'OK' ELSE 'MAL: p1=' || v_precio_l1 || ' p3=' || v_precio_l3 || ' nombre=' || v_nombre_l1 END);
END $$;

-- (h2) el admin sí lee order_edits; (i) nadie puede escribirla directo
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_n INTEGER;
BEGIN
  SELECT count(*) INTO v_n FROM sgp.order_edits;
  INSERT INTO resultado_014 VALUES ('h2 admin lee order_edits',
    CASE WHEN v_n >= 1 THEN 'OK' ELSE 'MAL: ve ' || v_n || ' filas' END);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO resultado_014 VALUES ('h2 admin lee order_edits', 'MAL: ' || SQLERRM);
END $$;

DO $$
BEGIN
  INSERT INTO sgp.order_edits (order_id, editado_por, antes, despues)
  VALUES ((SELECT valor::UUID FROM fx_014 WHERE clave = 'a'), 'x', '{}'::JSONB, '{}'::JSONB);
  INSERT INTO resultado_014 VALUES ('i nadie escribe order_edits directo', 'MAL: el INSERT directo funcionó');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO resultado_014 VALUES ('i nadie escribe order_edits directo', 'OK');
END $$;

-- ─── (c) rol 'otro' → error de permiso en las dos funciones ───────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"otro@x","app_metadata":{"rol":"otro"}}', true);

DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_p1 TEXT := (SELECT valor FROM fx_014 WHERE clave = 'p1');
BEGIN
  BEGIN
    PERFORM sgp.editar_pedido(v_a, jsonb_build_array(jsonb_build_object('product_id', v_p1, 'quantity', 1)),
                              'local', 'efectivo', NULL, NULL, NULL);
    INSERT INTO resultado_014 VALUES ('c1 rol otro no edita', 'MAL: pudo editar');
  EXCEPTION
    WHEN insufficient_privilege THEN INSERT INTO resultado_014 VALUES ('c1 rol otro no edita', 'OK');
    WHEN OTHERS THEN INSERT INTO resultado_014 VALUES ('c1 rol otro no edita', 'MAL: ' || SQLERRM);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, 'Prueba de permisos');
    INSERT INTO resultado_014 VALUES ('c2 rol otro no anula', 'MAL: pudo anular');
  EXCEPTION
    WHEN insufficient_privilege THEN INSERT INTO resultado_014 VALUES ('c2 rol otro no anula', 'OK');
    WHEN OTHERS THEN INSERT INTO resultado_014 VALUES ('c2 rol otro no anula', 'MAL: ' || SQLERRM);
  END;
END $$;

-- ─── (d) rol puesto en user_metadata → error ──────────────────────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"u@x","user_metadata":{"rol":"taberna"},"app_metadata":{}}', true);

DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_p1 TEXT := (SELECT valor FROM fx_014 WHERE clave = 'p1');
BEGIN
  BEGIN
    PERFORM sgp.editar_pedido(v_a, jsonb_build_array(jsonb_build_object('product_id', v_p1, 'quantity', 1)),
                              'local', 'efectivo', NULL, NULL, NULL);
    INSERT INTO resultado_014 VALUES ('d1 user_metadata no edita', 'MAL: pudo editar');
  EXCEPTION
    WHEN insufficient_privilege THEN INSERT INTO resultado_014 VALUES ('d1 user_metadata no edita', 'OK');
    WHEN OTHERS THEN INSERT INTO resultado_014 VALUES ('d1 user_metadata no edita', 'MAL: ' || SQLERRM);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, 'Prueba de permisos');
    INSERT INTO resultado_014 VALUES ('d2 user_metadata no anula', 'MAL: pudo anular');
  EXCEPTION
    WHEN insufficient_privilege THEN INSERT INTO resultado_014 VALUES ('d2 user_metadata no anula', 'OK');
    WHEN OTHERS THEN INSERT INTO resultado_014 VALUES ('d2 user_metadata no anula', 'MAL: ' || SQLERRM);
  END;
END $$;

-- ─── (e) solo pedidos anula: sin motivo falla; con motivo anda ────────
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"prueba@x","app_metadata":{"rol":"taberna_pedidos"}}', true);

DO $$
DECLARE v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
BEGIN
  BEGIN
    PERFORM sgp.anular_pedido(v_a, '');
    INSERT INTO resultado_014 VALUES ('e1 anular sin motivo', 'MAL: anuló sin motivo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('e1 anular sin motivo', CASE WHEN SQLERRM LIKE '%motivo%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, '  ab  ');
    INSERT INTO resultado_014 VALUES ('e2 motivo de 2 letras', 'MAL: anuló con motivo corto');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('e2 motivo de 2 letras', CASE WHEN SQLERRM LIKE '%motivo%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, repeat('x', 201));
    INSERT INTO resultado_014 VALUES ('e3 motivo de 201 caracteres', 'MAL: anuló con motivo largo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('e3 motivo de 201 caracteres', CASE WHEN SQLERRM LIKE '%motivo%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, '  Se cargó mal  ');
    INSERT INTO fx_014 VALUES ('e_error', '');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO fx_014 VALUES ('e_error', SQLERRM);
  END;
END $$;

-- (f) editar un pedido anulado, y anular dos veces → error
DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_p1 TEXT := (SELECT valor FROM fx_014 WHERE clave = 'p1');
BEGIN
  BEGIN
    PERFORM sgp.editar_pedido(v_a, jsonb_build_array(jsonb_build_object('product_id', v_p1, 'quantity', 1)),
                              'local', 'efectivo', NULL, NULL, NULL);
    INSERT INTO resultado_014 VALUES ('f1 editar un pedido anulado', 'MAL: pudo editarlo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('f1 editar un pedido anulado', CASE WHEN SQLERRM LIKE '%anulado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM sgp.anular_pedido(v_a, 'Otra vez');
    INSERT INTO resultado_014 VALUES ('f2 anular dos veces', 'MAL: anuló de nuevo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('f2 anular dos veces', CASE WHEN SQLERRM LIKE '%ya está anulado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
END $$;

-- (g) pedido ENTREGADO: solo pedidos no puede anular
DO $$
DECLARE v_b UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'b');
BEGIN
  BEGIN
    PERFORM sgp.anular_pedido(v_b, 'Quiero anularlo');
    INSERT INTO resultado_014 VALUES ('g1 solo pedidos anula un entregado', 'MAL: pudo anularlo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('g1 solo pedidos anula un entregado', CASE WHEN SQLERRM LIKE '%administrador%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
  BEGIN
    PERFORM sgp.editar_pedido(v_b, jsonb_build_array(jsonb_build_object('product_id', (SELECT valor FROM fx_014 WHERE clave = 'p1'), 'quantity', 1)),
                              'local', 'efectivo', NULL, NULL, NULL);
    INSERT INTO resultado_014 VALUES ('g2 editar un entregado', 'MAL: pudo editarlo');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultado_014 VALUES ('g2 editar un entregado', CASE WHEN SQLERRM LIKE '%entregado%' THEN 'OK' ELSE 'MAL: ' || SQLERRM END);
  END;
END $$;

-- el admin sí anula el entregado
SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"admin@x","app_metadata":{"rol":"taberna"}}', true);

DO $$
DECLARE v_b UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'b');
BEGIN
  PERFORM sgp.anular_pedido(v_b, 'Anulación del admin');
  INSERT INTO fx_014 VALUES ('g_admin_error', '');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO fx_014 VALUES ('g_admin_error', SQLERRM);
END $$;

RESET ROLE;

-- ─── Verificación final de anulaciones (como dueño de la base) ────────
DO $$
DECLARE
  v_a UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'a');
  v_b UUID := (SELECT valor::UUID FROM fx_014 WHERE clave = 'b');
  v_eerr TEXT := (SELECT valor FROM fx_014 WHERE clave = 'e_error');
  v_gerr TEXT := (SELECT valor FROM fx_014 WHERE clave = 'g_admin_error');
  o sgp.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM sgp.orders WHERE id = v_a;
  INSERT INTO resultado_014 VALUES ('e4 anular con motivo',
    CASE WHEN v_eerr = '' AND o.deleted_at IS NOT NULL AND o.anulado_por = 'prueba@x'
              AND o.motivo_anulacion = 'Se cargó mal' AND o.status = 'pendiente'
         THEN 'OK'
         ELSE 'MAL: error=' || v_eerr || ' deleted_at=' || coalesce(o.deleted_at::TEXT, 'null')
              || ' por=' || coalesce(o.anulado_por, 'null') || ' motivo=' || coalesce(o.motivo_anulacion, 'null') END);

  SELECT * INTO o FROM sgp.orders WHERE id = v_b;
  INSERT INTO resultado_014 VALUES ('g3 el admin anula un entregado',
    CASE WHEN v_gerr = '' AND o.deleted_at IS NOT NULL AND o.anulado_por = 'admin@x'
              AND o.motivo_anulacion = 'Anulación del admin'
         THEN 'OK' ELSE 'MAL: error=' || v_gerr || ' por=' || coalesce(o.anulado_por, 'null') END);
END $$;

SELECT json_agg(json_build_object('caso', caso, 'resultado', resultado) ORDER BY caso) AS resultado_prueba_014
FROM resultado_014;

ROLLBACK;
