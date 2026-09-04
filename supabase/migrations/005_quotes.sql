-- ============================================================
-- 005 - QUOTES & QUOTE ITEMS
-- ============================================================

-- Quote code üretici RPC (10 karakter, okunabilir, unique)
CREATE OR REPLACE FUNCTION generate_quote_code()
RETURNS text AS $$
DECLARE
  charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code    text := '';
  i       integer;
BEGIN
  FOR i IN 1..10 LOOP
    code := code || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Unique quote code üret (retry ile)
CREATE OR REPLACE FUNCTION generate_unique_quote_code()
RETURNS text AS $$
DECLARE
  code text;
  attempts integer := 0;
BEGIN
  LOOP
    code := generate_quote_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM quotes WHERE quote_code = code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique quote code after 100 attempts';
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE quotes (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_code              char(10) NOT NULL,
  customer_id             uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_snapshot       jsonb,
  quote_date              date NOT NULL DEFAULT CURRENT_DATE,
  valid_until             date,
  validity_text           text,
  sales_rep_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'draft' CHECK (status IN (
                            'draft','sent','accepted','rejected','expired','converted_to_sale','cancelled'
                          )),
  currency                text NOT NULL DEFAULT 'TRY',
  vat_rate                numeric(5,2) NOT NULL DEFAULT 20,
  subtotal                numeric(14,2) NOT NULL DEFAULT 0,
  line_discount_total     numeric(14,2) NOT NULL DEFAULT 0,
  general_discount_type   text CHECK (general_discount_type IN ('percent','fixed')),
  general_discount_value  numeric(14,2),
  general_discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_total               numeric(14,2) NOT NULL DEFAULT 0,
  vat_total               numeric(14,2) NOT NULL DEFAULT 0,
  grand_total             numeric(14,2) NOT NULL DEFAULT 0,
  delivery_terms          text,
  payment_terms           text,
  warranty_terms          text,
  return_terms            text,
  notes                   text,
  internal_notes          text,
  created_by              uuid REFERENCES auth.users(id),
  updated_by              uuid REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz,
  converted_sale_id       uuid,

  UNIQUE(company_id, quote_code)
);

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE quote_items (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id                uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order              integer NOT NULL DEFAULT 0,
  product_id              uuid REFERENCES products(id) ON DELETE SET NULL,
  product_code_snapshot   text,
  product_name_snapshot   text NOT NULL,
  description_snapshot    text,
  unit_snapshot           text NOT NULL,
  price_source            text CHECK (price_source IN ('quality_1','quality_2','commercial','default','custom')),
  quantity                numeric(14,3) NOT NULL,
  unit_price              numeric(14,2) NOT NULL,
  discount_type           text CHECK (discount_type IN ('percent','fixed')),
  discount_value          numeric(14,2),
  discount_amount         numeric(14,2) NOT NULL DEFAULT 0,
  line_subtotal           numeric(14,2) NOT NULL,
  line_total              numeric(14,2) NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quote_status_history (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id    uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  changed_by  uuid REFERENCES auth.users(id),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_quotes_company_code     ON quotes(company_id, quote_code);
CREATE INDEX idx_quotes_company_date     ON quotes(company_id, quote_date DESC);
CREATE INDEX idx_quotes_company_customer ON quotes(company_id, customer_id);
CREATE INDEX idx_quotes_company_status   ON quotes(company_id, status);
CREATE INDEX idx_quote_items_quote       ON quote_items(quote_id, sort_order);
