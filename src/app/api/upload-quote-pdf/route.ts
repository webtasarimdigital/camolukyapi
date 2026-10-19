import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Lütfen bir PDF dosyası seçin." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && !file.type.includes("pdf")) {
      return NextResponse.json(
        { success: false, error: "Lütfen sadece PDF formatında dosya yükleyin." },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Dosya boyutu 50MB sınırını aşıyor." },
        { status: 400 }
      );
    }

    // Kullanıcı ve Şirket Bilgisi
    let companyId = "a0000000-0000-0000-0000-000000000001";
    let userName = "Admin";

    try {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();

      if (user) {
        const { data: profile } = (await authClient
          .from("profiles")
          .select("company_id, full_name")
          .eq("id", user.id)
          .single()) as any;

        if (profile?.company_id) companyId = profile.company_id;
        if (profile?.full_name) userName = profile.full_name;
      }
    } catch {}

    try {
      const cookieStore = await cookies();
      const cookieName = cookieStore.get("app_user_name")?.value;
      if (cookieName) userName = cookieName;
    } catch {}

    // Form alanları
    const rawTitle = formData.get("title") as string;
    const title = (rawTitle || file.name.replace(/\.pdf$/i, "")).trim();
    const customer_name = ((formData.get("customer_name") as string) || "").trim() || null;
    const quote_date = (formData.get("quote_date") as string) || new Date().toISOString().split("T")[0];
    const notes = ((formData.get("notes") as string) || "").trim() || null;

    const rawAmount = formData.get("amount") as string;
    const cleanAmount = typeof rawAmount === "string"
      ? parseFloat(rawAmount.replace(/\./g, "").replace(",", "."))
      : 0;
    const amount = isNaN(cleanAmount) ? 0 : cleanAmount;

    // Buffer oluştur
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dosya adını güvenli hale getir
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
    const month = new Date().toISOString().slice(0, 7);
    const storagePath = `${month}/${timestamp}_${safeName}`;

    // Service Client ile Storage'a doğrudan yükle (CORS ve RLS engellerine takılmaz)
    const serviceClient = await createServiceClient();

    const { error: uploadError } = await serviceClient.storage
      .from("quote-pdfs")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: `Depolama yükleme hatası: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = serviceClient.storage
      .from("quote-pdfs")
      .getPublicUrl(storagePath);

    const file_url = urlData.publicUrl;

    // Veritabanına kaydet
    const now = new Date().toISOString();
    const { data: quoteRecord, error: dbError } = await (serviceClient
      .from("uploaded_quotes") as any)
      .insert({
        company_id: companyId,
        title,
        customer_name,
        quote_date,
        amount,
        file_name: file.name,
        file_url,
        file_size: file.size,
        notes,
        created_by_name: userName,
        created_at: now,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json(
        { success: false, error: `Veritabanı kayıt hatası: ${dbError.message}` },
        { status: 500 }
      );
    }

    try {
      revalidatePath("/teklifler");
    } catch {}

    return NextResponse.json({
      success: true,
      quote: quoteRecord,
    });
  } catch (err: any) {
    console.error("upload-quote-pdf API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Sunucu yükleme hatası oluştu." },
      { status: 500 }
    );
  }
}
