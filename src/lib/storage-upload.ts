/**
 * Supabase Storage client-side upload helper
 * Tarayıcıdan direkt olarak Supabase Storage'a yükler ve public URL döndürür.
 * @supabase/supabase-js client kullanır — compact key formatını otomatik çözer.
 */

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createClient as createJsSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type UploadBucket = "shipment-photos" | "transporter-docs" | "quote-pdfs";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Dosyayı Supabase Storage'a yükler.
 * @param bucket  - Bucket adı
 * @param file    - Yüklenecek File nesnesi
 * @param folder  - Opsiyonel klasör (örn: "2026-10")
 * @param maxMB   - Max boyut sınırı (MB), default 50
 */
export async function uploadToStorage(
  bucket: UploadBucket,
  file: File,
  folder: string = "",
  maxMB: number = 50
): Promise<UploadResult> {
  // Boyut kontrolü
  if (file.size > maxMB * 1024 * 1024) {
    return {
      success: false,
      error: `Dosya boyutu ${maxMB}MB sınırını aşıyor (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
    };
  }

  // Benzersiz dosya adı oluştur
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
  const path = folder
    ? `${folder}/${timestamp}_${safeName}`
    : `${timestamp}_${safeName}`;

  try {
    let supabase: any;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      supabase = createJsSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Bilinmeyen yükleme hatası." };
  }
}

/**
 * Birden fazla dosyayı aynı bucket'a paralel yükler.
 */
export async function uploadMultipleToStorage(
  bucket: UploadBucket,
  files: File[],
  folder: string = "",
  maxMB: number = 20
): Promise<{ urls: string[]; errors: string[] }> {
  const results = await Promise.all(
    files.map((f) => uploadToStorage(bucket, f, folder, maxMB))
  );
  const urls = results.filter((r) => r.success && r.url).map((r) => r.url!);
  const errors = results.filter((r) => !r.success && r.error).map((r) => r.error!);
  return { urls, errors };
}
