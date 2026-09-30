"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function verifyPartnerAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum açmanız gerekiyor.");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string; role: string } | null;
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("app_active_role")?.value || profile?.role;

  const isAllowed = profile?.role === "admin" || profile?.role === "muhasebe2" || activeRole === "admin" || activeRole === "muhasebe2";

  if (!profile?.company_id || !isAllowed) {
    throw new Error("Bu işlemi yapmaya yetkiniz bulunmuyor (Yalnızca Yönetici ve Muhasebe 2).");
  }

  const serviceClient = await createServiceClient();
  return { user, profile, serviceClient };
}

export async function addPartnerMovement(formData: FormData) {
  try {
    const { user, profile, serviceClient } = await verifyPartnerAuth();

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

    // 1. Şahsi Gelir & Kâr Payı
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
      const { error: insErr1 } = await (serviceClient.from("partner_ledger") as any).insert({
        company_id: profile.company_id,
        partner_id: partner_id,
        direction: "company_to_partner",
        amount,
        transaction_date,
        reason: incomeReason,
        notes: metaNotes,
        doc_no: doc_no || "SAHSI_GELIR",
        created_by: user.id,
      });

      if (insErr1) throw insErr1;

      // Eğer "Her iki ortağa da eşit böl / ekle" seçilmişse diğer ortağa da ekle
      if (splitBoth && target_partner_id && target_partner_id !== partner_id) {
        const { error: insErr2 } = await (serviceClient.from("partner_ledger") as any).insert({
          company_id: profile.company_id,
          partner_id: target_partner_id,
          direction: "company_to_partner",
          amount,
          transaction_date,
          reason: incomeReason,
          notes: metaNotes,
          doc_no: doc_no || "SAHSI_GELIR",
          created_by: user.id,
        });
        if (insErr2) throw insErr2;
      }

      try {
        revalidatePath("/ortak-cari");
        revalidatePath(`/ortak-cari/${partner_id}`);
        if (target_partner_id) revalidatePath(`/ortak-cari/${target_partner_id}`);
      } catch {}

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
      const { error: insErr1 } = await (serviceClient.from("partner_ledger") as any).insert({
        company_id: profile.company_id,
        partner_id: partner_id,
        direction: "partner_to_company",
        amount,
        transaction_date,
        reason: `[Şahsi Borç Verildi] ${reason}`,
        notes: p2pNotes,
        doc_no: doc_no || "P2P_GIVER",
        created_by: user.id,
      });
      if (insErr1) throw insErr1;

      // Alan ortak kaydı
      const { error: insErr2 } = await (serviceClient.from("partner_ledger") as any).insert({
        company_id: profile.company_id,
        partner_id: target_partner_id,
        direction: "company_to_partner",
        amount,
        transaction_date,
        reason: `[Şahsi Borç Alındı] ${reason}`,
        notes: p2pNotes,
        doc_no: doc_no || "P2P_RECEIVER",
        created_by: user.id,
      });
      if (insErr2) throw insErr2;

      try {
        revalidatePath("/ortak-cari");
        revalidatePath(`/ortak-cari/${partner_id}`);
        revalidatePath(`/ortak-cari/${target_partner_id}`);
      } catch {}

      return { success: true, duplicateIgnored: false };
    }

    // 3. Standart Hareketler: Firmaya Verdiği (partner_to_company) veya Firmadan Aldığı (company_to_partner)
    const metaNotes = JSON.stringify({
      category,
      custom_notes: customNotes,
    });

    const direction = movement_type === "company_to_partner" ? "company_to_partner" : "partner_to_company";

    const { error: insErr } = await (serviceClient.from("partner_ledger") as any).insert({
      company_id: profile.company_id,
      partner_id,
      direction,
      amount,
      transaction_date,
      reason,
      notes: metaNotes,
      doc_no: doc_no || null,
      created_by: user.id,
    });

    if (insErr) throw insErr;

    try {
      revalidatePath("/ortak-cari");
      revalidatePath(`/ortak-cari/${partner_id}`);
    } catch {}

    return { success: true, duplicateIgnored: false };
  } catch (err: any) {
    console.error("addPartnerMovement error:", err);
    throw new Error(err?.message || "Kayıt eklenirken bir hata oluştu.");
  }
}

