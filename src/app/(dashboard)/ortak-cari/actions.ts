'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPartnerMovement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Unauthorized");

  const partner_id = formData.get("partner_id") as string;
  const movement_type = (formData.get("movement_type") as string) || "partner_to_company";
  const amount = Math.abs(parseFloat(formData.get("amount") as string));
  const transaction_date = (formData.get("transaction_date") as string) || new Date().toISOString().split("T")[0];
  const category = (formData.get("category") as string) || "diger";
  const reason = (formData.get("reason") as string) || "Cari Hareket";
  const customNotes = (formData.get("notes") as string) || "";
  const doc_no = (formData.get("doc_no") as string) || "";
  const target_partner_id = formData.get("target_partner_id") as string | null;

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Lütfen geçerli bir tutar girin.");
  }

  // Çift tıklama ve mükerrer kayıt kontrolü (Son 15 saniyede aynı işlem girildiyse tekrar ekleme)
  const fifteenSecAgo = new Date(Date.now() - 15000).toISOString();
  const { data: recentDup } = await supabase
    .from("partner_ledger")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("partner_id", partner_id)
    .eq("amount", amount)
    .gte("created_at", fifteenSecAgo)
    .limit(1);

  if (recentDup && recentDup.length > 0) {
    return { success: true, duplicateIgnored: true };
  }

  // 1. Ortaklar Arası Şahsi Borç (Ahmet ↔ Mehmet)
  if (movement_type === "partner_to_partner" && target_partner_id && target_partner_id !== partner_id) {
    const p2pNotes = JSON.stringify({
      is_p2p: true,
      category,
      custom_notes: customNotes,
      from_partner_id: partner_id,
      to_partner_id: target_partner_id,
    });

    // Veren ortak kaydı (partner_to_company olarak tutulur, ortağın alacağına yazılır)
    await supabase.from("partner_ledger").insert({
      company_id: profile.company_id,
      partner_id: partner_id,
      direction: "partner_to_company",
      amount,
      transaction_date,
      reason: `[Şahsi Borç Verildi] ${reason}`,
      notes: p2pNotes,
      doc_no: doc_no || "P2P_GIVER",
      created_by: user.id,
    } as never);

    // Alan ortak kaydı (company_to_partner olarak tutulur, ortağın borcuna yazılır)
    await supabase.from("partner_ledger").insert({
      company_id: profile.company_id,
      partner_id: target_partner_id,
      direction: "company_to_partner",
      amount,
      transaction_date,
      reason: `[Şahsi Borç Alındı] ${reason}`,
      notes: p2pNotes,
      doc_no: doc_no || "P2P_RECEIVER",
      created_by: user.id,
    } as never);

    revalidatePath("/ortak-cari");
    revalidatePath(`/ortak-cari/${partner_id}`);
    revalidatePath(`/ortak-cari/${target_partner_id}`);
    return;
  }

  // 2. Bağımsız Kâr Dağıtımı (Kâr Payı Ortaklara Verilir -> company_to_partner)
  if (movement_type === "profit_distribution") {
    const metaNotes = JSON.stringify({
      is_profit_dist: true,
      category: "kar_dagitimi",
      custom_notes: customNotes,
    });

    await supabase.from("partner_ledger").insert({
      company_id: profile.company_id,
      partner_id,
      direction: "company_to_partner",
      amount,
      transaction_date,
      reason: `[Bağımsız Kâr Payı] ${reason}`,
      notes: metaNotes,
      doc_no: doc_no || "KAR_PAYI",
      created_by: user.id,
    } as never);

    revalidatePath("/ortak-cari");
    revalidatePath(`/ortak-cari/${partner_id}`);
    return;
  }

  // 3. Bağımsız Zarar / Masraf Karşılama (Ortaklar kasaya para koyar -> partner_to_company)
  if (movement_type === "loss_coverage") {
    const metaNotes = JSON.stringify({
      is_loss_coverage: true,
      category: "zarar_karsilama",
      custom_notes: customNotes,
    });

    await supabase.from("partner_ledger").insert({
      company_id: profile.company_id,
      partner_id,
      direction: "partner_to_company",
      amount,
      transaction_date,
      reason: `[Zarar Karşılama / Takviye] ${reason}`,
      notes: metaNotes,
      doc_no: doc_no || "ZARAR_TAKVIYE",
      created_by: user.id,
    } as never);

    revalidatePath("/ortak-cari");
    revalidatePath(`/ortak-cari/${partner_id}`);
    return;
  }

  // 4. Standart Hareketler (partner_to_company veya company_to_partner)
  const metaNotes = JSON.stringify({
    category,
    custom_notes: customNotes,
  });

  const { error } = await supabase.from("partner_ledger").insert({
    company_id: profile.company_id,
    partner_id,
    direction: movement_type === "company_to_partner" ? "company_to_partner" : "partner_to_company",
    amount,
    transaction_date,
    reason,
    notes: metaNotes,
    doc_no: doc_no || null,
    created_by: user.id,
  } as never);

  if (error) throw error;

  revalidatePath("/ortak-cari");
  revalidatePath(`/ortak-cari/${partner_id}`);
  return { success: true, duplicateIgnored: false };
}

