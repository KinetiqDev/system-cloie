import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getCourseBoundResponseReview } from "@/features/analytics/services/get-course-bound-response-review";

const {
  responseFindFirstMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  resolveReviewerProgramScopeMock,
} = vi.hoisted(() => ({
  responseFindFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  resolveReviewerProgramScopeMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: {
      findFirst: responseFindFirstMock,
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

describe("getCourseBoundResponseReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no reviewer role is present", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
      userId: "user-1",
    });

    await expect(getCourseBoundResponseReview("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });



  it("rejects a response from another selected Program", async () => {
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
    responseFindFirstMock.mockResolvedValue(null);

    await expect(getCourseBoundResponseReview("response-1", "program-2")).resolves.toBeNull();
    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: {
            course_bound: {
              course_assignment: { program_id: { in: ["program-2"] } },
            },
          },
        }),
      })
    );
  });

  it("does not add program filter for deans", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    responseFindFirstMock.mockResolvedValue(null);

    await expect(getCourseBoundResponseReview("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: {
            course_bound: {},
          },
        }),
      })
    );
  });

});
