-- Araç Takip Tablosu
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  plate TEXT NOT NULL,           -- Plaka: 34 ABC 123
  driver_name TEXT NOT NULL,     -- Şoför adı
  driver_phone TEXT,             -- Şoför telefonu
  vehicle_type TEXT DEFAULT 'Kamyon', -- Kamyon / TIR / Kamyonet vb
  status TEXT NOT NULL DEFAULT 'Depoda', -- Depoda | Yolda | Teslim Etti | Bakımda
  current_location TEXT,         -- Manuel konum: İstanbul, Ataşehir
  destination TEXT,              -- Gidiyor: İzmir
  cargo_notes TEXT,              -- Yük notu / sevkiyat referansı
  last_updated_by TEXT,          -- Güncelleyen kişi
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_vehicles" ON vehicles
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
