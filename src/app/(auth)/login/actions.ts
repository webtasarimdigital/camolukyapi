"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { type UserRole, ROLE_DEFINITIONS } from "@/lib/auth/role-constants";

export async function quickRoleLogin(role: UserRole) {
  const supabase = await createClient();
  
  // Default login credentials for the master system account
  const email = "camoluk@camolukyapi.com";
  const password = "camoluk2861";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Set active role and username in cookies
  const cookieStore = await cookies();
  cookieStore.set("app_active_role", role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const userName = ROLE_DEFINITIONS[role]?.defaultName || "Kullanıcı";
  cookieStore.set("app_user_name", userName, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    success: true,
    role,
    redirectTo: role === "sevkiyat" ? "/sevkiyat" : "/dashboard",
  };
}
