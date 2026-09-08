import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeploymentStatus } from "@prisma/client";

import { reopenFacultyEvaluation } from "@/features/evaluations/services/reopen-faculty-evaluation";
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

describe("reopenFacultyEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T01:00:00.000Z"));
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
      roles: [ROLES.FACULTY],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reopens an owned closed evaluation immediately with a new future deadline", async () => {
    const deadlineAt = new Date("2026-09-10T01:00:00.000Z");
    const observedUpdatedAt = new Date("2026-09-06T01:00:00.000Z");
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      deadline_at: new Date("2026-09-07T01:00:00.000Z"),
      status: DeploymentStatus.CLOSED,
      updated_at: observedUpdatedAt,
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 1 });

    await expect(reopenFacultyEvaluation("eval-1", deadlineAt)).resolves.toEqual({
      success: true,
      data: {
        activationAt: new Date("2026-09-08T01:00:00.000Z"),
        deadlineAt,
      },
    });
    expect(updateManyEvaluationMock).toHaveBeenCalledWith({
      where: {
        course_assignment: {
          faculty_id: "faculty-1",
        },
        id: "eval-1",
        updated_at: observedUpdatedAt,
        OR: [
          { status: DeploymentStatus.CLOSED },
          {
            status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
            deadline_at: { equals: new Date("2026-09-07T01:00:00.000Z") },
          },
        ],
      },
      data: {
        activation_at: new Date("2026-09-08T01:00:00.000Z"),
        deadline_at: deadlineAt,
        status: DeploymentStatus.ACTIVE,
        updated_at: new Date("2026-09-08T01:00:00.000Z"),
      },
    });
  });

  it("reopens a deployment that is effectively closed by its expired deadline", async () => {
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      deadline_at: new Date("2026-09-07T01:00:00.000Z"),
      status: DeploymentStatus.ACTIVE,
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 1 });

    await expect(
      reopenFacultyEvaluation("eval-1", new Date("2026-09-10T01:00:00.000Z"))
    ).resolves.toMatchObject({ success: true });
  });

  it("rejects a deadline that has already passed before querying the evaluation", async () => {
    await expect(
      reopenFacultyEvaluation("eval-1", new Date("2026-09-08T00:59:59.000Z"))
    ).resolves.toEqual({
      success: false,
      error: "Choose a deadline later than the current time.",
    });
    expect(findFirstEvaluationMock).not.toHaveBeenCalled();
  });

  it("does not reopen an active evaluation whose deadline has not passed", async () => {
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      deadline_at: new Date("2026-09-09T01:00:00.000Z"),
      status: DeploymentStatus.ACTIVE,
    });

    await expect(
      reopenFacultyEvaluation("eval-1", new Date("2026-09-10T01:00:00.000Z"))
    ).resolves.toMatchObject({ success: false });
    expect(updateManyEvaluationMock).not.toHaveBeenCalled();
  });

  it("does not expose or mutate another faculty member's evaluation", async () => {
    findFirstEvaluationMock.mockResolvedValue(null);

    await expect(
      reopenFacultyEvaluation("eval-1", new Date("2026-09-10T01:00:00.000Z"))
    ).resolves.toEqual({
      success: false,
      error: "Evaluation not found or you do not have access.",
    });
    expect(updateManyEvaluationMock).not.toHaveBeenCalled();
  });

  it("reports a conflict when the evaluation changed after its read", async () => {
    findFirstEvaluationMock.mockResolvedValue({
      id: "eval-1",
      deadline_at: new Date("2026-09-07T01:00:00.000Z"),
      status: DeploymentStatus.CLOSED,
      updated_at: new Date("2026-09-06T01:00:00.000Z"),
    });
    updateManyEvaluationMock.mockResolvedValue({ count: 0 });

    await expect(
      reopenFacultyEvaluation("eval-1", new Date("2026-09-10T01:00:00.000Z"))
    ).resolves.toEqual({
      success: false,
      error: "This evaluation is no longer closed. Refresh the page and try again.",
    });
  });
});
