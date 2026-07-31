import { beforeEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock, prismaMock, revalidateTagMock, resetCacheMock } = vi.hoisted(() => {
  const cacheState = { hasValue: false, value: undefined as unknown };
  const resetCacheMock = vi.fn(() => {
    cacheState.hasValue = false;
    cacheState.value = undefined;
  });
  const revalidateTagMock = vi.fn(() => {
    cacheState.hasValue = false;
  });
  const unstableCacheMock = vi.fn((fn: () => Promise<unknown>) => async () => {
    if (!cacheState.hasValue) {
      cacheState.value = await fn();
      cacheState.hasValue = true;
    }
    return cacheState.value;
  });

  return {
    unstableCacheMock,
    revalidateTagMock,
    resetCacheMock,
    prismaMock: {
      academicTermInstance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
  revalidateTag: revalidateTagMock,
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  ACADEMIC_PERIODS_TAG,
  ACTIVE_ACADEMIC_PERIOD_TAG,
  ACADEMIC_PERIOD_SUMMARIES_REVALIDATE_SECONDS,
} from "@/lib/cache/academic-periods";
import { listAcademicPeriodSummaries } from "@/features/academic-calendar/services/read-academic-period-summaries";
import { invalidateAcademicPeriodReadModelTags } from "@/lib/cache/academic-periods";

describe("listAcademicPeriodSummaries", () => {
  beforeEach(() => {
    revalidateTagMock.mockClear();
    resetCacheMock();
    prismaMock.academicTermInstance.findFirst.mockReset();
    prismaMock.academicTermInstance.findMany.mockReset();
  });

  it("declares a primitive-only cache key, shared tags, and short freshness window", () => {
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["academic-period-summaries-v1"],
      {
        tags: [ACADEMIC_PERIODS_TAG, ACTIVE_ACADEMIC_PERIOD_TAG],
        revalidate: ACADEMIC_PERIOD_SUMMARIES_REVALIDATE_SECONDS,
      }
    );
  });

  it("returns the complete active and completed summary projection on a cache miss", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue({
      id: "active-period",
      semester: "FIRST",
      term: "FIRST_TERM",
      status: "ACTIVE",
      school_year: { code: "2025-2026" },
    });
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      {
        id: "completed-period",
        semester: "SECOND",
        term: "SECOND_TERM",
        status: "COMPLETED",
        school_year: { code: "2024-2025" },
      },
    ]);

    await expect(listAcademicPeriodSummaries()).resolves.toEqual([
      {
        id: "active-period",
        label: "2025-2026 — 1st Semester — 1st Term",
        status: "ACTIVE",
      },
      {
        id: "completed-period",
        label: "2024-2025 — 2nd Semester — 2nd Term",
        status: "COMPLETED",
      },
    ]);
  });

  it("rebuilds the projection after its owning tag is invalidated", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue({
      id: "old-active",
      semester: "FIRST",
      term: "FIRST_TERM",
      status: "ACTIVE",
      school_year: { code: "2025-2026" },
    });
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);

    await expect(listAcademicPeriodSummaries()).resolves.toEqual([
      {
        id: "old-active",
        label: "2025-2026 — 1st Semester — 1st Term",
        status: "ACTIVE",
      },
    ]);

    prismaMock.academicTermInstance.findFirst.mockResolvedValue({
      id: "new-active",
      semester: "SECOND",
      term: "SECOND_TERM",
      status: "ACTIVE",
      school_year: { code: "2026-2027" },
    });
    invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });

    await expect(listAcademicPeriodSummaries()).resolves.toEqual([
      {
        id: "new-active",
        label: "2026-2027 — 2nd Semester — 2nd Term",
        status: "ACTIVE",
      },
    ]);
    expect(prismaMock.academicTermInstance.findFirst).toHaveBeenCalledTimes(2);
  });
});
