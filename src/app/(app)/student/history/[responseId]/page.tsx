import { SubmittedResponseReview } from "@/features/responses/components/submitted-response-review";
import { getStudentSubmittedResponseReview } from "@/features/responses/services/get-student-submitted-response-review";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/student/history" />}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Back to History</span>
        </Button>
      </div>

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
