// Supabase veritabanı tip tanımları (auto-generate edilene kadar geçici)
// Gerçek tipler: supabase gen types typescript --project-id jlxuvdhwbzaotrdlmwyl

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          tax_office: string | null;
          tax_number: string | null;
          slogan: string | null;
          logo_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["companies"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          phone: string | null;
          role: "admin" | "staff";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          product_code: string;
          product_name: string;
          product_group: string | null;
          series_name: string | null;
          size: string | null;
          unit: string;
          price_quality_1: number | null;
          price_quality_2: number | null;
          price_commercial: number | null;
          default_sale_price: number | null;
          cost_price: number | null;
          stock_qty: number;
          min_stock_qty: number;
          allows_decimal_qty: boolean;
          brand: string | null;
          supplier: string | null;
          notes: string | null;
          is_active: boolean;
          last_import_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          type: "bireysel" | "kurumsal";
          company_name: string | null;
          contact_name: string | null;
          phone: string;
          email: string | null;
          address: string | null;
          tax_office: string | null;
          tax_number: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      quotes: {
        Row: {
          id: string;
          company_id: string;
          quote_code: string;
          customer_id: string | null;
          customer_snapshot: Json | null;
          quote_date: string;
          valid_until: string | null;
          validity_text: string | null;
          sales_rep_id: string | null;
          status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted_to_sale" | "cancelled";
          currency: string;
          vat_rate: number;
          subtotal: number;
          line_discount_total: number;
          general_discount_type: "percent" | "fixed" | null;
          general_discount_value: number | null;
          general_discount_amount: number;
          net_total: number;
          vat_total: number;
          grand_total: number;
          delivery_terms: string | null;
          payment_terms: string | null;
          warranty_terms: string | null;
          return_terms: string | null;
          notes: string | null;
          internal_notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          converted_sale_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["quotes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          sort_order: number;
          product_id: string | null;
          product_code_snapshot: string | null;
          product_name_snapshot: string;
          description_snapshot: string | null;
          unit_snapshot: string;
          price_source: "quality_1" | "quality_2" | "commercial" | "default" | "custom" | null;
          quantity: number;
          unit_price: number;
          discount_type: "percent" | "fixed" | null;
          discount_value: number | null;
          discount_amount: number;
          line_subtotal: number;
          line_total: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quote_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["quote_items"]["Insert"]>;
      };
      sales: {
        Row: {
          id: string;
          company_id: string;
          sale_code: string;
          customer_id: string | null;
          customer_snapshot: Json | null;
          source_quote_id: string | null;
          sale_date: string;
          sales_rep_id: string | null;
          status: "draft" | "completed" | "cancelled";
          currency: string;
          vat_rate: number;
          subtotal: number;
          discount_total: number;
          net_total: number;
          vat_total: number;
          grand_total: number;
          payment_status: "unpaid" | "partial" | "paid";
          paid_amount: number;
          remaining_amount: number;
          due_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["sales"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sales"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          company_id: string;
          sale_id: string;
          customer_id: string | null;
          amount: number;
          payment_date: string;
          payment_method: "nakit" | "havale_eft" | "kredi_karti" | "cek" | "diger";
          reference_no: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      stock_movements: {
        Row: {
          id: string;
          company_id: string;
          product_id: string;
          movement_type: "opening" | "purchase" | "sale" | "sale_cancel" | "return" | "adjustment_in" | "adjustment_out" | "manual_correction";
          quantity: number;
          quantity_before: number;
          quantity_after: number;
          reference_type: string | null;
          reference_id: string | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_movements"]["Row"], "id" | "created_at">;
        Update: never;
      };
      partners: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["partners"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["partners"]["Insert"]>;
      };
      partner_ledger: {
        Row: {
          id: string;
          company_id: string;
          partner_id: string;
          direction: "partner_to_company" | "company_to_partner";
          amount: number;
          transaction_date: string;
          reason: string;
          notes: string | null;
          doc_no: string | null;
          created_by: string | null;
          created_at: string;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["partner_ledger"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["partner_ledger"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
      company_settings: {
        Row: {
          id: string;
          company_id: string;
          default_vat_rate: number;
          default_quote_validity: number;
          quote_note: string | null;
          delivery_terms: string | null;
          payment_terms: string | null;
          warranty_terms: string | null;
          return_terms: string | null;
          general_notes: string | null;
          currency: string;
          timezone: string;
          allow_negative_stock: boolean;
          low_stock_threshold: number;
          price_note: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["company_settings"]["Row"], "id" | "updated_at"> & { company_id: string };
        Update: Partial<Database["public"]["Tables"]["company_settings"]["Insert"]>;
      };
      company_bank_accounts: {
        Row: {
          id: string;
          company_id: string;
          bank_name: string;
          account_name: string;
          iban: string | null;
          account_no: string | null;
          branch: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["company_bank_accounts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["company_bank_accounts"]["Insert"]>;
      };
      product_imports: {
        Row: {
          id: string;
          company_id: string;
          file_name: string;
          storage_path: string;
          sheet_name: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          total_rows: number | null;
          inserted_rows: number;
          updated_rows: number;
          skipped_rows: number;
          error_rows: number;
          mapping_json: Json | null;
          summary: string | null;
          created_by: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["product_imports"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["product_imports"]["Insert"]>;
      };
      financial_transactions: {
        Row: {
          id: string;
          company_id: string;
          transaction_type: "income" | "expense";
          category: string | null;
          amount: number;
          transaction_date: string;
          source_type: "payment" | "manual_income" | "manual_expense" | "reversal";
          source_id: string | null;
          customer_id: string | null;
          description: string | null;
          payment_method: string | null;
          created_by: string | null;
          created_at: string;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["financial_transactions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["financial_transactions"]["Insert"]>;
      };
    };
    Functions: {
      generate_unique_quote_code: { Args: Record<string, never>; Returns: string };
      get_dashboard_summary: { Args: { p_company_id: string }; Returns: Json };
      finalize_sale: { Args: { p_sale_id: string; p_user_id: string }; Returns: Json };
      cancel_sale: { Args: { p_sale_id: string; p_user_id: string; p_reason: string }; Returns: Json };
      convert_quote_to_sale: { Args: { p_quote_id: string; p_user_id: string }; Returns: Json };
      add_stock_movement: {
        Args: {
          p_company_id: string;
          p_product_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_reference_type?: string;
          p_reference_id?: string;
          p_reason?: string;
          p_user_id?: string;
        };
        Returns: Json;
      };
    };
  };
}
