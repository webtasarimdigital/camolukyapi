-- ============================================================
-- 006 - SALES, SALE ITEMS, PAYMENTS
-- ============================================================

-- Sale code üretici
CREATE OR REPLACE FUNCTION generate_sale_code()
RETURNS text AS $$
DECLARE
  today_str text := to_char(CURRENT_DATE, 'YYYYMMDD');
  seq       bigint;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM sales WHERE DATE(created_at) = CURRENT_DATE;
  RETURN 'SAT-' || today_str || '-' || lpad(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE sales (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_code         text NOT NULL,
  customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_snapshot jsonb,
  source_quote_id   uuid REFERENCES quotes(id) ON DELETE SET NULL,
  sale_date         date NOT NULL DEFAULT CURRENT_DATE,
  sales_rep_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN (
                      'draft','completed','cancelled'
                    )),
  currency          text NOT NULL DEFAULT 'TRY',
  vat_rate          numeric(5,2) NOT NULL DEFAULT 20,
  subtotal          numeric(14,2) NOT NULL DEFAULT 0,
  discount_total    numeric(14,2) NOT NULL DEFAULT 0,
  net_total         numeric(14,2) NOT NULL DEFAULT 0,
  vat_total         numeric(14,2) NOT NULL DEFAULT 0,
  grand_total       numeric(14,2) NOT NULL DEFAULT 0,
  payment_status    text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  paid_amount       numeric(14,2) NOT NULL DEFAULT 0,
  remaining_amount  numeric(14,2) NOT NULL DEFAULT 0,
  due_date          date,
  notes             text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,

  UNIQUE(company_id, sale_code)
);

CREATE TABLE sale_items (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id                 uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sort_order              integer NOT NULL DEFAULT 0,
  product_id              uuid REFERENCES products(id) ON DELETE SET NULL,
  product_code_snapshot   text,
  product_name_snapshot   text NOT NULL,
  description_snapshot    text,
  unit_snapshot           text NOT NULL,
  quantity                numeric(14,3) NOT NULL,
  unit_price              numeric(14,2) NOT NULL,
  discount_type           text CHECK (discount_type IN ('percent','fixed')),
  discount_value          numeric(14,2),
  discount_amount         numeric(14,2) NOT NULL DEFAULT 0,
  line_total              numeric(14,2) NOT NULL,
  unit_cost_snapshot      numeric(14,2),
  line_cost_total         numeric(14,2),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  amount          numeric(14,2) NOT NULL,
  payment_date    date NOT NULL DEFAULT CURRENT_DATE,
  payment_method  text NOT NULL CHECK (payment_method IN ('nakit','havale_eft','kredi_karti','cek','diger')),
  reference_no    text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  voided_at       timestamptz,
  void_reason     text
);

-- INDEXES
CREATE INDEX idx_sales_company_code     ON sales(company_id, sale_code);
CREATE INDEX idx_sales_company_date     ON sales(company_id, sale_date DESC);
CREATE INDEX idx_sales_company_customer ON sales(company_id, customer_id);
CREATE INDEX idx_sales_company_status   ON sales(company_id, status);
CREATE INDEX idx_sale_items_sale        ON sale_items(sale_id, sort_order);
CREATE INDEX idx_payments_sale          ON payments(company_id, sale_id);
CREATE INDEX idx_payments_date          ON payments(company_id, payment_date DESC);
