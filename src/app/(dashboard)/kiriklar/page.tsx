import { redirect } from "next/navigation";

export default function KiriklarRedirectPage() {
  redirect("/depo-takip?tab=kiriklar");
}
