-- ============================================================
-- SGP Migration 001: Schema + Tabla Products
-- Usa schema 'sgp' para aislar del resto del proyecto Supabase
-- ============================================================

CREATE SCHEMA IF NOT EXISTS sgp;

CREATE TABLE sgp.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comida', 'bebida', 'postre')),
  price NUMERIC NOT NULL CHECK (price >= 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sgp_products_category ON sgp.products(category);
CREATE INDEX idx_sgp_products_active ON sgp.products(active);

CREATE OR REPLACE FUNCTION sgp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON sgp.products
  FOR EACH ROW
  EXECUTE FUNCTION sgp.update_updated_at_column();
