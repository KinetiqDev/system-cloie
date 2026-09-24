import { notFound } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  PublishCourseBoundEvaluationFormV2,
  type PublicationContext,
} from "@/features/evaluations/components/publish-course-bound-evaluation-form-v2";
import { readProgramHeadPublicationOptions } from "@/features/evaluations/services/publication-options";
import {
  previewCourseBoundRespondentsAction,
  publishCourseBoundEvaluationAction,
} from "@/lib/actions/course-bound-evaluation-actions";
import { buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New CILO Evaluation", "Program Head") };

export default async function NewProgramHeadCiloEvaluationPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    notFound();
  }

  const options = await readProgramHeadPublicationOptions(contextResult.data.selectedProgram.id);

  const firstAssignment = options.assignments[0];
  const firstContext: PublicationContext | undefined = firstAssignment
    ? options.publicationContextsByAssignmentId[firstAssignment.id]
    : undefined;

  if (!firstContext) {
    notFound();
  }

  return (
    <PublishCourseBoundEvaluationFormV2
      assignments={options.assignments}
      isOnBehalf
      previewAction={previewCourseBoundRespondentsAction}
      publicationContext={firstContext}
      publicationContextsByAssignmentId={options.publicationContextsByAssignmentId}
      programId={programId}
      publishAction={publishCourseBoundEvaluationAction}
      successRedirectPath={buildProgramHeadToolsPath(programId)}
    />
  );
}
