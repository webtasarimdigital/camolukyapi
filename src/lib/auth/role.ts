"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { UserRole, ROLE_DEFINITIONS } from "./role-constants";

// Re-export so existing imports still work
export type { UserRole };
export { ROLE_DEFINITIONS };

export async function setActiveUserRole(role: UserRole, customName?: string) {
  const cookieStore = await cookies();
  cookieStore.set("app_active_role", role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const name = customName || ROLE_DEFINITIONS[role]?.defaultName || "Kullanıcı";
  cookieStore.set("app_user_name", name, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  return { success: true, role, name };
}

export async function getActiveUserSession(): Promise<{ role: UserRole; name: string }> {
  const cookieStore = await cookies();
  const role = (cookieStore.get("app_active_role")?.value as UserRole) || "admin";
  const name =
    cookieStore.get("app_user_name")?.value ||
    ROLE_DEFINITIONS[role]?.defaultName ||
    "Çamoluk Yönetici";
  return { role, name };
}
