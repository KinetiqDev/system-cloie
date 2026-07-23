import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { listCourseBoundReviewItems } from "@/features/analytics/services/list-course-bound-review-items";

const {
  courseBoundEvaluationFindManyMock,
  resolveAuthSessionMock,
  resolveReviewerProgramScopeMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
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

vi.mock("@/features/academic-structure/services/resolve-reviewer-program-scope", () => ({
  resolveReviewerProgramScope: resolveReviewerProgramScopeMock,
}));

describe("listCourseBoundReviewItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when the requester has no reviewer role", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.STUDENT, roles: [ROLES.STUDENT], userId: "user-1" });

    await expect(listCourseBoundReviewItems()).resolves.toEqual([]);
    expect(resolveReviewerProgramScopeMock).not.toHaveBeenCalled();
    expect(courseBoundEvaluationFindManyMock).not.toHaveBeenCalled();
  });

  it("returns reviewer-scoped rows for faculty with overall means", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-1"]);
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      {
        id: "eval-1",
        term_instance: { semester: "SECOND", term: "FIRST_TERM", school_year: { code: "2025-2026" } },
        assignments: [
          {
            response: {
              id: "response-1",
              quant_items: [{ rating_value: 4 }, { rating_value: 2 }],
              status: "SUBMITTED",
              submitted_at: new Date("2026-01-05T12:00:00.000Z"),
            },
          },
          {
            response: {
              id: "response-2",
              quant_items: [{ rating_value: 5 }],
              status: "SUBMITTED",
              submitted_at: new Date("2026-01-06T12:00:00.000Z"),
            },
          },
        ],
        deadline_at: new Date("2026-01-10T10:00:00.000Z"),
        instrument: { template: { name: "Post-Term CILO Evaluation Tool" } },
        course_assignment: {
          course: { title: "Software Engineering", major: null },
          program: { id: "program-1", name: "BSIT" },
        },
      },
    ]);

    await expect(listCourseBoundReviewItems()).resolves.toEqual([
      {
        termInstanceLabel: "2025-2026 — SECOND — FIRST_TERM",
        courseTitle: "Software Engineering",
        deadlineAt: new Date("2026-01-10T10:00:00.000Z"),
        evaluationId: "eval-1",
        evaluationTitle: "Post-Term CILO Evaluation Tool",
        overallMean: 3.67,
        programLabel: "BSIT",
        responseCount: 2,
        reviewerRole: ROLES.FACULTY,
      },
    ]);

    expect(resolveReviewerProgramScopeMock).toHaveBeenCalledWith({
      reviewerId: "faculty-1",
      reviewerRole: ROLES.FACULTY,
    });
    expect(courseBoundEvaluationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course_assignment: {
            faculty_id: "faculty-1",
            program_id: { in: ["program-1"] },
          },
        }),
      })
    );
  });

  it("does not add program filters for deans", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.DEAN, roles: [ROLES.DEAN], userId: "dean-1" });
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

  it("returns empty list and skips db query for empty reviewer scope", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue([]);

    await expect(listCourseBoundReviewItems()).resolves.toEqual([]);
    expect(courseBoundEvaluationFindManyMock).not.toHaveBeenCalled();
  });

  it("uses active role when session contains another reviewer role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.DEAN, ROLES.FACULTY],
      userId: "faculty-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-1"]);
    courseBoundEvaluationFindManyMock.mockResolvedValue([]);

    await expect(listCourseBoundReviewItems()).resolves.toEqual([]);

    expect(resolveReviewerProgramScopeMock).toHaveBeenCalledWith({
      reviewerId: "faculty-1",
      reviewerRole: ROLES.FACULTY,
    });
    expect(courseBoundEvaluationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course_assignment: expect.objectContaining({ faculty_id: "faculty-1" }),
        }),
      })
    );
  });

  it("returns null overall mean when submitted responses contain no quantitative ratings", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-1"]);
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      {
        term_instance: { semester: "SECOND", term: null, school_year: { code: "2025-2026" } },
        assignments: [
          {
            response: {
              id: "response-1",
              quant_items: [],
              status: "SUBMITTED",
              submitted_at: new Date("2026-01-05T12:00:00.000Z"),
            },
          },
        ],
        course_assignment: {
          course: { title: "Software Engineering", major: null },
          program: { id: "program-1", name: "BSIT" },
        },
        deadline_at: new Date("2026-01-10T10:00:00.000Z"),
        id: "eval-1",
        instrument: { template: { name: "Post-Term CILO Evaluation Tool" } },
      },
    ]);

    await expect(listCourseBoundReviewItems()).resolves.toEqual([
      expect.objectContaining({
        evaluationId: "eval-1",
        overallMean: null,
      }),
    ]);
  });
});