export async function voidPartnerMovement(id: string, reason: string) {
  try {
    const { profile, serviceClient } = await verifyPartnerAuth();

    const { error } = await (serviceClient.from("partner_ledger") as any)
      .update({
        voided_at: new Date().toISOString(),
        void_reason: reason,
      })
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .is("voided_at", null);

    if (error) throw error;

    try {
      revalidatePath("/ortak-cari");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("voidPartnerMovement error:", err);
    throw new Error(err?.message || "Hareket iptal edilemedi.");
  }
}

export async function updatePartnerMovement(id: string, formData: FormData) {
  try {
    const { profile, serviceClient } = await verifyPartnerAuth();

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
    const { data: currentMovData, error: fetchErr } = await serviceClient
      .from("partner_ledger")
      .select("*")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    if (fetchErr || !currentMovData) {
      throw new Error("Düzenlenecek hareket bulunamadı.");
    }

    const currentMov = currentMovData as any;

    let existingMeta: any = {};
    try {
      existingMeta = currentMov.notes ? JSON.parse(currentMov.notes) : {};
    } catch {}

    const updatedMeta = JSON.stringify({
      ...existingMeta,
      category,
      custom_notes: customNotes,
    });

    const direction = movementType === "company_to_partner" ? "company_to_partner" : "partner_to_company";

    const { error: updateErr } = await (serviceClient.from("partner_ledger") as any)
      .update({
        amount,
        transaction_date,
        category,
        reason,
        direction,
        notes: updatedMeta,
      })
      .eq("id", id)
      .eq("company_id", profile.company_id);

    if (updateErr) throw updateErr;

    try {
      revalidatePath("/ortak-cari");
      revalidatePath(`/ortak-cari/${currentMov.partner_id}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("updatePartnerMovement error:", err);
    throw new Error(err?.message || "Hareket güncellenemedi.");
  }
}

export async function deletePartnerMovementPermanently(id: string) {
  try {
    const { profile, serviceClient } = await verifyPartnerAuth();

    // Mevcut hareketi çek
    const { data: movData, error: fetchErr } = await serviceClient
      .from("partner_ledger")
      .select("*")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    const mov = movData as any;
    if (fetchErr || !mov) throw new Error("Kayıt bulunamadı.");

    let meta: any = {};
    try {
      meta = mov.notes ? JSON.parse(mov.notes) : {};
    } catch {}

    // Eğer P2P hareketi ise eşleşen kaydı da sil
    if (meta.is_p2p && (mov.doc_no === "P2P_GIVER" || mov.doc_no === "P2P_RECEIVER")) {
      const pairDoc = mov.doc_no === "P2P_GIVER" ? "P2P_RECEIVER" : "P2P_GIVER";
      const pairPartnerId = mov.doc_no === "P2P_GIVER" ? meta.to_partner_id : meta.from_partner_id;

      if (pairPartnerId) {
        await (serviceClient.from("partner_ledger") as any)
          .delete()
          .eq("partner_id", pairPartnerId)
          .eq("doc_no", pairDoc)
          .eq("transaction_date", mov.transaction_date)
          .eq("amount", mov.amount);
      }
    }

    // Kendisini sil
    const { error } = await (serviceClient.from("partner_ledger") as any)
      .delete()
      .eq("id", id)
      .eq("company_id", profile.company_id);

    if (error) throw error;

    try {
      revalidatePath("/ortak-cari");
      revalidatePath(`/ortak-cari/${mov.partner_id}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("deletePartnerMovementPermanently error:", err);
    throw new Error(err?.message || "Kayıt silinemedi.");
  }
}

export const deletePartnerMovement = deletePartnerMovementPermanently;

export async function addPartnerNote(formData: FormData) {
  try {
    const { user, profile, serviceClient } = await verifyPartnerAuth();

    const partner_id = (formData.get("partner_id") as string) || null;
    const title = (formData.get("title") as string) || "Özel Not";
    const content = (formData.get("content") as string) || "";
    const amountStr = formData.get("amount") as string;
    const amount = amountStr ? parseFloat(amountStr) : 0;
    const due_date = (formData.get("due_date") as string) || null;
    const priority = (formData.get("priority") as string) || "normal";

    let partner_name = "Ortaklar";
    if (partner_id) {
      const { data: p } = await serviceClient.from("partners").select("name").eq("id", partner_id).single();
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
      const { data: p } = await serviceClient.from("partners").select("id").eq("company_id", profile.company_id).limit(1).single();
      safePartnerId = (p as any)?.id;
    }

    if (!safePartnerId) throw new Error("Kayıtlı ortak bulunamadı.");

    const { error } = await (serviceClient.from("partner_ledger") as any).insert({
      company_id: profile.company_id,
      partner_id: safePartnerId,
      direction: "partner_to_company",
      amount: 0,
      transaction_date: due_date || new Date().toISOString().split("T")[0],
      reason: `[NOT] ${title}`,
      notes: metaNotes,
      doc_no: "NOTE",
      created_by: user.id,
    });

    if (error) throw error;

    try {
      revalidatePath("/ortak-cari");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("addPartnerNote error:", err);
    throw new Error(err?.message || "Not kaydedilemedi.");
  }
}

export async function togglePartnerNote(noteId: string, currentStatus?: boolean) {
  try {
    const { profile, serviceClient } = await verifyPartnerAuth();

    const { data: noteData, error: fetchErr } = await serviceClient
      .from("partner_ledger")
      .select("*")
      .eq("id", noteId)
      .eq("company_id", profile.company_id)
      .single();

    if (fetchErr || !noteData) throw new Error("Not bulunamadı");
    const note = noteData as any;

    let meta: any = {};
    try {
      meta = note.notes ? JSON.parse(note.notes) : {};
    } catch {}

    meta.is_completed = currentStatus !== undefined ? !currentStatus : !meta.is_completed;

    const { error } = await (serviceClient.from("partner_ledger") as any)
      .update({ notes: JSON.stringify(meta) })
      .eq("id", noteId);

    if (error) throw error;

    try {
      revalidatePath("/ortak-cari");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("togglePartnerNote error:", err);
    throw new Error(err?.message || "Not durumu güncellenemedi.");
  }
}

export const togglePartnerNoteStatus = togglePartnerNote;

export async function deletePartnerNote(noteId: string) {
  try {
    const { profile, serviceClient } = await verifyPartnerAuth();

    const { error } = await (serviceClient.from("partner_ledger") as any)
      .delete()
      .eq("id", noteId)
      .eq("company_id", profile.company_id);

    if (error) throw error;

    try {
      revalidatePath("/ortak-cari");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("deletePartnerNote error:", err);
    throw new Error(err?.message || "Not silinemedi.");
  }
}
