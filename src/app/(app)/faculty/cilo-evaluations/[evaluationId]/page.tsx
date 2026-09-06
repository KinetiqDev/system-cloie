import { redirect } from "next/navigation";

export default async function FacultyCiloEvaluationDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const { evaluationId } = await params;
  redirect(`/faculty/analytics?evaluationId=${encodeURIComponent(evaluationId)}`);
}
