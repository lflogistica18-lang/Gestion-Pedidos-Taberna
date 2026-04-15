-- ============================================================
-- SGP Migration 008: Agregar soft-delete a Orders
-- ============================================================

ALTER TABLE sgp.orders ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Ignorar ordenes borradas lógicamente
-- (Deberás aplicar reglas RLS o cambiar las views si corresponde)
