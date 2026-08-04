import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseBoundReviewTabs } from "@/features/analytics/components/course-bound-review-tabs";
import { getCourseBoundReviewDetail } from "@/features/analytics/services/get-course-bound-review-detail";
import {
  buildProgramHeadCiloReviewsPath,
  buildProgramHeadCiloReviewDetailPath,
} from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloReviewDetailPage({
  params,
}: {
  params: Promise<{ programId: string; evaluationId: string }>;
}) {
  const { evaluationId, programId } = await params;
  const detail = await getCourseBoundReviewDetail(evaluationId, programId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button
        render={<Link href={buildProgramHeadCiloReviewsPath(programId)} />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" /> Back to Reviews
      </Button>

      <section className="space-y-1">
        <h1 className="text-2xl font-bold">{detail.evaluationTitle}</h1>
        <p className="text-text-muted text-sm">
          {detail.courseTitle} | {detail.programLabel} | {detail.termInstanceLabel}
        </p>
      </section>

      <CourseBoundReviewTabs
        detail={detail}
        responseBasePath={buildProgramHeadCiloReviewDetailPath(programId, detail.evaluationId)}
      />
    </div>
  );
}
