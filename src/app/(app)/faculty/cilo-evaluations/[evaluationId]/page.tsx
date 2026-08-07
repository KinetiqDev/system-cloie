import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseBoundReviewTabs } from "@/features/analytics/components/course-bound-review-tabs";
import { getCourseBoundReviewDetail } from "@/features/analytics/services/get-course-bound-review-detail";

export default async function FacultyCiloEvaluationDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const { evaluationId } = await params;
  const detail = await getCourseBoundReviewDetail(evaluationId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/faculty/dashboard">
          <ArrowLeft className="mr-2 size-4" /> Back to Dashboard
        </Link>
      </Button>

      <section className="space-y-1">
        <h1 className="text-heading-lg">{detail.evaluationTitle}</h1>
        <p className="text-muted-foreground text-sm">
          {detail.courseTitle} | {detail.programLabel} | {detail.termInstanceLabel}
        </p>
      </section>

      <CourseBoundReviewTabs
        detail={detail}
        responseBasePath={`/faculty/cilo-evaluations/${detail.evaluationId}`}
      />
    </div>
  );
}
