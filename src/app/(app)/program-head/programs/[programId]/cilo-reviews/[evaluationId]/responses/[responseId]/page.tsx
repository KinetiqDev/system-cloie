import { notFound, redirect } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { resolveLegacyCourseResponse } from "@/features/analytics/services/resolve-legacy-cilo-review-redirect";
import { buildProgramHeadResponsesCourseResponsePath, buildProgramHeadResponsesPath } from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloResponseRedirect({ params }: { params: Promise<{ programId: string; evaluationId: string; responseId: string }> }) {
  const { programId, evaluationId, responseId } = await params;
  if (!(await resolveProgramHeadContext(programId)).success) notFound();
  const resolvedId = await resolveLegacyCourseResponse(responseId, evaluationId, programId);
  redirect(resolvedId ? buildProgramHeadResponsesCourseResponsePath(programId, evaluationId, resolvedId) : buildProgramHeadResponsesPath(programId));
}
