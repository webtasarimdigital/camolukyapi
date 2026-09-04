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
