-- ============================================================
-- SGP Migration 014: Editar y anular pedidos desde la vista de Pedidos
-- Los dos roles de la app (admin 'taberna' y solo pedidos 'taberna_pedidos') pueden:
--   * EDITAR un pedido que todavía no se entregó: es el mismo pedido (mismo número),
--     se reemplazan sus líneas y queda un historial de ediciones (sgp.order_edits).
--   * ANULAR un pedido con un motivo escrito: va a la papelera (deleted_at) y queda
--     quién lo anuló y por qué.
-- Todo pasa por dos funciones SECURITY DEFINER que chequean el rol por dentro; las
-- policies de la 013 NO cambian (el rol solo pedidos sigue sin poder mandar a la
-- papelera por UPDATE directo). El precio y el nombre de cada línea los decide la
-- base: el front no puede fijarlos.
--
-- Requiere las migraciones 010 y 013 (sgp.es_taberna, es_personal, es_solo_pedidos).
-- Vuelta atrás: 014_editar_y_anular_pedido.rollback.sql
-- Prueba de roles: supabase/pruebas/014_prueba_rls.sql
-- ============================================================

BEGIN;

-- ─── 1. Columnas nuevas en sgp.orders ────────────────────────────────
ALTER TABLE sgp.orders
  ADD COLUMN IF NOT EXISTS anulado_por TEXT,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS editado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ediciones INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Historial de ediciones: solo lo escribe sgp.editar_pedido ────
CREATE TABLE IF NOT EXISTS sgp.order_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES sgp.orders(id),
  editado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  antes JSONB NOT NULL,
  despues JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sgp_order_edits_order_id ON sgp.order_edits(order_id);

ALTER TABLE sgp.order_edits ENABLE ROW LEVEL SECURITY;

-- Solo lectura para la app; sin policies de INSERT/UPDATE/DELETE
REVOKE ALL ON sgp.order_edits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON sgp.order_edits TO authenticated;

DROP POLICY IF EXISTS "sgp_order_edits_select" ON sgp.order_edits;
CREATE POLICY "sgp_order_edits_select" ON sgp.order_edits FOR SELECT TO authenticated
  USING ((SELECT sgp.es_taberna()));

