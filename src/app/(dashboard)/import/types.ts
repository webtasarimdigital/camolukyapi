export interface ParsedProductRow {
  product_code: string;
  product_name: string;
  product_group?: string;
  series_name?: string;
  size?: string;
  unit?: string;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
  default_sale_price?: number | null;
  stock_qty?: number | null;
}
