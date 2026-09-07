import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { listCourseBoundReviewItems } from "@/features/analytics/services/list-course-bound-review-items";

const {
  courseBoundEvaluationFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  resolveReviewerProgramScopeMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  resolveReviewerProgramScopeMock: vi.fn(),
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

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/academic-structure/services/resolve-reviewer-program-scope", () => ({
  resolveReviewerProgramScope: resolveReviewerProgramScopeMock,
}));

describe("listCourseBoundReviewItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when the requester has no reviewer role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
      userId: "user-1",
    });

    await expect(listCourseBoundReviewItems()).resolves.toEqual([]);
    expect(resolveReviewerProgramScopeMock).not.toHaveBeenCalled();
    expect(courseBoundEvaluationFindManyMock).not.toHaveBeenCalled();
  });

  it("does not add program filters for deans", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindManyMock.mockResolvedValue([]);

    await expect(listCourseBoundReviewItems()).resolves.toEqual([]);

    expect(resolveReviewerProgramScopeMock).toHaveBeenCalledWith({
      reviewerId: "dean-1",
      reviewerRole: ROLES.DEAN,
    });
    expect(courseBoundEvaluationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ course_assignment: expect.anything() }),
      })
    );
  });

  it("limits Program Head review rows to the selected Program", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BEED", id: "program-1", name: "Bachelor of Elementary Education" },
          { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
        ],
        selectedProgram: {
          code: "BSED",
          id: "program-2",
          name: "Bachelor of Secondary Education",
        },
        userId: "head-1",
      },
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-2"]);
    courseBoundEvaluationFindManyMock.mockResolvedValue([]);

    await expect(listCourseBoundReviewItems("program-2")).resolves.toEqual([]);

    expect(resolveReviewerProgramScopeMock).toHaveBeenCalledWith({
      programId: "program-2",
      reviewerId: "head-1",
      reviewerRole: ROLES.PROGRAM_HEAD,
    });
    expect(courseBoundEvaluationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course_assignment: { program_id: { in: ["program-2"] } },
        }),
      })
    );
  });
});
