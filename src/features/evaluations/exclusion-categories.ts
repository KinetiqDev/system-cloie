import {
  CourseBoundEvaluationExclusionCategory,
  CourseBoundEvaluationExclusionReversalCategory,
} from "@prisma/client";

/**
 * Display mapping for roster exclusion categories.
 * Keeps enum values out of user-facing surfaces (select triggers, audit lists).
 */
export const EXCLUSION_CATEGORY_LABELS: Record<CourseBoundEvaluationExclusionCategory, string> = {
  [CourseBoundEvaluationExclusionCategory.APPROVED_ACCOMMODATION]: "Approved accommodation",
  [CourseBoundEvaluationExclusionCategory.NOT_TAKING_ASSESSMENT]: "Not taking this assessment",
  [CourseBoundEvaluationExclusionCategory.ADMINISTRATIVE_EXCEPTION]: "Administrative exception",
  [CourseBoundEvaluationExclusionCategory.OTHER]: "Other",
};

/**
 * Options array for exclusion category select dropdowns.
 */
export const EXCLUSION_CATEGORY_OPTIONS: Array<{
  value: CourseBoundEvaluationExclusionCategory;
  label: string;
}> = Object.values(CourseBoundEvaluationExclusionCategory).map((value) => ({
  value,
  label: EXCLUSION_CATEGORY_LABELS[value],
}));

/**
 * Helper to get display label for an exclusion category enum value.
 */
export function getExclusionCategoryLabel(
  category: CourseBoundEvaluationExclusionCategory | null | undefined
): string {
  if (!category) return "—";
  return EXCLUSION_CATEGORY_LABELS[category] ?? category;
}

/**
 * Display mapping for exclusion reversal categories.
 * Internal: consumed by REVERSAL_CATEGORY_OPTIONS and getReversalCategoryLabel.
 */
const REVERSAL_CATEGORY_LABELS: Record<CourseBoundEvaluationExclusionReversalCategory, string> = {
  [CourseBoundEvaluationExclusionReversalCategory.EXCLUDED_IN_ERROR]: "Excluded in error",
  [CourseBoundEvaluationExclusionReversalCategory.ELIGIBILITY_CORRECTED]: "Eligibility corrected",
  [CourseBoundEvaluationExclusionReversalCategory.APPROVED_LATE_PARTICIPATION]:
    "Approved late participation",
  [CourseBoundEvaluationExclusionReversalCategory.OTHER]: "Other",
};

/**
 * Options array for reversal category select dropdowns.
 */
export const REVERSAL_CATEGORY_OPTIONS: Array<{
  value: CourseBoundEvaluationExclusionReversalCategory;
  label: string;
}> = Object.values(CourseBoundEvaluationExclusionReversalCategory).map((value) => ({
  value,
  label: REVERSAL_CATEGORY_LABELS[value],
}));

/**
 * Helper to get display label for a reversal category enum value.
 */
export function getReversalCategoryLabel(
  category: CourseBoundEvaluationExclusionReversalCategory | null | undefined
): string {
  if (!category) return "—";
  return REVERSAL_CATEGORY_LABELS[category] ?? category;
}
