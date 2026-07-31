import { revalidatePath, revalidateTag } from "next/cache";

export const ACADEMIC_PERIODS_TAG = "academic-periods";
export const ACTIVE_ACADEMIC_PERIOD_TAG = "active-academic-period";
export const ACADEMIC_PERIOD_SUMMARIES_REVALIDATE_SECONDS = 300;

const ACADEMIC_PERIOD_READ_MODEL_PATHS = [
  "/dean/dashboard",
  "/dean/college-oversight/learning-outcomes",
  "/dean/college-oversight/enrollments",
  "/dean/college-oversight/enrollments/roster",
] as const;

/** Call after a successful academic-period mutation has committed. */
export function invalidateAcademicPeriodReadModelTags(options: { activePeriodChanged?: boolean } = {}) {
  revalidateTag(ACADEMIC_PERIODS_TAG, "max");

  if (options.activePeriodChanged) {
    revalidateTag(ACTIVE_ACADEMIC_PERIOD_TAG, "max");
  }
}

/** Keeps route invalidation during the incremental tag-cache migration. */
export function revalidateAcademicPeriodReadModelRoutes() {
  // Retain route invalidation while tag coverage is being proven.
  for (const path of ACADEMIC_PERIOD_READ_MODEL_PATHS) {
    revalidatePath(path);
  }
}
