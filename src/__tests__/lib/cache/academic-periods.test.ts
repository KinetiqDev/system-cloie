import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import {
  ACADEMIC_PERIODS_TAG,
  ACTIVE_ACADEMIC_PERIOD_TAG,
  ACTIVE_SCHOOL_YEAR_TAG,
  invalidateAcademicPeriodReadModelTags,
  revalidateAcademicPeriodReadModelRoutes,
} from "@/lib/cache/academic-periods";

describe("academic-period cache ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates the shared period tag and active tag only for active-period changes", () => {
    invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });

    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, ACADEMIC_PERIODS_TAG, "max");
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, ACTIVE_ACADEMIC_PERIOD_TAG, "max");

    revalidateTagMock.mockClear();
    invalidateAcademicPeriodReadModelTags();
    expect(revalidateTagMock).toHaveBeenCalledWith(ACADEMIC_PERIODS_TAG, "max");
    expect(revalidateTagMock).not.toHaveBeenCalledWith(ACTIVE_ACADEMIC_PERIOD_TAG, "max");
  });

  it("invalidates the active school year tag only when school year state changed", () => {
    invalidateAcademicPeriodReadModelTags({ schoolYearStateChanged: true });

    expect(revalidateTagMock).toHaveBeenCalledWith(ACADEMIC_PERIODS_TAG, "max");
    expect(revalidateTagMock).toHaveBeenCalledWith(ACTIVE_SCHOOL_YEAR_TAG, "max");

    revalidateTagMock.mockClear();
    invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });
    expect(revalidateTagMock).not.toHaveBeenCalledWith(ACTIVE_SCHOOL_YEAR_TAG, "max");
  });

  it("retains the complete Dean route invalidation set during migration", () => {
    revalidateAcademicPeriodReadModelRoutes();

    expect(revalidatePathMock.mock.calls).toEqual([
      ["/dean/dashboard"],
      ["/dean/college-oversight/learning-outcomes"],
      ["/dean/college-oversight/enrollments"],
      ["/dean/college-oversight/enrollments/roster"],
    ]);
  });
});
