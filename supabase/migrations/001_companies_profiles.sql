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