-- ─── 3. sgp.editar_pedido ────────────────────────────────────────────
-- p_items: [{ "product_id": uuid, "quantity": int, "notes": text|null (opcional) }]
-- Cualquier otro campo del JSON (por ejemplo unit_price) se ignora.
CREATE OR REPLACE FUNCTION sgp.editar_pedido(
  p_order_id UUID,
  p_items JSONB,
  p_type TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_customer_name TEXT,
  p_delivery_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pedido sgp.orders%ROWTYPE;
  v_viejo sgp.order_items%ROWTYPE;
  v_prod sgp.products%ROWTYPE;
  v_elem JSONB;
  v_pid UUID;
  v_cant NUMERIC;
  v_nombre TEXT;
  v_precio NUMERIC(12,2);
  v_nota TEXT;
  v_vistos UUID[] := ARRAY[]::UUID[];
  v_lineas JSONB := '[]'::JSONB;
  v_total NUMERIC(12,2) := 0;
  v_email TEXT;
  v_cliente TEXT;
  v_direccion TEXT;
  v_notas TEXT;
  v_antes JSONB;
  v_despues JSONB;
BEGIN
  IF NOT (SELECT sgp.es_personal()) THEN
    RAISE EXCEPTION 'No tenés permiso' USING ERRCODE = '42501';
  END IF;

  -- Bloquea la fila: dos personas editando a la vez se hacen cola
  SELECT * INTO v_pedido FROM sgp.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;
  IF v_pedido.deleted_at IS NOT NULL OR v_pedido.status IN ('entregado', 'cancelado') THEN
    RAISE EXCEPTION 'El pedido ya fue entregado o anulado: no se puede editar';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('local', 'delivery') THEN
    RAISE EXCEPTION 'El tipo de pedido no es válido';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('efectivo', 'debito', 'transferencia') THEN
    RAISE EXCEPTION 'El medio de pago no es válido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido tiene que tener al menos un producto';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'El pedido tiene demasiados productos';
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END IF;

    BEGIN
      v_pid := (v_elem->>'product_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END;
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'Hay un producto con datos inválidos';
    END IF;
    IF v_pid = ANY (v_vistos) THEN
      RAISE EXCEPTION 'Hay un producto repetido en el pedido';
    END IF;
    v_vistos := v_vistos || v_pid;

    IF jsonb_typeof(v_elem->'quantity') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'La cantidad de un producto no es válida';
    END IF;
    v_cant := (v_elem->>'quantity')::NUMERIC;
    IF v_cant <> trunc(v_cant) OR v_cant < 1 OR v_cant > 999 THEN
      RAISE EXCEPTION 'La cantidad de un producto no es válida (de 1 a 999)';
    END IF;

    -- Precio y nombre: si la línea ya estaba, se conservan; si es nueva, del catálogo.
    -- Lo que mande el cliente en unit_price / product_name se ignora.
    SELECT * INTO v_viejo
      FROM sgp.order_items
      WHERE order_id = p_order_id AND product_id = v_pid
      ORDER BY id LIMIT 1;
    IF FOUND THEN
      v_nombre := v_viejo.product_name;
      v_precio := v_viejo.unit_price;
      IF v_elem ? 'notes' THEN
        v_nota := nullif(btrim(v_elem->>'notes'), '');
      ELSE
        v_nota := v_viejo.notes;
      END IF;
    ELSE
      SELECT * INTO v_prod
        FROM sgp.products
        WHERE id = v_pid AND active = true AND deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Hay un producto que ya no está disponible';
      END IF;
      v_nombre := v_prod.name;
      v_precio := v_prod.price;
      v_nota := nullif(btrim(v_elem->>'notes'), '');
    END IF;

    v_lineas := v_lineas || jsonb_build_object(
      'product_id', v_pid,
      'product_name', v_nombre,
      'unit_price', v_precio,
      'quantity', v_cant::INTEGER,
      'notes', v_nota
    );
    v_total := v_total + v_precio * v_cant;
  END LOOP;

  v_cliente := nullif(btrim(p_customer_name), '');
  v_notas := nullif(btrim(p_notes), '');
  v_direccion := CASE WHEN p_type = 'delivery' THEN nullif(btrim(p_delivery_address), '') ELSE NULL END;

  -- Foto de antes (pedido + líneas)
  v_antes := jsonb_build_object(
    'pedido', jsonb_build_object(
      'type', v_pedido.type,
      'payment_method', v_pedido.payment_method,
      'notes', v_pedido.notes,
      'customer_name', v_pedido.customer_name,
      'delivery_address', v_pedido.delivery_address,
      'total', v_pedido.total
    ),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', i.product_id,
        'product_name', i.product_name,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'notes', i.notes
      ) ORDER BY i.id)
      FROM sgp.order_items i
      WHERE i.order_id = p_order_id
    ), '[]'::JSONB)
  );

  v_despues := jsonb_build_object(
    'pedido', jsonb_build_object(
      'type', p_type,
      'payment_method', p_payment_method,
      'notes', v_notas,
      'customer_name', v_cliente,
      'delivery_address', v_direccion,
      'total', v_total
    ),
    'items', v_lineas
  );

  -- Reemplazar las líneas (subtotal es columna generada: no se inserta)
  DELETE FROM sgp.order_items WHERE order_id = p_order_id;

  INSERT INTO sgp.order_items (order_id, product_id, product_name, unit_price, quantity, notes)
  SELECT p_order_id, l.product_id, l.product_name, l.unit_price, l.quantity, l.notes
  FROM jsonb_to_recordset(v_lineas) AS l(
    product_id UUID, product_name TEXT, unit_price NUMERIC, quantity INTEGER, notes TEXT
  );

  -- No toca status ni order_number
  UPDATE sgp.orders SET
    total = v_total,
    type = p_type,
    payment_method = p_payment_method,
    notes = v_notas,
    customer_name = v_cliente,
    delivery_address = v_direccion,
    editado_at = now(),
    ediciones = ediciones + 1
  WHERE id = p_order_id;

  v_email := coalesce((SELECT auth.jwt())->>'email', 'desconocido');

  INSERT INTO sgp.order_edits (order_id, editado_por, antes, despues)
  VALUES (p_order_id, v_email, v_antes, v_despues);

  RETURN p_order_id;
END;
$$;

