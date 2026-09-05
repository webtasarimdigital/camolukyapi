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
  const splitBoth = formData.get("split_both") === "true";

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

  // 1. Şahsi Gelir & Kâr Payı (Kira, Dönem Kârı, Hak Ediş vb. - Şirkete borç değildir, adamlara kâr/gelir yazar)
  if (movement_type === "sahsi_gelir") {
    const metaNotes = JSON.stringify({
      is_personal_income: true,
      category: category || "kira",
      custom_notes: customNotes,
    });

    const incomeReason = reason.includes("Şahsi Gelir") || reason.includes("Kira") 
      ? reason 
      : `[Şahsi Gelir / Kira] ${reason}`;

    // Ana ortak kaydı
    await supabase.from("partner_ledger").insert({
      company_id: profile.company_id,
      partner_id: partner_id,
      direction: "company_to_partner",
      amount,
      transaction_date,
      reason: incomeReason,
      notes: metaNotes,
      doc_no: doc_no || "SAHSI_GELIR",
      created_by: user.id,
    } as never);

    // Eğer "Her iki ortağa da eşit böl / ekle" seçilmişse diğer ortağa da ekle
    if (splitBoth && target_partner_id && target_partner_id !== partner_id) {
      await supabase.from("partner_ledger").insert({
        company_id: profile.company_id,
        partner_id: target_partner_id,
        direction: "company_to_partner",
        amount,
        transaction_date,
        reason: incomeReason,
        notes: metaNotes,
        doc_no: doc_no || "SAHSI_GELIR",
        created_by: user.id,
      } as never);
    }

    revalidatePath("/ortak-cari");
    revalidatePath(`/ortak-cari/${partner_id}`);
    if (target_partner_id) revalidatePath(`/ortak-cari/${target_partner_id}`);
    return { success: true, duplicateIgnored: false };
  }

  // 2. Ortaklar Arası Şahsi Borç (Ahmet ↔ Mehmet)
  if (movement_type === "partner_to_partner" && target_partner_id && target_partner_id !== partner_id) {
    const p2pNotes = JSON.stringify({
      is_p2p: true,
      category,
      custom_notes: customNotes,
      from_partner_id: partner_id,
      to_partner_id: target_partner_id,
    });

    // Veren ortak kaydı
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

    // Alan ortak kaydı
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
    return { success: true, duplicateIgnored: false };
  }

  // 3. Standart Hareketler: Firmaya Verdiği (partner_to_company) veya Firmadan Aldığı (company_to_partner)
  const metaNotes = JSON.stringify({
    category,
    custom_notes: customNotes,
  });

  const direction = movement_type === "company_to_partner" ? "company_to_partner" : "partner_to_company";

  const { error } = await supabase.from("partner_ledger").insert({
    company_id: profile.company_id,
    partner_id,
    direction,
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
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .is("voided_at", null);

  if (error) throw error;

  revalidatePath("/ortak-cari");
}

export async function updatePartnerMovement(id: string, formData: FormData) {
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

  const amount = Math.abs(parseFloat(formData.get("amount") as string));
  const transaction_date = (formData.get("transaction_date") as string) || new Date().toISOString().split("T")[0];
  const category = (formData.get("category") as string) || "diger";
  const reason = (formData.get("reason") as string) || "Cari Hareket";
  const customNotes = (formData.get("notes") as string) || "";
  const movementType = formData.get("movement_type") as string;

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Lütfen geçerli bir tutar girin.");
  }

  // Mevcut hareketi çek
  const { data: currentMovData } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  const currentMov = currentMovData as any;
  if (!currentMov) throw new Error("Kayıt bulunamadı.");

  let meta: any = {};
  try {
    meta = currentMov.notes ? JSON.parse(currentMov.notes) : {};
  } catch {}

  meta.category = category;
  meta.custom_notes = customNotes;

  let newDocNo = currentMov.doc_no;
  let newDirection = currentMov.direction;

  if (movementType === "sahsi_gelir") {
    meta.is_personal_income = true;
    newDocNo = "SAHSI_GELIR";
    newDirection = "company_to_partner";
  } else if (movementType === "partner_to_company") {
    delete meta.is_personal_income;
    if (newDocNo === "SAHSI_GELIR") newDocNo = null;
    newDirection = "partner_to_company";
  } else if (movementType === "company_to_partner") {
    delete meta.is_personal_income;
    if (newDocNo === "SAHSI_GELIR") newDocNo = null;
    newDirection = "company_to_partner";
  }

  const updatedNotes = JSON.stringify(meta);

  // Güncelle
  const { error } = await supabase
    .from("partner_ledger")
    .update({
      amount,
      transaction_date,
      reason,
      notes: updatedNotes,
      direction: newDirection,
      doc_no: newDocNo,
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) throw error;

  // Eğer P2P hareketi ise eşleşen diğer kaydı da senkronize et
  if (meta.is_p2p && (currentMov.doc_no === "P2P_GIVER" || currentMov.doc_no === "P2P_RECEIVER")) {
    const pairDoc = currentMov.doc_no === "P2P_GIVER" ? "P2P_RECEIVER" : "P2P_GIVER";
    const pairPartnerId = currentMov.doc_no === "P2P_GIVER" ? meta.to_partner_id : meta.from_partner_id;

    if (pairPartnerId) {
      await supabase
        .from("partner_ledger")
        .update({
          amount,
          transaction_date,
          reason: currentMov.doc_no === "P2P_GIVER" 
            ? `[Şahsi Borç Alındı] ${reason.replace("[Şahsi Borç Verildi] ", "")}` 
            : `[Şahsi Borç Verildi] ${reason.replace("[Şahsi Borç Alındı] ", "")}`,
        } as never)
        .eq("partner_id", pairPartnerId)
        .eq("doc_no", pairDoc)
        .eq("transaction_date", currentMov.transaction_date)
        .eq("amount", currentMov.amount);
    }
  }

  revalidatePath("/ortak-cari");
  revalidatePath(`/ortak-cari/${currentMov.partner_id}`);
  return { success: true };
}

export async function deletePartnerMovement(id: string) {
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

  // Mevcut hareketi çek
  const { data: movData } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  const mov = movData as any;
  if (!mov) throw new Error("Kayıt bulunamadı.");

  let meta: any = {};
  try {
    meta = mov.notes ? JSON.parse(mov.notes) : {};
  } catch {}

  // Eğer P2P hareketi ise eşleşen kaydı da sil
  if (meta.is_p2p && (mov.doc_no === "P2P_GIVER" || mov.doc_no === "P2P_RECEIVER")) {
    const pairDoc = mov.doc_no === "P2P_GIVER" ? "P2P_RECEIVER" : "P2P_GIVER";
    const pairPartnerId = mov.doc_no === "P2P_GIVER" ? meta.to_partner_id : meta.from_partner_id;

    if (pairPartnerId) {
      await supabase
        .from("partner_ledger")
        .delete()
        .eq("partner_id", pairPartnerId)
        .eq("doc_no", pairDoc)
        .eq("transaction_date", mov.transaction_date)
        .eq("amount", mov.amount);
    }
  }

  // Kendisini sil
  const { error } = await supabase
    .from("partner_ledger")
    .delete()
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) throw error;

  revalidatePath("/ortak-cari");
  revalidatePath(`/ortak-cari/${mov.partner_id}`);
  return { success: true };
}

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
  const title = (formData.get("title") as string) || "Özel Not";
  const content = (formData.get("content") as string) || "";
  const amountStr = formData.get("amount") as string;
  const amount = amountStr ? parseFloat(amountStr) : 0;
  const due_date = (formData.get("due_date") as string) || null;
  const priority = (formData.get("priority") as string) || "normal";

  // Partner adı
  let partner_name = "Ortaklar";
  if (partner_id) {
    const { data: p } = await supabase.from("partners").select("name").eq("id", partner_id).single();
    if (p) partner_name = (p as any).name;
  }

  const metaNotes = JSON.stringify({
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

  let safePartnerId = partner_id;
  if (!safePartnerId) {
    const { data: p } = await supabase.from("partners").select("id").eq("company_id", profile.company_id).limit(1).single();
    safePartnerId = (p as any)?.id;
  }

  if (!safePartnerId) throw new Error("Kayıtlı ortak bulunamadı.");

  const { error } = await supabase.from("partner_ledger").insert({
    company_id: profile.company_id,
    partner_id: safePartnerId,
    direction: "partner_to_company",
    amount: 0,
    transaction_date: due_date || new Date().toISOString().split("T")[0],
    reason: `[NOT] ${title}`,
    notes: metaNotes,
    doc_no: "NOTE",
    created_by: user.id,
  } as never);

  if (error) throw error;

  revalidatePath("/ortak-cari");
}

export async function togglePartnerNote(noteId: string, currentStatus?: boolean) {
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

  const { data: noteData } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("id", noteId)
    .eq("company_id", profile.company_id)
    .single();

  if (!noteData) throw new Error("Not bulunamadı");
  const note = noteData as any;

  let meta: any = {};
  try {
    meta = note.notes ? JSON.parse(note.notes) : {};
  } catch {}

  meta.is_completed = currentStatus !== undefined ? !currentStatus : !meta.is_completed;

  await supabase
    .from("partner_ledger")
    .update({ notes: JSON.stringify(meta) } as never)
    .eq("id", noteId);

  revalidatePath("/ortak-cari");
}

export const togglePartnerNoteStatus = togglePartnerNote;

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
