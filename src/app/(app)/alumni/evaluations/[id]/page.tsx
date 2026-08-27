import { notFound, redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ErrorBoundary } from "@/components/error-boundary";
import { getCentralDeploymentEvaluationSession } from "@/features/responses/services/get-central-deployment-evaluation-session";
import { WizardShell } from "@/features/responses/components/wizard-shell";
import {
  saveCentralDeploymentDraftAction,
  submitCentralDeploymentResponseAction,
} from "@/lib/actions/stakeholder-evaluation-actions";

export default async function AlumniEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const { id: deploymentId } = await params;
  const evalSession = await getCentralDeploymentEvaluationSession(deploymentId);

  if (!evalSession) {
    notFound();
  }

  // If already submitted, redirect to the submitted review page
  if (evalSession.session.submittedAt) {
    redirect(`/alumni/evaluations/${deploymentId}/submitted`);
  }

  return (
    <ErrorBoundary returnHref="/alumni/dashboard">
      <WizardShell
        assignmentId={evalSession.assignmentId}
        title={evalSession.evaluationTitle}
        sections={evalSession.sections}
        initialAnswers={evalSession.savedAnswers}
        returnRoute="/alumni/dashboard"
        submittedReviewHref={`/alumni/evaluations/${deploymentId}/submitted`}
        onSaveDraft={saveCentralDeploymentDraftAction}
        onSubmitResponse={submitCentralDeploymentResponseAction}
      />
    </ErrorBoundary>
  );
}
