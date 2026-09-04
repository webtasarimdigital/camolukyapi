-- === 001_companies_profiles.sql ===
-- ============================================================
-- 001 - COMPANIES & PROFILES
-- Çamoluk Yapı Operasyon Paneli - Migration 001
-- ============================================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  address      text,
  phone        text,
  email        text,
  website      text,
  tax_office   text,
  tax_number   text,
  slogan       text,
  logo_path    text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
  full_name    text,
  phone        text,
  role         text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANY MEMBERS (kullanıcı-şirket ilişkisi)
-- ============================================================
CREATE TABLE company_members (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active    boolean NOT NULL DEFAULT true,
  invited_at   timestamptz,
  joined_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
CREATE TABLE company_settings (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  default_vat_rate          numeric(5,2) NOT NULL DEFAULT 20,
  default_quote_validity    integer NOT NULL DEFAULT 30, -- gün
  quote_note                text,
  delivery_terms            text,
  payment_terms             text,
  warranty_terms            text,
  return_terms              text,
  general_notes             text,
  currency                  text NOT NULL DEFAULT 'TRY',
  timezone                  text NOT NULL DEFAULT 'Europe/Istanbul',
  allow_negative_stock      boolean NOT NULL DEFAULT false,
  low_stock_threshold       numeric(14,3) NOT NULL DEFAULT 5,
  price_note                text DEFAULT 'Fiyatlara KDV dahil değildir.',
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANY BANK ACCOUNTS
-- ============================================================
CREATE TABLE company_bank_accounts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_name    text NOT NULL,
  account_name text NOT NULL,
  iban         text,
  account_no   text,
  branch       text,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANY PARTNER LOGOS (çözüm ortakları)
-- ============================================================
CREATE TABLE company_partner_logos (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         text,
  logo_path    text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Triggers: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- === 002_products.sql ===
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


-- === 003_stock.sql ===
-- ============================================================
-- 003 - STOCK MOVEMENTS
-- ============================================================

CREATE TABLE stock_movements (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type   text NOT NULL CHECK (movement_type IN (
                    'opening','purchase','sale','sale_cancel',
                    'return','adjustment_in','adjustment_out','manual_correction'
                  )),
  quantity        numeric(14,3) NOT NULL,
  quantity_before numeric(14,3) NOT NULL,
  quantity_after  numeric(14,3) NOT NULL,
  reference_type  text, -- 'sale','purchase','adjustment' vb.
  reference_id    uuid,
  reason          text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_company_product ON stock_movements(company_id, product_id, created_at DESC);
CREATE INDEX idx_stock_movements_reference        ON stock_movements(reference_type, reference_id);


-- === 004_customers.sql ===
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


-- === 005_quotes.sql ===
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


-- === 006_sales.sql ===
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


-- === 007_finance_audit.sql ===
-- ============================================================
-- 007 - FINANCIAL TRANSACTIONS
-- ============================================================

CREATE TABLE financial_transactions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income','expense')),
  category         text,
  amount           numeric(14,2) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type      text NOT NULL CHECK (source_type IN (
                     'payment','manual_income','manual_expense','reversal'
                   )),
  source_id        uuid,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  description      text,
  payment_method   text CHECK (payment_method IN ('nakit','havale_eft','kredi_karti','cek','diger')),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  voided_at        timestamptz,
  void_reason      text
);

CREATE INDEX idx_fin_transactions_company      ON financial_transactions(company_id, transaction_date DESC);
CREATE INDEX idx_fin_transactions_type         ON financial_transactions(company_id, transaction_type);
CREATE INDEX idx_fin_transactions_source       ON financial_transactions(source_type, source_id);

-- ============================================================
-- 008 - PARTNER LEDGER (Ortak Cari — tamamen izole)
-- ============================================================

CREATE TABLE partners (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE partner_ledger (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_id       uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  direction        text NOT NULL CHECK (direction IN ('partner_to_company','company_to_partner')),
  amount           numeric(14,2) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reason           text NOT NULL,
  notes            text,
  doc_no           text,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  voided_at        timestamptz,
  void_reason      text
);

-- NOT: partner_ledger hiçbir trigger ile financial_transactions veya başka tabloya yazılmayacak.

CREATE INDEX idx_partner_ledger ON partner_ledger(company_id, partner_id, transaction_date DESC);

-- ============================================================
-- 009 - AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid REFERENCES companies(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  before_data jsonb,
  after_data  jsonb,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Audit log kullanıcı tarafından silinemez/değiştirilemez (RLS ile sağlanacak)
CREATE INDEX idx_audit_company    ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user       ON audit_logs(user_id, created_at DESC);


-- === 008_rls_policies.sql ===
-- ============================================================
-- 008 - RLS POLICIES
-- ============================================================

-- Helper: kullanıcının company_id'sini döndür
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: kullanıcının rolünü döndür
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: admin mi?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS ENABLE
-- ============================================================
ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_bank_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_partner_logos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_import_errors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Kendi profilini görebilir" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Kendi profilini güncelleyebilir" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin tüm profilleri görebilir" ON profiles
  FOR SELECT USING (
    company_id = get_user_company_id() AND is_admin()
  );

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE POLICY "Üye kendi şirketini görebilir" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "Admin şirket bilgisi güncelleyebilir" ON companies
  FOR UPDATE USING (id = get_user_company_id() AND is_admin());

-- ============================================================
-- COMPANY SETTINGS & BANK & LOGOS
-- ============================================================
CREATE POLICY "Şirket ayarları okunabilir" ON company_settings
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin ayar güncelleyebilir" ON company_settings
  FOR ALL USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Banka hesapları okunabilir" ON company_bank_accounts
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin banka hesabı yönetebilir" ON company_bank_accounts
  FOR ALL USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Partner logolar okunabilir" ON company_partner_logos
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin logo yönetebilir" ON company_partner_logos
  FOR ALL USING (company_id = get_user_company_id() AND is_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "Ürünler okunabilir" ON products
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin ürün ekleyebilir" ON products
  FOR INSERT WITH CHECK (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin ürün güncelleyebilir" ON products
  FOR UPDATE USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Fiyat geçmişi okunabilir" ON product_price_history
  FOR SELECT USING (company_id = get_user_company_id());

-- ============================================================
-- IMPORTS (admin only)
-- ============================================================
CREATE POLICY "Admin import görebilir" ON product_imports
  FOR SELECT USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin import yapabilir" ON product_imports
  FOR INSERT WITH CHECK (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin import güncelleyebilir" ON product_imports
  FOR UPDATE USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Import hataları admin görebilir" ON product_import_errors
  FOR SELECT USING (
    import_id IN (SELECT id FROM product_imports WHERE company_id = get_user_company_id())
    AND is_admin()
  );

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE POLICY "Stok hareketleri okunabilir" ON stock_movements
  FOR SELECT USING (company_id = get_user_company_id());

-- Insert yalnız RPC fonksiyonları üzerinden (SECURITY DEFINER)

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE POLICY "Müşteriler okunabilir" ON customers
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Müşteri ekleyebilir" ON customers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Müşteri güncelleyebilir" ON customers
  FOR UPDATE USING (company_id = get_user_company_id());

-- ============================================================
-- QUOTES
-- ============================================================
CREATE POLICY "Teklifler okunabilir" ON quotes
  FOR SELECT USING (company_id = get_user_company_id() AND deleted_at IS NULL);

CREATE POLICY "Teklif ekleyebilir" ON quotes
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Teklif güncelleyebilir" ON quotes
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Quote items okunabilir" ON quote_items
  FOR SELECT USING (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Quote items eklenebilir" ON quote_items
  FOR INSERT WITH CHECK (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Quote items güncellenebilir" ON quote_items
  FOR UPDATE USING (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Quote items silinebilir" ON quote_items
  FOR DELETE USING (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Quote status history okunabilir" ON quote_status_history
  FOR SELECT USING (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Quote status history eklenebilir" ON quote_status_history
  FOR INSERT WITH CHECK (
    quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- SALES
-- ============================================================
CREATE POLICY "Satışlar okunabilir" ON sales
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Satış ekleyebilir" ON sales
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Satış güncelleyebilir" ON sales
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Sale items okunabilir" ON sale_items
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Sale items eklenebilir" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "Ödemeler okunabilir" ON payments
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Ödeme ekleyebilir" ON payments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Admin ödeme güncelleyebilir" ON payments
  FOR UPDATE USING (company_id = get_user_company_id() AND is_admin());

-- ============================================================
-- FINANCIAL TRANSACTIONS
-- ============================================================
CREATE POLICY "Finans hareketleri okunabilir" ON financial_transactions
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Finans hareketi eklenebilir" ON financial_transactions
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Admin finans güncelleyebilir" ON financial_transactions
  FOR UPDATE USING (company_id = get_user_company_id() AND is_admin());

-- ============================================================
-- PARTNER LEDGER (admin only — izole)
-- ============================================================
CREATE POLICY "Admin ortakları görebilir" ON partners
  FOR SELECT USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin ortak ekleyebilir" ON partners
  FOR ALL USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin ortak cari görebilir" ON partner_ledger
  FOR SELECT USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin ortak cari ekleyebilir" ON partner_ledger
  FOR INSERT WITH CHECK (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Admin ortak cari güncelleyebilir" ON partner_ledger
  FOR UPDATE USING (company_id = get_user_company_id() AND is_admin());

-- ============================================================
-- AUDIT LOGS (read-only for users, no delete/update)
-- ============================================================
CREATE POLICY "Audit log okunabilir" ON audit_logs
  FOR SELECT USING (company_id = get_user_company_id());

-- Audit loglar yalnız server-side (service role) tarafından yazılır


-- === 009_rpc_functions.sql ===
-- ============================================================
-- 009 - CRITICAL RPC FUNCTIONS
-- Stok transaction, satış tamamlama, audit log helper
-- ============================================================

-- ============================================================
-- AUDIT LOG HELPER (service role üzerinden çağrılır)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit(
  p_company_id  uuid,
  p_user_id     uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_before      jsonb DEFAULT NULL,
  p_after       jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, before_data, after_data, metadata)
  VALUES (p_company_id, p_user_id, p_action, p_entity_type, p_entity_id, p_before, p_after, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STOCK MOVEMENT (race condition korumalı)
-- ============================================================
CREATE OR REPLACE FUNCTION add_stock_movement(
  p_company_id    uuid,
  p_product_id    uuid,
  p_movement_type text,
  p_quantity      numeric,
  p_reference_type text DEFAULT NULL,
  p_reference_id  uuid DEFAULT NULL,
  p_reason        text DEFAULT NULL,
  p_user_id       uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_before  numeric;
  v_after   numeric;
BEGIN
  -- Row lock ile race condition engelle
  SELECT stock_qty INTO v_before
  FROM products
  WHERE id = p_product_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı';
  END IF;

  v_after := v_before + p_quantity;

  -- Negatif stok kontrolü (adjustment_in ve opening hariç)
  IF v_after < 0 AND p_movement_type NOT IN ('manual_correction') THEN
    -- Şirket ayarına bak
    IF NOT (SELECT allow_negative_stock FROM company_settings WHERE company_id = p_company_id) THEN
      RAISE EXCEPTION 'Yetersiz stok. Mevcut stok: % %',
        v_before,
        (SELECT unit FROM products WHERE id = p_product_id);
    END IF;
  END IF;

  -- Stok güncelle
  UPDATE products SET stock_qty = v_after WHERE id = p_product_id;

  -- Hareket kaydı
  INSERT INTO stock_movements (
    company_id, product_id, movement_type,
    quantity, quantity_before, quantity_after,
    reference_type, reference_id, reason, created_by
  ) VALUES (
    p_company_id, p_product_id, p_movement_type,
    p_quantity, v_before, v_after,
    p_reference_type, p_reference_id, p_reason, p_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'before', v_before,
    'after', v_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FINALIZE SALE (atomik: stok düş + finans + audit)
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_sale(
  p_sale_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_sale      sales%ROWTYPE;
  v_item      sale_items%ROWTYPE;
  v_company   uuid;
  v_result    jsonb;
BEGIN
  -- Satışı kilitle ve doğrula
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Satış bulunamadı';
  END IF;

  IF v_sale.status != 'draft' THEN
    RAISE EXCEPTION 'Bu satış zaten tamamlanmış veya iptal edilmiş. Durum: %', v_sale.status;
  END IF;

  v_company := v_sale.company_id;

  -- Her satır için stok düş
  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      PERFORM add_stock_movement(
        v_company,
        v_item.product_id,
        'sale',
        -v_item.quantity,
        'sale',
        p_sale_id,
        'Satış: ' || v_sale.sale_code,
        p_user_id
      );
    END IF;
  END LOOP;

  -- Satış tamamla
  UPDATE sales SET
    status = 'completed',
    completed_at = now()
  WHERE id = p_sale_id;

  -- Finans hareketi oluştur (paid_amount > 0 ise)
  IF v_sale.paid_amount > 0 THEN
    INSERT INTO financial_transactions (
      company_id, transaction_type, category, amount, transaction_date,
      source_type, source_id, customer_id, description, payment_method, created_by
    ) VALUES (
      v_company, 'income', 'satis_tahsilat', v_sale.paid_amount, CURRENT_DATE,
      'payment', p_sale_id, v_sale.customer_id,
      'Satış tahsilatı: ' || v_sale.sale_code, NULL, p_user_id
    );
  END IF;

  -- Audit log
  PERFORM log_audit(
    v_company, p_user_id, 'sale_completed', 'sales', p_sale_id,
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'completed'),
    NULL
  );

  RETURN jsonb_build_object('success', true, 'sale_code', v_sale.sale_code);

EXCEPTION WHEN OTHERS THEN
  RAISE; -- Rollback otomatik olur
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CANCEL SALE (ters stok hareketi)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id     uuid,
  p_user_id     uuid,
  p_reason      text
)
RETURNS jsonb AS $$
DECLARE
  v_sale  sales%ROWTYPE;
  v_item  sale_items%ROWTYPE;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Satış bulunamadı'; END IF;
  IF v_sale.status = 'cancelled' THEN RAISE EXCEPTION 'Satış zaten iptal edilmiş'; END IF;

  -- Tamamlanmış satış için stokları geri ver
  IF v_sale.status = 'completed' THEN
    FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id LOOP
      IF v_item.product_id IS NOT NULL THEN
        PERFORM add_stock_movement(
          v_sale.company_id, v_item.product_id, 'sale_cancel',
          v_item.quantity, 'sale', p_sale_id,
          'Satış iptali: ' || v_sale.sale_code, p_user_id
        );
      END IF;
    END LOOP;
  END IF;

  -- Satışı iptal et
  UPDATE sales SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = p_reason
  WHERE id = p_sale_id;

  -- Audit log
  PERFORM log_audit(
    v_sale.company_id, p_user_id, 'sale_cancelled', 'sales', p_sale_id,
    jsonb_build_object('status', v_sale.status),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason),
    NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CONVERT QUOTE TO SALE
-- ============================================================
CREATE OR REPLACE FUNCTION convert_quote_to_sale(
  p_quote_id uuid,
  p_user_id  uuid
)
RETURNS jsonb AS $$
DECLARE
  v_quote      quotes%ROWTYPE;
  v_sale_id    uuid;
  v_sale_code  text;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Teklif bulunamadı'; END IF;
  IF v_quote.converted_sale_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bu teklif daha önce satışa dönüştürülmüş';
  END IF;
  IF v_quote.status NOT IN ('accepted', 'sent', 'draft') THEN
    RAISE EXCEPTION 'Bu statüdeki teklif satışa dönüştürülemez: %', v_quote.status;
  END IF;

  -- Satış kodu üret
  v_sale_code := generate_sale_code();
  v_sale_id   := uuid_generate_v4();

  -- Satış oluştur
  INSERT INTO sales (
    id, company_id, sale_code, customer_id, customer_snapshot,
    source_quote_id, sale_date, sales_rep_id, status, currency,
    vat_rate, subtotal, discount_total, net_total, vat_total, grand_total,
    payment_status, paid_amount, remaining_amount, created_by
  ) VALUES (
    v_sale_id, v_quote.company_id, v_sale_code,
    v_quote.customer_id, v_quote.customer_snapshot,
    p_quote_id, CURRENT_DATE, v_quote.sales_rep_id,
    'draft', v_quote.currency, v_quote.vat_rate,
    v_quote.subtotal, v_quote.line_discount_total,
    v_quote.net_total, v_quote.vat_total, v_quote.grand_total,
    'unpaid', 0, v_quote.grand_total, p_user_id
  );

  -- Satış kalemleri kopyala (snapshot korunur)
  INSERT INTO sale_items (
    sale_id, sort_order, product_id,
    product_code_snapshot, product_name_snapshot, description_snapshot, unit_snapshot,
    quantity, unit_price, discount_type, discount_value, discount_amount, line_total
  )
  SELECT
    v_sale_id, sort_order, product_id,
    product_code_snapshot, product_name_snapshot, description_snapshot, unit_snapshot,
    quantity, unit_price, discount_type, discount_value, discount_amount, line_total
  FROM quote_items WHERE quote_id = p_quote_id;

  -- Teklif güncelle
  UPDATE quotes SET
    status = 'converted_to_sale',
    converted_sale_id = v_sale_id
  WHERE id = p_quote_id;

  PERFORM log_audit(
    v_quote.company_id, p_user_id, 'quote_converted', 'quotes', p_quote_id,
    NULL, jsonb_build_object('sale_id', v_sale_id, 'sale_code', v_sale_code), NULL
  );

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'sale_code', v_sale_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DASHBOARD SUMMARY RPC (tek sorguda tüm KPI'lar)
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_company_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'today_revenue',    COALESCE((SELECT SUM(grand_total) FROM sales WHERE company_id = p_company_id AND status = 'completed' AND sale_date = CURRENT_DATE), 0),
    'month_revenue',    COALESCE((SELECT SUM(grand_total) FROM sales WHERE company_id = p_company_id AND status = 'completed' AND DATE_TRUNC('month', sale_date) = DATE_TRUNC('month', CURRENT_DATE)), 0),
    'year_revenue',     COALESCE((SELECT SUM(grand_total) FROM sales WHERE company_id = p_company_id AND status = 'completed' AND DATE_TRUNC('year', sale_date) = DATE_TRUNC('year', CURRENT_DATE)), 0),
    'today_sales_count',(SELECT COUNT(*) FROM sales WHERE company_id = p_company_id AND status = 'completed' AND sale_date = CURRENT_DATE),
    'pending_quotes',   (SELECT COUNT(*) FROM quotes WHERE company_id = p_company_id AND status IN ('draft','sent') AND deleted_at IS NULL),
    'today_collection', COALESCE((SELECT SUM(amount) FROM payments WHERE company_id = p_company_id AND payment_date = CURRENT_DATE AND voided_at IS NULL), 0),
    'pending_receivable',COALESCE((SELECT SUM(remaining_amount) FROM sales WHERE company_id = p_company_id AND status = 'completed' AND payment_status != 'paid'), 0),
    'critical_stock',   (SELECT COUNT(*) FROM products p JOIN company_settings cs ON cs.company_id = p.company_id WHERE p.company_id = p_company_id AND p.is_active = true AND p.stock_qty <= p.min_stock_qty AND p.min_stock_qty > 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- === 010_seed.sql ===
-- ============================================================
-- 010 - SEED DATA (initial setup)
-- ============================================================

-- Çamoluk Yapı şirketi
INSERT INTO companies (id, name, slug, address, phone, email, website, slogan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Çamoluk Yapı',
  'camolukyapi',
  'Türkiye',
  '',
  '',
  '',
  'Kalite ve Güven'
) ON CONFLICT (slug) DO NOTHING;

-- Şirket ayarları
INSERT INTO company_settings (company_id, default_vat_rate, default_quote_validity, price_note)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  20,
  30,
  'Fiyatlara KDV dahil değildir.'
) ON CONFLICT (company_id) DO NOTHING;


