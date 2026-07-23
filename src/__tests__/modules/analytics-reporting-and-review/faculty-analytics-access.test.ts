import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacultyAnalyticsData } from "@/features/analytics/services/get-faculty-analytics-data";
import { listFacultyAnalyticsEvaluations } from "@/features/analytics/services/list-faculty-analytics-evaluations";
import { ROLES } from "@/lib/constants/roles";

const { courseBoundEvaluationFindManyMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  courseBoundEvaluationFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: {
      findMany: courseBoundEvaluationFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("faculty analytics access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects faculty analytics when Faculty is not active role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN, ROLES.FACULTY],
      userId: "dean-1",
    });

    await expect(listFacultyAnalyticsEvaluations()).resolves.toEqual({
      success: false,
      error: "Faculty access required",
    });
    await expect(getFacultyAnalyticsData(["evaluation-1"])).resolves.toEqual({
      success: false,
      error: "Faculty access required",
    });
    expect(courseBoundEvaluationFindManyMock).not.toHaveBeenCalled();
  });
});
