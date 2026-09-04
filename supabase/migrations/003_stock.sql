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
