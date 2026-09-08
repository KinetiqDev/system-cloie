import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Response", "Dean") };

export default async function DeanCiloResponsePage({
  params,
}: {
  params: Promise<{ evaluationId: string; responseId: string }>;
}) {
  void params;
  notFound();
}
