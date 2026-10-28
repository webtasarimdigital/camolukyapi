"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { slugifyUsername, usernameToAuthEmail } from "@/lib/auth/role-constants";

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

    const rawUsernameOrEmail = (
      (formData.get("email") as string) || (formData.get("username") as string)
    )?.trim();
    const fullNameInput = (formData.get("full_name") as string)?.trim();
    const password = (formData.get("password") as string)?.trim();
    let role = (formData.get("role") as string)?.trim() || "depo";
    if (role === "depocu") role = "depo";

    if (!rawUsernameOrEmail) {
      return { success: false, error: "Lütfen kullanıcı adını giriniz (örn: sırrı)." };
    }
    const fullName = fullNameInput || rawUsernameOrEmail;

    if (!password || password.length < 6) {
      return { success: false, error: "Şifre en az 6 karakter olmalıdır (örn: sırrı123)." };
    }

    // Türkçe karakterleri ve geçersiz sembolleri temizleyip Supabase Auth e-postasına dönüştür
    const email = usernameToAuthEmail(rawUsernameOrEmail);
    const cleanSlug = slugifyUsername(rawUsernameOrEmail);

    const serviceClient = await createServiceClient();

    // 1. Supabase Auth içinde kullanıcı oluştur
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: rawUsernameOrEmail,
        slug_username: cleanSlug,
        plain_password: password,
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message || "";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists")
      ) {
        return {
          success: false,
          error: `"${rawUsernameOrEmail}" kullanıcı adı (${email}) zaten sistemde kayıtlı. Lütfen farklı bir kullanıcı adı seçiniz veya mevcut kullanıcının şifresini güncelleyiniz.`,
        };
      }
      return { success: false, error: msg || "Kullanıcı oluşturulamadı." };
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
      message: `"${fullName}" kullanıcısı başarıyla oluşturuldu! (Kullanıcı Adı: ${rawUsernameOrEmail}, Şifre: ${password})`,
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

export async function actionResetUserPassword(userId: string, newPass: string) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: "Yetkisiz erişim." };

    const { data: curProfileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if ((curProfileData as any)?.role !== "admin") {
      return { success: false, error: "Yalnızca Yöneticiler şifre değiştirebilir." };
    }

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: "Şifre en az 6 karakter olmalıdır." };
    }

    const serviceClient = await createServiceClient();
    const { data: authUser } = await serviceClient.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    const { error } = await serviceClient.auth.admin.updateUserById(userId, {
      password: newPass.trim(),
      user_metadata: {
        ...existingMeta,
        plain_password: newPass.trim(),
      },
    });

    if (error) return { success: false, error: error.message };

    try {
      revalidatePath("/kullanicilar");
    } catch {}

    return { success: true, message: "Şifre başarıyla güncellendi." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Şifre güncellenemedi." };
  }
}
