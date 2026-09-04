-- ============================================================
-- 004 - CUSTOMERS (Mini CRM)
-- ============================================================

CREATE TABLE customers (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'bireysel' CHECK (type IN ('bireysel','kurumsal')),
  company_name  text,
  contact_name  text,
  phone         text NOT NULL,
  email         text,
  address       text,
  tax_office    text,
  tax_number    text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_customers_company        ON customers(company_id, is_active);
CREATE INDEX idx_customers_company_name   ON customers(company_id, company_name);
CREATE INDEX idx_customers_contact        ON customers(company_id, contact_name);
