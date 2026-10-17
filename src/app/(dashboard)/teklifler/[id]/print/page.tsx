import { redirect } from "next/navigation";

export default async function RedirectToStandalonePrint({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const autoPrint = sp.autoPrint ? "?autoPrint=true" : "";
  redirect(`/teklif-yazdir/${id}${autoPrint}`);
}
