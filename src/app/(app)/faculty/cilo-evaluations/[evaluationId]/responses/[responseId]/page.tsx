import { redirect } from "next/navigation";

export default async function FacultyCiloResponsePage({
  params,
}: {
  params: Promise<{ evaluationId: string; responseId: string }>;
}) {
  const { evaluationId } = await params;
  redirect(`/faculty/analytics?evaluationId=${encodeURIComponent(evaluationId)}`);
}
