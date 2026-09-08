import { SubmittedResponseReview } from "@/features/responses/components/submitted-response-review";
import { getStudentSubmittedResponseReview } from "@/features/responses/services/get-student-submitted-response-review";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Response", "Student") };

export default async function StudentSubmittedResponseReviewPage({
  params,
}: {
  params: Promise<{ responseId: string }>;
}) {
  const { responseId } = await params;
  const review = await getStudentSubmittedResponseReview(responseId);

  if (!review) {
    notFound();
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-6 motion-safe:duration-500">
      <BackLink href="/student/history">Back to History</BackLink>

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
