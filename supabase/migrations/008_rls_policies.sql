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