export async function voidPartnerMovement(id: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase
    .from("partner_ledger")
    .update({
      voided_at: new Date().toISOString(),
      void_reason: reason,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .is("voided_at", null);

  if (error) throw error;

  revalidatePath("/ortak-cari");
}

/**
 * Ortaklar Arası Özel Not Ekleme (Projeden Bağımsız Defter)
 */
export async function addPartnerNote(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Unauthorized");

  const partner_id = (formData.get("partner_id") as string) || null;
  const partner_name = (formData.get("partner_name") as string) || "Ortaklar";
  const title = formData.get("title") as string;
  const content = (formData.get("content") as string) || "";
  const rawAmount = formData.get("amount") as string;
  const amount = rawAmount ? Math.abs(parseFloat(rawAmount)) : 0;
  const due_date = (formData.get("due_date") as string) || null;
  const priority = (formData.get("priority") as string) || "normal";

  if (!title || title.trim().length === 0) {
    throw new Error("Lütfen bir not başlığı girin.");
  }

  // İlk aktif ortağın ID'sini al (eğer partner_id seçilmediyse)
  let validPartnerId = partner_id;
  if (!validPartnerId) {
    const { data: firstPartner } = await supabase
      .from("partners")
      .select("id")
      .eq("company_id", profile.company_id)
      .limit(1)
      .single();
    validPartnerId = (firstPartner as unknown as { id: string } | null)?.id ?? null;
  }

  if (!validPartnerId) throw new Error("Ortak kaydı bulunamadı.");

  const notePayload = JSON.stringify({
    is_note: true,
    partner_id,
    partner_name,
    title,
    content,
    amount: amount > 0 ? amount : null,
    due_date,
    priority,
    is_completed: false,
  });

  const { error } = await supabase.from("partner_ledger").insert({
    company_id: profile.company_id,
    partner_id: validPartnerId,
    direction: "partner_to_company",
    amount: 0, // Notlar finansal bakiyeyi etkilemez
    transaction_date: due_date || new Date().toISOString().split("T")[0],
    reason: `[NOT] ${title}`,
    notes: notePayload,
    doc_no: "NOTE",
    created_by: user.id,
  } as never);

  if (error) throw error;
  revalidatePath("/ortak-cari");
}

/**
 * Ortaklar Arası Notu Tamamlandı Olarak İşaretle / Geri Al
 */
export async function togglePartnerNote(noteId: string, currentCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Unauthorized");

  const { data: recordData } = await supabase
    .from("partner_ledger")
    .select("notes")
    .eq("id", noteId)
    .eq("company_id", profile.company_id)
    .single();

  const record = recordData as { notes: string } | null;
  if (!record?.notes) return;

  try {
    const parsed = JSON.parse(record.notes);
    parsed.is_completed = !currentCompleted;
    await supabase
      .from("partner_ledger")
      .update({ notes: JSON.stringify(parsed) } as never)
      .eq("id", noteId)
      .eq("company_id", profile.company_id);
  } catch {
    // ignore json error
  }

  revalidatePath("/ortak-cari");
}

/**
 * Ortak Notunu Sil
 */
export async function deletePartnerNote(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Unauthorized");

  await supabase
    .from("partner_ledger")
    .delete()
    .eq("id", noteId)
    .eq("company_id", profile.company_id);

  revalidatePath("/ortak-cari");
}
