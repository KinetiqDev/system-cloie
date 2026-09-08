import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeploymentStatus } from "@prisma/client";
import { closeFacultyEvaluation } from "@/features/evaluations/services/close-faculty-evaluation";
import { ROLES } from "@/lib/constants/roles";

const { findFirstEvaluationMock, updateManyEvaluationMock, resolveAuthSessionMock } = vi.hoisted(
  () => ({
    findFirstEvaluationMock: vi.fn(),
    updateManyEvaluationMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
  })
);

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: {
      findFirst: findFirstEvaluationMock,
      updateMany: updateManyEvaluationMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("closeFacultyEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized access when session is missing or user is not faculty", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized. Faculty role required.");
    }
  });

  it("returns error if evaluation does not exist or belongs to another user", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
    findFirstEvaluationMock.mockResolvedValue(null);

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Evaluation not found or you do not have access.");
    }
    expect(findFirstEvaluationMock).toHaveBeenCalledWith({
      where: {
        id: "eval-1",
        course_assignment: {
          faculty_id: "faculty-1",
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
  });

  it("rejects closure if evaluation is already CLOSED", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      status: DeploymentStatus.CLOSED,
    });

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Cannot close evaluation with status");
    }
    expect(updateManyEvaluationMock).not.toHaveBeenCalled();
  });

  it("successfully closes an ACTIVE evaluation", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      status: DeploymentStatus.ACTIVE,
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 1 });

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(true);
    expect(updateManyEvaluationMock).toHaveBeenCalledWith({
      where: {
        course_assignment: { faculty_id: "faculty-1" },
        id: "eval-1",
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
      },
      data: {
        status: DeploymentStatus.CLOSED,
        updated_at: expect.any(Date),
      },
    });
  });

  it("successfully closes a SCHEDULED evaluation", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      status: DeploymentStatus.SCHEDULED,
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 1 });

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(true);
    expect(updateManyEvaluationMock).toHaveBeenCalledWith({
      where: {
        course_assignment: { faculty_id: "faculty-1" },
        id: "eval-1",
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
      },
      data: {
        status: DeploymentStatus.CLOSED,
        updated_at: expect.any(Date),
      },
    });
  });

  it("reports a conflict when the evaluation changed before the close write", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      status: DeploymentStatus.ACTIVE,
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 0 });

    const result = await closeFacultyEvaluation("eval-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no longer be closed");
    }
  });
});
