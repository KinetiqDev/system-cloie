import { notFound } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { PublishedCourseBoundList } from "@/features/analytics/components/published-course-bound-list";
import { listCourseBoundReviewItems } from "@/features/analytics/services/list-course-bound-review-items";
import { buildProgramHeadCiloReviewsPath } from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloReviewsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    notFound();
  }

  const items = await listCourseBoundReviewItems(programId);

  return (
    <PublishedCourseBoundList
      detailBasePath={buildProgramHeadCiloReviewsPath(programId)}
      emptyMessage="No submitted Course-bound evaluations are available for this Program."
      items={items}
      subtitle="Review submitted Course-bound evaluations for the selected Program."
      title="Course-bound Reviews"
    />
  );
}
