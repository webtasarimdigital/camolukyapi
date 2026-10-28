import { getShipments, Shipment } from "@/lib/data/store";
import { ShipmentClient } from "./ShipmentClient";
import { getVehicles } from "../otobil-gps/actions";
import type { Vehicle } from "../otobil-gps/types";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SevkiyatPage() {
  let userRole = "staff";
  let userName = "Kullanıcı";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("app_active_role")?.value;
    const cookieName = cookieStore.get("app_user_name")?.value;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      const profile = profileData as { role?: string; full_name?: string } | null;
      if (profile?.role) userRole = profile.role;
      if (profile?.full_name) userName = profile.full_name;
    }

    if (cookieRole) userRole = cookieRole;
    if (cookieName) userName = cookieName;
  } catch (authErr) {
    console.error("SevkiyatPage auth error:", authErr);
  }

  let shipments: Shipment[] = [];
  try {
    shipments = await getShipments();
  } catch (err) {
    console.error("SevkiyatPage getShipments error:", err);
  }

  let vehicles: Vehicle[] = [];
  try {
    vehicles = await getVehicles();
  } catch (err) {
    console.error("SevkiyatPage getVehicles error:", err);
  }

  let customers: { id: string; name: string; phone: string | null; contact_name: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data: custs } = await supabase
      .from("customers")
      .select("id, company_name, contact_name, phone")
      .order("company_name", { ascending: true });
    customers = (custs || []).map((c: any) => ({
      id: c.id,
      name: c.company_name || c.contact_name || "",
      phone: c.phone || null,
      contact_name: c.contact_name || null,
    }));
  } catch (err) {
    console.error("SevkiyatPage getCustomers error:", err);
  }

  return (
    <ShipmentClient
      initialShipments={shipments}
      initialVehicles={vehicles}
      initialCustomers={customers}
      userRole={userRole}
      userName={userName}
    />
  );
}
