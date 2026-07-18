import { notFound } from "next/navigation";

export default async function DeanCiloReviewDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  void params;
  notFound();
}
