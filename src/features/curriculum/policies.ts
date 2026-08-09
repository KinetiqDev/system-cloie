import type { CurriculumVersionStatus } from "@prisma/client";

export type PolicyDecision = { allowed: true } | { allowed: false; reason: string };

export const PUBLISHED_IMMUTABILITY_MESSAGE = "Published curricula are immutable";

export const EMPTY_PUBLISH_MESSAGE = "A curriculum must contain at least one course";

/**
 * Whether a Curriculum Version may be edited. Only DRAFT versions accept
 * mutation; PUBLISHED and RETIRED versions are immutable.
 */
export function canEditCurriculumVersion(
  status: CurriculumVersionStatus
): PolicyDecision {
  if (status === "DRAFT") {
    return { allowed: true };
  }
  return { allowed: false, reason: PUBLISHED_IMMUTABILITY_MESSAGE };
}

/**
 * Whether a DRAFT Curriculum Version may be published: the version must be
 * DRAFT (not already immutable) and contain at least one CurriculumCourse.
 */
export function canPublishCurriculumVersion(
  status: CurriculumVersionStatus,
  courseCount: number
): PolicyDecision {
  if (status !== "DRAFT") {
    return { allowed: false, reason: PUBLISHED_IMMUTABILITY_MESSAGE };
  }
  if (courseCount < 1) {
    return { allowed: false, reason: EMPTY_PUBLISH_MESSAGE };
  }
  return { allowed: true };
}

/**
 * Whether a Curriculum Version may be retired: only PUBLISHED versions can
 * transition to RETIRED.
 */
export function canRetireCurriculumVersion(
  status: CurriculumVersionStatus
): PolicyDecision {
  if (status === "PUBLISHED") {
    return { allowed: true };
  }
  if (status === "DRAFT") {
    return { allowed: false, reason: "Only published curricula can be retired" };
  }
  return { allowed: false, reason: PUBLISHED_IMMUTABILITY_MESSAGE };
}

/**
 * Whether a Curriculum Course may be added, removed, or updated within a
 * version. Only DRAFT versions accept course mutation.
 */
export function canModifyCurriculumCourse(
  versionStatus: CurriculumVersionStatus
): PolicyDecision {
  return canEditCurriculumVersion(versionStatus);
}
