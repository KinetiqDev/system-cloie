import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock, listAcademicPeriodSummariesMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  listAcademicPeriodSummariesMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-calendar/services/read-academic-period-summaries", () => ({
  listAcademicPeriodSummaries: listAcademicPeriodSummariesMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    courseAssignment: { findMany: vi.fn(), findFirst: vi.fn() },
    studentEnrollment: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/features/academic-calendar/services/read-period-readiness", () => ({
  readPeriodReadiness: vi.fn(),
}));

import { listDeanEligiblePeriods } from "@/features/dean/services/read-dean-oversight";

describe("listDeanEligiblePeriods authorization seam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers before invoking the persistent cache", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(listDeanEligiblePeriods()).rejects.toMatchObject({
      name: "DeanReadModelUnauthorizedError",
      message: "Authentication required.",
    });
    expect(listAcademicPeriodSummariesMock).not.toHaveBeenCalled();
  });

  it("rejects non-Dean active roles before invoking the persistent cache", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.SECRETARY });

    await expect(listDeanEligiblePeriods()).rejects.toMatchObject({
      name: "DeanReadModelUnauthorizedError",
      message: "College Dean access required.",
    });
    expect(listAcademicPeriodSummariesMock).not.toHaveBeenCalled();
  });

  it("invokes the shared projection only after Dean authorization", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.DEAN });
    listAcademicPeriodSummariesMock.mockResolvedValue([
      { id: "period-1", label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
    ]);

    await expect(listDeanEligiblePeriods()).resolves.toEqual([
      { id: "period-1", label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
    ]);
    expect(listAcademicPeriodSummariesMock).toHaveBeenCalledTimes(1);
  });
});
