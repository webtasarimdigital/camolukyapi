"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { UserRole } from "./role-constants";

function getDefaultName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Çamoluk Yönetici";
    case "muhasebe1":
      return "Muhasebe 1 Personeli";
    case "muhasebe2":
      return "Muhasebe 2 Personeli";
    case "sevkiyat":
      return "Sevkiyat Sorumlusu";
    default:
      return "Kullanıcı";
  }
}

export async function setActiveUserRole(role: UserRole, customName?: string) {
  const cookieStore = await cookies();
  cookieStore.set("app_active_role", role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const name = customName || getDefaultName(role);
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
  const name = cookieStore.get("app_user_name")?.value || getDefaultName(role);
  return { role, name };
}
