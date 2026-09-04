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
