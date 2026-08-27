import { ErrorBoundary } from "@/components/error-boundary";
import { WizardShell } from "@/features/responses/components/wizard-shell";
import { getStudentAssignedEvaluationSession } from "@/features/responses/services/get-student-assigned-evaluation-session";
import {
  saveStudentEvaluationDraftAction,
  submitStudentEvaluationResponseAction,
} from "@/lib/actions/student-evaluation-actions";
import { notFound, redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Deferred enrollment students cannot access evaluation detail pages.
  const authSession = await resolveAuthSession();
  if (authSession?.profileGate.status === "DEFERRED_ENROLLMENT") {
    redirect("/student/dashboard");
  }

  const session = await getStudentAssignedEvaluationSession(id);

  if (!session) {
    notFound();
  }

  if (session.session.submittedAt) {
    if (!session.session.responseId) {
      notFound();
    }

    redirect(`/student/history/${session.session.responseId}`);
  }

  return (
    <ErrorBoundary returnHref="/student/dashboard">
      <WizardShell
        assignmentId={session.assignmentId}
        title={session.evaluationTitle}
        courseTitle={session.courseTitle ?? session.programLabel}
        sections={session.sections}
        initialAnswers={session.savedAnswers}
        returnRoute="/student/dashboard"
        submittedHistoryRoute="/student/history"
        onSaveDraft={saveStudentEvaluationDraftAction}
        onSubmitResponse={submitStudentEvaluationResponseAction}
      />
    </ErrorBoundary>
  );
}
