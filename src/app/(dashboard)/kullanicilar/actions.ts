"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actionCreateUser(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: "Oturum açmanız gerekiyor." };
    }

    // Rol doğrulaması
    const { data: curProfileData } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", currentUser.id)
      .single();

    const curProfile = curProfileData as { company_id?: string; role?: string } | null;

    if (curProfile?.role !== "admin") {
      return { success: false, error: "Yalnızca Yöneticiler yeni kullanıcı oluşturabilir." };
    }

    const fullName = (formData.get("full_name") as string)?.trim();
    let email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = (formData.get("password") as string)?.trim();
    const role = (formData.get("role") as string)?.trim() || "staff";

    if (!fullName) {
      return { success: false, error: "Lütfen ad soyad giriniz." };
    }
    if (!email) {
      return { success: false, error: "Lütfen e-posta veya kullanıcı adı giriniz." };
    }
    if (!email.includes("@")) {
      email = `${email}@camolukyapi.com`;
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Şifre en az 6 karakter olmalıdır." };
    }

    const serviceClient = await createServiceClient();

    // 1. Supabase Auth içinde kullanıcı oluştur
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || "Kullanıcı oluşturulamadı." };
    }

    // 2. profiles tablosuna rol ve şirket bilgisiyle kaydet
    const companyId = curProfile?.company_id || "a0000000-0000-0000-0000-000000000001";
    const { error: profileError } = await (serviceClient.from("profiles") as any).upsert({
      id: authData.user.id,
      company_id: companyId,
      full_name: fullName,
      role: role,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    try {
      revalidatePath("/kullanicilar");
    } catch {}

    return {
      success: true,
      message: `"${fullName}" kullanıcısı (${email}) başarıyla oluşturuldu.`,
    };
  } catch (err: any) {
    console.error("actionCreateUser catch error:", err);
    return { success: false, error: err?.message || "Beklenmeyen bir hata oluştu." };
  }
}

export async function actionUpdateUserRole(userId: string, role: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Yetkisiz erişim." };

    const serviceClient = await createServiceClient();
    const { error } = await (serviceClient.from("profiles") as any)
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    try {
      revalidatePath("/kullanicilar");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function actionToggleUserActive(userId: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Yetkisiz erişim." };

    const serviceClient = await createServiceClient();
    const { error } = await (serviceClient.from("profiles") as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    try {
      revalidatePath("/kullanicilar");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function actionDeleteUser(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: "Yetkisiz erişim." };

    if (userId === currentUser.id) {
      return { success: false, error: "Kendi hesabınızı silemezsiniz." };
    }

    const serviceClient = await createServiceClient();

    // 1. Auth'tan sil
    await serviceClient.auth.admin.deleteUser(userId);

    // 2. profiles tablosundan sil
    await (serviceClient.from("profiles") as any).delete().eq("id", userId);

    try {
      revalidatePath("/kullanicilar");
    } catch {}

    return { success: true, message: "Kullanıcı başarıyla silindi." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Kullanıcı silinemedi." };
  }
}
