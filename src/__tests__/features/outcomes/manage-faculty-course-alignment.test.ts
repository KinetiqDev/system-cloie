import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  assignment: { findFirst: vi.fn() },
  course: { findFirst: vi.fn() },
  go: { count: vi.fn(), findMany: vi.fn() },
  transaction: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: mocks.session,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: mocks.assignment,
    course: mocks.course,
    gO: mocks.go,
    $transaction: mocks.transaction,
  },
}));

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const GO_ID = "33333333-3333-4333-8333-333333333333";
const PROGRAM_ID = "44444444-4444-4444-8444-444444444444";
const FACULTY = { userId: "faculty-1", activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY] };
const FRESHNESS_TOKEN = JSON.stringify([{ ciloId: CILO_ID, targetIds: [GO_ID] }]);

function course(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    code: "CS-101",
    title: "Computing",
    program_id: PROGRAM_ID,
    program: { id: PROGRAM_ID, code: "BSCS", name: "Computer Science", is_active: true },
    cilos: [
      {
        id: CILO_ID,
        description: "Apply core concepts",
        cilo_mappings: [
          {
            go_id: GO_ID,
            go: { id: GO_ID, code: "GO-1", description: "Think critically", is_active: true },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("Faculty Course alignment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(FACULTY);
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.course.findFirst.mockResolvedValue(course());
    mocks.go.findMany.mockResolvedValue([
      { id: GO_ID, code: "GO-1", description: "Think critically" },
    ]);
    mocks.go.count.mockResolvedValue(1);
  });

  it("returns only the active owning-Program catalog and readiness", async () => {
    const { readFacultyCourseAlignment } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");
    await expect(readFacultyCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        course: { id: COURSE_ID, program: { id: PROGRAM_ID } },
        targets: [{ id: GO_ID }],
        cilos: [{ id: CILO_ID, targetIds: [GO_ID] }],
        readiness: "ready",
      },
    });
    expect(mocks.go.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: PROGRAM_ID, is_active: true } })
    );
  });

  it("keeps inactive existing mappings visible but excludes them from live readiness", async () => {
    const { readFacultyCourseAlignment } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");
    mocks.course.findFirst.mockResolvedValue(
      course({
        cilos: [
          {
            id: CILO_ID,
            description: "Apply core concepts",
            cilo_mappings: [
              {
                go_id: GO_ID,
                go: {
                  id: GO_ID,
                  code: "GO-1",
                  description: "Think critically",
                  is_active: false,
                },
              },
            ],
          },
        ],
      })
    );
    mocks.go.findMany.mockResolvedValue([]);

    await expect(readFacultyCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        cilos: [{ id: CILO_ID, targetIds: [GO_ID] }],
        targets: [],
        unavailableTargets: [{ id: GO_ID, code: "GO-1" }],
        readiness: "incomplete-mapping",
      },
    });
  });

  it("conceals unauthorized and non-Program-specific Course URLs", async () => {
    const { readFacultyCourseAlignment } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");
    mocks.assignment.findFirst.mockResolvedValue(null);
    await expect(readFacultyCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.course.findFirst.mockResolvedValue(null);
    await expect(readFacultyCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
  });

  it("conceals malformed Course IDs before querying assignments", async () => {
    const { readFacultyCourseAlignment } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");

    await expect(readFacultyCourseAlignment("not-a-course-id")).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.assignment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a malformed Course ID before preparing an alignment draft", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");

    await expect(
      prepareCourseAlignmentWrite({
        courseId: "not-a-course-id",
        desired: [{ ciloId: CILO_ID, targetIds: [] }],
        freshnessToken: FRESHNESS_TOKEN,
      })
    ).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.assignment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a draft prepared from an outdated alignment snapshot", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");

    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [] }],
        freshnessToken: "outdated",
      })
    ).resolves.toEqual({
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    });
    expect(mocks.go.count).not.toHaveBeenCalled();
  });

  it("prepares an exact multi-CILO diff and rejects a forged cross-Program target", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");
    const review = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [{ ciloId: CILO_ID, targetIds: [] }],
      freshnessToken: FRESHNESS_TOKEN,
    });
    expect(review).toMatchObject({
      success: true,
      data: {
        before: [{ ciloId: CILO_ID, targetIds: [GO_ID] }],
        after: [{ ciloId: CILO_ID, targetIds: [] }],
        additions: [],
        removals: [{ ciloId: CILO_ID, targetId: GO_ID }],
      },
    });

    mocks.go.count.mockResolvedValue(0);
    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: ["55555555-5555-4555-8555-555555555555"] }],
        freshnessToken: FRESHNESS_TOKEN,
      })
    ).resolves.toEqual({
      success: false,
      error: "Graduate Outcome availability changed. Reload and review the latest mappings.",
    });
  });

  it("commits the complete diff in one transaction and requires fresh state", async () => {
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-faculty-course-alignment");
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [{ ciloId: CILO_ID, targetIds: [] }],
      freshnessToken: FRESHNESS_TOKEN,
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        courseAssignment: mocks.assignment,
        course: { findFirst: vi.fn().mockResolvedValue(course()) },
        gO: mocks.go,
        cILOMapping: { deleteMany: vi.fn(), createMany: vi.fn() },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: { changed: 1 },
    });
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, false)).resolves.toEqual({
      success: false,
      error: "Explicit confirmation is required.",
    });
  });
});
