import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("CILO Review", "Dean") };

export default async function DeanCiloReviewDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  void params;
  notFound();
}
