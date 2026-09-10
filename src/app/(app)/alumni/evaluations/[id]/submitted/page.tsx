import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getCentralDeploymentEvaluationSession } from "@/features/responses/services/get-central-deployment-evaluation-session";
import { getCentralDeploymentSubmittedReview } from "@/features/responses/services/get-central-deployment-submitted-review";
import { SubmittedResponseReview } from "@/features/responses/components/submitted-response-review";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Evaluation Submitted", "Alumni") };

export default async function AlumniSubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const { id: deploymentId } = await params;

  // Get the session to find the responseId
  const evalSession = await getCentralDeploymentEvaluationSession(deploymentId);

  // If no session or no submitted response, redirect back
  if (!evalSession?.session.responseId) {
    redirect(`/alumni/evaluations/${deploymentId}`);
  }

  const review = await getCentralDeploymentSubmittedReview(evalSession.session.responseId);

  if (!review) {
    notFound();
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-6 motion-safe:duration-500">
      <BackLink href="/alumni/evaluations">Back to Evaluations</BackLink>

      <SubmittedResponseReview
        evaluationTitle={review.evaluationTitle}
        courseTitle={review.courseTitle}
        programLabel={review.programLabel}
        submittedAt={review.submittedAt}
        sections={review.sections}
      />
    </div>
  );
}