-- ─── 4. sgp.anular_pedido ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sgp.anular_pedido(p_order_id UUID, p_motivo TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pedido sgp.orders%ROWTYPE;
  v_motivo TEXT;
BEGIN
  IF NOT (SELECT sgp.es_personal()) THEN
    RAISE EXCEPTION 'No tenés permiso' USING ERRCODE = '42501';
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF length(v_motivo) < 3 THEN
    RAISE EXCEPTION 'Escribí el motivo de la anulación (mínimo 3 letras)';
  END IF;
  IF length(v_motivo) > 200 THEN
    RAISE EXCEPTION 'El motivo es muy largo (máximo 200 caracteres)';
  END IF;

  SELECT * INTO v_pedido FROM sgp.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;
  IF v_pedido.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'El pedido ya está anulado';
  END IF;
  IF v_pedido.status = 'entregado' AND (SELECT sgp.es_solo_pedidos()) THEN
    RAISE EXCEPTION 'Un pedido entregado solo lo puede anular el administrador';
  END IF;

  UPDATE sgp.orders SET
    deleted_at = now(),
    anulado_por = coalesce((SELECT auth.jwt())->>'email', 'desconocido'),
    motivo_anulacion = v_motivo
  WHERE id = p_order_id;

  RETURN p_order_id;
END;
$$;

-- ─── 5. Permisos: solo usuarios logueados, nunca anon ni PUBLIC ──────
REVOKE EXECUTE ON FUNCTION sgp.editar_pedido(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION sgp.anular_pedido(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sgp.editar_pedido(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sgp.anular_pedido(UUID, TEXT) TO authenticated;

-- ─── 6. Verificación: devuelve OK o FALTA ─────────────────────────────
SELECT
  CASE
    WHEN (SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'sgp' AND table_name = 'orders'
              AND column_name IN ('anulado_por', 'motivo_anulacion', 'editado_at', 'ediciones')) <> 4
      THEN 'FALTA: columnas nuevas de sgp.orders'
    WHEN to_regclass('sgp.order_edits') IS NULL THEN 'FALTA: tabla sgp.order_edits'
    WHEN NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'sgp.order_edits'::regclass)
      THEN 'FALTA: RLS en sgp.order_edits'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'order_edits') <> 1
      THEN 'FALTA: sgp.order_edits tiene que tener una sola policy (SELECT)'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND tablename = 'order_edits'
            AND policyname = 'sgp_order_edits_select' AND cmd = 'SELECT'
            AND qual LIKE '%es_taberna%') <> 1
      THEN 'FALTA: policy de SELECT solo admin en sgp.order_edits'
    WHEN to_regprocedure('sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)') IS NULL
      THEN 'FALTA: función sgp.editar_pedido'
    WHEN to_regprocedure('sgp.anular_pedido(uuid,text)') IS NULL
      THEN 'FALTA: función sgp.anular_pedido'
    WHEN NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)'::regprocedure)
      THEN 'FALTA: sgp.editar_pedido no es SECURITY DEFINER'
    WHEN NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'sgp.anular_pedido(uuid,text)'::regprocedure)
      THEN 'FALTA: sgp.anular_pedido no es SECURITY DEFINER'
    WHEN has_function_privilege('anon', 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
      OR has_function_privilege('anon', 'sgp.anular_pedido(uuid,text)', 'EXECUTE')
      THEN 'FALTA: anon puede ejecutar las funciones'
    WHEN EXISTS (
           SELECT 1 FROM pg_proc p,
                LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
           WHERE p.oid IN ('sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)'::regprocedure,
                           'sgp.anular_pedido(uuid,text)'::regprocedure)
             AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
      THEN 'FALTA: PUBLIC puede ejecutar las funciones'
    WHEN NOT has_function_privilege('authenticated', 'sgp.editar_pedido(uuid,jsonb,text,text,text,text,text)', 'EXECUTE')
      OR NOT has_function_privilege('authenticated', 'sgp.anular_pedido(uuid,text)', 'EXECUTE')
      THEN 'FALTA: authenticated no puede ejecutar las funciones'
    WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'sgp' AND (qual = 'true' OR with_check = 'true')) > 0
      THEN 'FALTA: quedan policies abiertas'
    ELSE 'OK'
  END AS verificacion;

COMMIT;
