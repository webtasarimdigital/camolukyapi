-- ============================================================
-- 002 - PRODUCTS & PRICE HISTORY
-- ============================================================

CREATE TABLE products (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_code        text NOT NULL,
  product_name        text NOT NULL,
  product_group       text,
  series_name         text,
  size                text,
  unit                text NOT NULL DEFAULT 'M2',
  price_quality_1     numeric(14,2),
  price_quality_2     numeric(14,2),
  price_commercial    numeric(14,2),
  default_sale_price  numeric(14,2),
  cost_price          numeric(14,2),
  stock_qty           numeric(14,3) NOT NULL DEFAULT 0,
  min_stock_qty       numeric(14,3) NOT NULL DEFAULT 0,
  allows_decimal_qty  boolean NOT NULL DEFAULT true,
  brand               text,
  supplier            text,
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  last_import_id      uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  updated_by          uuid REFERENCES auth.users(id),
  deleted_at          timestamptz,

  UNIQUE(company_id, product_code)
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PRODUCT PRICE HISTORY (§56)
-- ============================================================
CREATE TABLE product_price_history (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_quality_1   numeric(14,2),
  price_quality_2   numeric(14,2),
  price_commercial  numeric(14,2),
  source_import_id  uuid,
  effective_at      timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCT IMPORTS
-- ============================================================
CREATE TABLE product_imports (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name      text NOT NULL,
  storage_path   text NOT NULL,
  sheet_name     text,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed')),
  total_rows     integer,
  inserted_rows  integer DEFAULT 0,
  updated_rows   integer DEFAULT 0,
  skipped_rows   integer DEFAULT 0,
  error_rows     integer DEFAULT 0,
  mapping_json   jsonb,
  summary        text,
  created_by     uuid NOT NULL REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE TABLE product_import_errors (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id     uuid NOT NULL REFERENCES product_imports(id) ON DELETE CASCADE,
  row_number    integer,
  product_code  text,
  error_type    text,
  message       text NOT NULL,
  raw_row       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_company_code    ON products(company_id, product_code);
CREATE INDEX idx_products_company_name    ON products(company_id, product_name);
CREATE INDEX idx_products_company_series  ON products(company_id, series_name);
CREATE INDEX idx_products_company_active  ON products(company_id, is_active);
CREATE INDEX idx_price_history_product    ON product_price_history(product_id, effective_at DESC);
CREATE INDEX idx_imports_company          ON product_imports(company_id, created_at DESC);
