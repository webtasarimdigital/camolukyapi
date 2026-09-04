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
