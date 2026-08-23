import { notFound, redirect } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { resolveLegacyCourseEvaluation } from "@/features/analytics/services/resolve-legacy-cilo-review-redirect";
import { buildProgramHeadResponsesCourseEvaluationPath, buildProgramHeadResponsesPath } from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloReviewRedirect({ params }: { params: Promise<{ programId: string; evaluationId: string }> }) {
  const { programId, evaluationId } = await params;
  if (!(await resolveProgramHeadContext(programId)).success) notFound();
  const resolvedId = await resolveLegacyCourseEvaluation(evaluationId, programId);
  redirect(resolvedId ? buildProgramHeadResponsesCourseEvaluationPath(programId, resolvedId) : buildProgramHeadResponsesPath(programId));
}
