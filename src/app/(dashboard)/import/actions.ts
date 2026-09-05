'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
}

export async function saveExcelProducts(payload: {
  fileName: string;
  sheetName: string;
  products: ParsedProductRow[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Şirket profili bulunamadı.");

  const companyId = profile.company_id;

  // 1. Import kaydı aç
  const { data: importRecord, error: importErr } = await supabase
    .from("product_imports")
    .insert({
      company_id: companyId,
      file_name: payload.fileName,
      storage_path: "excel/" + payload.fileName,
      sheet_name: payload.sheetName,
      status: "processing",
      total_rows: payload.products.length,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (importErr) throw new Error(importErr.message);
  const importId = (importRecord as { id: string })?.id;

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // 2. Ürünleri batch halinde upsert et
  for (const item of payload.products) {
    if (!item.product_code || !item.product_name) {
      errors++;
      continue;
    }

    // Mevcut ürün var mı?
    const { data: existingData } = await supabase
      .from("products")
      .select("id, price_quality_1, price_quality_2, price_commercial")
      .eq("company_id", companyId)
      .eq("product_code", item.product_code.trim())
      .single();

    const existing = existingData as {
      id: string;
      price_quality_1: number | null;
      price_quality_2: number | null;
      price_commercial: number | null;
    } | null;

    if (existing) {
      // Güncelle
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          product_name: item.product_name.trim(),
          product_group: item.product_group?.trim() || null,
          series_name: item.series_name?.trim() || null,
          size: item.size?.trim() || null,
          unit: item.unit?.trim() || "M2",
          price_quality_1: item.price_quality_1 ?? existing.price_quality_1,
          price_quality_2: item.price_quality_2 ?? existing.price_quality_2,
          price_commercial: item.price_commercial ?? existing.price_commercial,
          default_sale_price: item.default_sale_price ?? item.price_quality_1,
          last_import_id: importId,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        } as never)
        .eq("id", existing.id);

      if (updateErr) {
        errors++;
      } else {
        updated++;
        // Fiyat değiştiyse fiyat geçmişi yaz
        if (
          item.price_quality_1 !== existing.price_quality_1 ||
          item.price_quality_2 !== existing.price_quality_2 ||
          item.price_commercial !== existing.price_commercial
        ) {
          await supabase.from("product_price_history").insert({
            company_id: companyId,
            product_id: existing.id,
            price_quality_1: item.price_quality_1,
            price_quality_2: item.price_quality_2,
            price_commercial: item.price_commercial,
            source_import_id: importId,
            created_by: user.id,
          } as never);
        }
      }
    } else {
      // Yeni Ekle
      const { error: insertErr } = await supabase.from("products").insert({
        company_id: companyId,
        product_code: item.product_code.trim(),
        product_name: item.product_name.trim(),
        product_group: item.product_group?.trim() || null,
        series_name: item.series_name?.trim() || null,
        size: item.size?.trim() || null,
        unit: item.unit?.trim() || "M2",
        price_quality_1: item.price_quality_1 ?? null,
        price_quality_2: item.price_quality_2 ?? null,
        price_commercial: item.price_commercial ?? null,
        default_sale_price: item.default_sale_price ?? item.price_quality_1 ?? 0,
        stock_qty: 0,
        min_stock_qty: 0,
        allows_decimal_qty: true,
        last_import_id: importId,
        created_by: user.id,
      } as never);

      if (insertErr) {
        errors++;
      } else {
        inserted++;
      }
    }
  }

  // 3. Import durumunu güncelle
  await supabase
    .from("product_imports")
    .update({
      status: "completed",
      inserted_rows: inserted,
      updated_rows: updated,
      error_rows: errors,
      completed_at: new Date().toISOString(),
      summary: `Toplam: ${payload.products.length}, Yeni: ${inserted}, Güncellenen: ${updated}, Hatalı: ${errors}`,
    } as never)
    .eq("id", importId);

  revalidatePath("/import");
  revalidatePath("/urunler");

  return { success: true, inserted, updated, errors };
}

export async function savePdfDocument(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Şirket profili bulunamadı.");

  const title = formData.get("title") as string;
  const category = (formData.get("category") as string) || "Fiyat Listesi";
  const notes = (formData.get("notes") as string) || "";
  const file = formData.get("file") as File | null;

  if (!title) throw new Error("Belge başlığı gereklidir.");

  const fileName = file?.name || `${title}.pdf`;
  const storagePath = `pdf/${Date.now()}_${fileName}`;

  // product_imports tablosunda belge kaydı oluştur
  const { data: importRecord, error } = await supabase
    .from("product_imports")
    .insert({
      company_id: profile.company_id,
      file_name: `[PDF - ${category}] ${title} (${fileName})`,
      storage_path: storagePath,
      sheet_name: "PDF_KATALOG",
      status: "completed",
      total_rows: 1,
      inserted_rows: 1,
      updated_rows: 0,
      error_rows: 0,
      summary: `PDF Belgesi: ${category}. Notlar: ${notes}`,
      created_by: user.id,
      completed_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/import");
  return { success: true, id: (importRecord as { id: string })?.id };
}

/**
 * Ham PDF binary verisinden metin çıkaran yedek fonksiyon (stream decoder)
 */
function extractRawPdfFallback(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    let result = "";
    // Tj ve TJ operatörlerini tara
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      result += match[1] + "\n";
    }
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(raw)) !== null) {
      const inner = match[1];
      const parts = inner.match(/\(([^)]+)\)/g);
      if (parts) {
        result += parts.map((p) => p.slice(1, -1)).join("") + "\n";
      }
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * PDF Dosyasından Metin ve Tablo Ayrıştırma
 * PDFParse v2 motoru + akıllı regex + mevcut ürünlerle çapraz eşleme
 */
export async function extractProductsFromPdf(formData: FormData): Promise<{
  success: boolean;
  fileName: string;
  products: ParsedProductRow[];
  matchedWithExisting?: number;
  totalExtracted?: number;
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return {
      success: false,
      fileName: "",
      products: [],
      error: "Lütfen bir PDF dosyası seçin.",
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Kullanıcı ve şirket bilgilerini al
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let existingProducts: Array<{
      id: string;
      product_code: string;
      product_name: string;
      size?: string | null;
      unit?: string | null;
      price_quality_1?: number | null;
      price_quality_2?: number | null;
      price_commercial?: number | null;
    }> = [];

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      const profile = profileData as { company_id: string } | null;
      if (profile?.company_id) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, product_code, product_name, size, unit, price_quality_1, price_quality_2, price_commercial")
          .eq("company_id", profile.company_id)
          .eq("is_active", true);

        if (prods) {
          existingProducts = prods as typeof existingProducts;
        }
      }
    }

    // 2. Metin çıkarma: pdf-parse v2 veya fallback
    let text = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfModule = require("pdf-parse");
      const PDFParseClass = pdfModule.PDFParse || pdfModule;
      if (typeof PDFParseClass === "function" && PDFParseClass.prototype?.getText) {
        const parser = new PDFParseClass({ data: new Uint8Array(buffer), verbosity: 0 });
        const res = await parser.getText();
        text = (res?.text || "") as string;
        try {
          await parser.destroy();
        } catch {
          // ignore destroy errors
        }
      } else if (typeof pdfModule === "function") {
        const res = await pdfModule(buffer);
        text = (res?.text || "") as string;
      }
    } catch (e: unknown) {
      console.warn("pdf-parse standard engine failed, trying fallback:", (e as Error)?.message);
    }

    // Fallback: ham binary stream decoder
    if (!text || text.trim().length === 0) {
      text = extractRawPdfFallback(buffer);
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        fileName: file.name,
        products: [],
        error:
          "PDF metni okunamadı. Dosya sadece taranmış resim/fotoğraf içeriyor olabilir. Belgeyi arşivlemek için 'Sadece Belge Olarak Arşivle' butonunu kullanabilirsiniz.",
      };
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    const productsMap = new Map<string, ParsedProductRow>();
    let matchedWithExisting = 0;

    // 3. Öncelikli Aşama: Sistemimizde mevcut olan ürünleri PDF içinde tara ve eşleştir
    // "tüm pdf ler aynı formatta gelmeyebiliyor ama ortak bizde olanları alıp işlemeye çalış her zaman"
    if (existingProducts.length > 0) {
      for (const ep of existingProducts) {
        const cleanCode = ep.product_code.trim();
        if (!cleanCode) continue;

        // PDF içinde bu ürün kodu geçiyor mu?
        const foundLineIdx = lines.findIndex((l) =>
          new RegExp(`\\b${cleanCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(l)
        );

        if (foundLineIdx !== -1) {
          // İlgili satır ve sonraki 2 satırdaki fiyatları tara
          const contextLines = lines.slice(foundLineIdx, foundLineIdx + 3).join(" ");
          const priceMatches = contextLines.match(/\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\b/g);

          let p1: number | null = ep.price_quality_1 ?? null;
          let p2: number | null = ep.price_quality_2 ?? null;
          let pC: number | null = ep.price_commercial ?? null;

          if (priceMatches && priceMatches.length > 0) {
            const parsedPrices = priceMatches
              .map((p) => {
                const cleaned = p.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
                const n = parseFloat(cleaned);
                return isNaN(n) ? null : n;
              })
              .filter((n): n is number => n !== null && n > 0);

            if (parsedPrices.length > 0) {
              p1 = parsedPrices[0];
              if (parsedPrices.length > 1) p2 = parsedPrices[1];
              if (parsedPrices.length > 2) pC = parsedPrices[2];
            }
          }

          productsMap.set(cleanCode.toUpperCase(), {
            product_code: cleanCode,
            product_name: ep.product_name,
            size: ep.size || undefined,
            unit: ep.unit || "M2",
            price_quality_1: p1,
            price_quality_2: p2,
            price_commercial: pC,
            default_sale_price: p1,
          });

          matchedWithExisting++;
        }
      }
    }

    // 4. Genel Regex Ayrıştırma: Kalan satırlardan yeni ürün ve fiyatları tespit et
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fiyat adayı bul (örn: 1.250,00 veya 850,50 veya 450,00 TL)
      const priceMatches = line.match(/\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\b/g);
      if (!priceMatches || priceMatches.length === 0) continue;

      // Fiyatları ayrıştır
      const prices = priceMatches
        .map((p) => {
          const cleaned = p.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
          const n = parseFloat(cleaned);
          return isNaN(n) ? null : n;
        })
        .filter((n): n is number => n !== null && n > 0);

      if (prices.length === 0) continue;

      let textPart = line;
      for (const pm of priceMatches) {
        textPart = textPart.replace(pm, " ");
      }
      textPart = textPart.replace(/\b(TL|₺|TRY|KDV|DAHİL|HARİÇ|FİYAT|LİSTE)\b/gi, " ").trim();

      // Ebat tespit et (örn: 60x120, 60*120, 120x240)
      const sizeMatch = textPart.match(/\b\d{2,4}\s*[\*xX]\s*\d{2,4}\b/);
      const size = sizeMatch ? sizeMatch[0].replace(/\s+/g, "").toLowerCase() : undefined;
      if (sizeMatch) {
        textPart = textPart.replace(sizeMatch[0], " ");
      }

      // Birim tespit et
      const unitMatch = textPart.match(/\b(M2|M²|ADT|ADET|PK|PAKET|MT|METRE|KG|SET|KUTU)\b/i);
      const unit = unitMatch ? unitMatch[0].toUpperCase().replace("M²", "M2") : "M2";
      if (unitMatch) {
        textPart = textPart.replace(unitMatch[0], " ");
      }

      const tokens = textPart.split(/\s+/).filter(Boolean);
      if (tokens.length < 1) continue;

      // Ürün kodunu tespit et (rakam içeren veya en az 4 karakterli belirteç)
      let code = "";
      let name = "";
      const codeIdx = tokens.findIndex((t) => (/\d/.test(t) && t.length >= 3) || /^[A-Z0-9_-]{4,15}$/i.test(t));

      if (codeIdx !== -1) {
        code = tokens[codeIdx];
        tokens.splice(codeIdx, 1);
        name = tokens.join(" ");
      } else if (tokens.length >= 2) {
        code = tokens[0];
        name = tokens.slice(1).join(" ");
      } else {
        continue;
      }

      // Eğer isim çok kısaysa bir önceki satıra bak (bazı PDF'lerde isim üst satırdadır)
      if (name.length < 3 && i > 0) {
        const prevLine = lines[i - 1];
        if (!/\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?/.test(prevLine) && prevLine.length > 3) {
          name = prevLine + (name ? ` ${name}` : "");
        }
      }

      code = code.trim();
      name = name.trim();
      if (!code || !name || code.length < 3) continue;

      const upperKey = code.toUpperCase();
      if (!productsMap.has(upperKey)) {
        productsMap.set(upperKey, {
          product_code: code,
          product_name: name,
          size,
          unit,
          price_quality_1: prices[0] ?? null,
          price_quality_2: prices[1] ?? null,
          price_commercial: prices[2] ?? null,
          default_sale_price: prices[0] ?? null,
        });
      }
    }

    const products = Array.from(productsMap.values());

    return {
      success: true,
      fileName: file.name,
      products,
      matchedWithExisting,
      totalExtracted: products.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PDF ayrıştırılırken beklenmeyen bir hata oluştu";
    console.error("extractProductsFromPdf error:", err);
    return {
      success: false,
      fileName: file?.name || "",
      products: [],
      error: msg,
    };
  }
}
