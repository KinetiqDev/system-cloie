import { notFound } from "next/navigation";
import { getFacultyEvaluationDetail } from "@/features/evaluations/services/get-faculty-evaluation-detail";
import { FacultyEvaluationDetailView } from "@/features/evaluations/components/faculty-evaluation-detail-view";

export default async function FacultyPublishedEvaluationDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const { evaluationId } = await params;

  // Basic UUID guard mirrors other detail routes; invalid shape is indistinguishable from unauthorized.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    evaluationId
  );
  if (!isUuid) notFound();

  const result = await getFacultyEvaluationDetail(evaluationId);

  if (!result.success) notFound();

  return <FacultyEvaluationDetailView detail={result.data} />;
}
