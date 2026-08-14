import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  assignment: { findFirst: vi.fn() },
  course: { findFirst: vi.fn(), findMany: vi.fn() },
  go: { count: vi.fn(), findMany: vi.fn() },
  ilo: { count: vi.fn(), findMany: vi.fn() },
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
    institutionalOutcome: mocks.ilo,
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
    course_scope: "PROGRAM_SPECIFIC",
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
        cilo_institutional_outcome_mappings: [],
      },
    ],
    ...overrides,
  };
}

const ILO_ID = "66666666-6666-4666-8666-666666666666";

function generalEducationCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    code: "GESTECH",
    title: "Science, Technology and Society",
    course_scope: "GENERAL_EDUCATION",
    program_id: null,
    program: null,
    cilos: [
      {
        id: CILO_ID,
        description: "Analyze science and technology interactions",
        cilo_mappings: [],
        cilo_institutional_outcome_mappings: [
          {
            institutional_outcome_id: ILO_ID,
            institutional_outcome: {
              id: ILO_ID,
              code: "ILO-1",
              description: "Think critically",
              is_active: true,
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("Course alignment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(FACULTY);
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.course.findFirst.mockResolvedValue(course());
    mocks.go.findMany.mockResolvedValue([
      { id: GO_ID, code: "GO-1", description: "Think critically" },
    ]);
    mocks.go.count.mockResolvedValue(1);
    mocks.ilo.findMany.mockResolvedValue([]);
    mocks.ilo.count.mockResolvedValue(0);
  });

  it("returns only the active owning-Program catalog and readiness", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
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
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
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

    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
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
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.assignment.findFirst.mockResolvedValue(null);
    await expect(readCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    mocks.assignment.findFirst.mockResolvedValue({ id: "assignment-1" });
    mocks.course.findFirst.mockResolvedValue(null);
    await expect(readCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
  });

  it("conceals malformed Course IDs before querying assignments", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");

    await expect(readCourseAlignment("not-a-course-id")).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.assignment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a malformed Course ID before preparing an alignment draft", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");

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
      await import("@/features/outcomes/services/manage-course-alignment");

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
      await import("@/features/outcomes/services/manage-course-alignment");
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
      await import("@/features/outcomes/services/manage-course-alignment");
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

  it("serves General Education Courses the shared Institutional Outcome catalog only", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
    mocks.ilo.findMany.mockResolvedValue([
      { id: ILO_ID, code: "ILO-1", description: "Think critically" },
    ]);

    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        course: { id: COURSE_ID, scope: "GENERAL_EDUCATION", program: null },
        targets: [{ id: ILO_ID, code: "ILO-1" }],
        cilos: [{ id: CILO_ID, targetIds: [ILO_ID] }],
        readiness: "ready",
      },
    });
    expect(mocks.ilo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { is_active: true } })
    );
    expect(mocks.go.findMany).not.toHaveBeenCalled();
  });

  it("never mixes Graduate Outcomes into a General Education alignment read", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(
      generalEducationCourse({
        cilos: [
          {
            id: CILO_ID,
            description: "Analyze science and technology interactions",
            cilo_mappings: [{ go_id: GO_ID, go: { id: GO_ID, code: "GO-1", description: "Think critically", is_active: true } }],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      })
    );
    mocks.ilo.findMany.mockResolvedValue([
      { id: ILO_ID, code: "ILO-1", description: "Think critically" },
    ]);

    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        cilos: [{ id: CILO_ID, targetIds: [] }],
        targets: [{ id: ILO_ID }],
        readiness: "incomplete-mapping",
      },
    });
  });

  it("rejects a forged General Education mapping to a Graduate Outcome", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
    const freshness = JSON.stringify([{ ciloId: CILO_ID, targetIds: [ILO_ID] }]);

    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [GO_ID] }],
        freshnessToken: freshness,
      })
    ).resolves.toEqual({
      success: false,
      error: "Institutional Outcome availability changed. Reload and review the latest mappings.",
    });
    expect(mocks.ilo.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [GO_ID] }, is_active: true } })
    );
  });

  it("prepares and commits a General Education ILO diff with actor provenance", async () => {
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
    const freshness = JSON.stringify([{ ciloId: CILO_ID, targetIds: [ILO_ID] }]);
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [{ ciloId: CILO_ID, targetIds: [] }],
      freshnessToken: freshness,
    });
    expect(reviewResult).toMatchObject({
      success: true,
      data: {
        before: [{ ciloId: CILO_ID, targetIds: [ILO_ID] }],
        after: [{ ciloId: CILO_ID, targetIds: [] }],
        additions: [],
        removals: [{ ciloId: CILO_ID, targetId: ILO_ID }],
      },
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    const deleteMany = vi.fn();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        courseAssignment: mocks.assignment,
        course: { findFirst: vi.fn().mockResolvedValue(generalEducationCourse()) },
        gO: mocks.go,
        institutionalOutcome: mocks.ilo,
        cILOInstitutionalOutcomeMapping: { deleteMany, createMany: vi.fn() },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: { changed: 1 },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ cilo_id: CILO_ID, institutional_outcome_id: ILO_ID }],
      },
    });
  });

  it("serves Secretary college-wide reads without consulting assignments", async () => {
    const SECRETARY = { userId: "secretary-1", activeRole: ROLES.SECRETARY, roles: [ROLES.SECRETARY] };
    mocks.session.mockResolvedValue(SECRETARY);
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");

    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        course: { id: COURSE_ID, program: { id: PROGRAM_ID } },
        cilos: [{ id: CILO_ID, targetIds: [GO_ID] }],
        readiness: "ready",
      },
    });
    expect(mocks.assignment.findFirst).not.toHaveBeenCalled();
  });

  it("denies Program Head and Dean alignment reads without reading state", async () => {
    const PROGRAM_HEAD = {
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    };
    mocks.session.mockResolvedValue(PROGRAM_HEAD);
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");

    await expect(readCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.assignment.findFirst).not.toHaveBeenCalled();
    expect(mocks.course.findFirst).not.toHaveBeenCalled();

    mocks.session.mockResolvedValue({ userId: "dean-1", activeRole: ROLES.DEAN, roles: [ROLES.DEAN] });
    await expect(readCourseAlignment(COURSE_ID)).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.course.findFirst).not.toHaveBeenCalled();
  });

  it("prepares and commits a Secretary correction with actor provenance", async () => {
    const SECRETARY = { userId: "secretary-1", activeRole: ROLES.SECRETARY, roles: [ROLES.SECRETARY] };
    mocks.session.mockResolvedValue(SECRETARY);
    const NEW_GO_ID = "77777777-7777-4777-8777-777777777777";
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [
        { ciloId: CILO_ID, targetIds: [GO_ID, NEW_GO_ID] },
      ],
      freshnessToken: FRESHNESS_TOKEN,
    });
    expect(reviewResult).toMatchObject({
      success: true,
      data: {
        additions: [{ ciloId: CILO_ID, targetId: NEW_GO_ID }],
        removals: [],
      },
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    const createMany = vi.fn();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        courseAssignment: mocks.assignment,
        course: { findFirst: vi.fn().mockResolvedValue(course()) },
        gO: mocks.go,
        cILOMapping: { deleteMany: vi.fn(), createMany },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: { changed: 1 },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          cilo_id: CILO_ID,
          go_id: NEW_GO_ID,
          created_by: "secretary-1",
          updated_by: "secretary-1",
        },
      ],
    });
  });

  it("lists Secretary college-wide alignment summaries by readiness", async () => {
    const SECRETARY = { userId: "secretary-1", activeRole: ROLES.SECRETARY, roles: [ROLES.SECRETARY] };
    mocks.session.mockResolvedValue(SECRETARY);
    mocks.course.findMany.mockResolvedValue([
      {
        id: "course-ge",
        code: "GESTECH",
        title: "Science, Technology and Society",
        course_scope: "GENERAL_EDUCATION",
        program: null,
        cilos: [
          {
            id: "cilo-ge",
            cilo_mappings: [],
            cilo_institutional_outcome_mappings: [
              { institutional_outcome: { id: ILO_ID, is_active: true } },
            ],
          },
        ],
      },
      {
        id: "course-ps",
        code: "CS101",
        title: "Computing",
        course_scope: "PROGRAM_SPECIFIC",
        program_id: PROGRAM_ID,
        program: { id: PROGRAM_ID, code: "BSCS", name: "Computer Science" },
        cilos: [
          {
            id: "cilo-ok",
            cilo_mappings: [{ go: { id: GO_ID, is_active: true, program_id: PROGRAM_ID } }],
            cilo_institutional_outcome_mappings: [],
          },
          {
            id: "cilo-gap",
            cilo_mappings: [],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      },
    ]);
    const { listCourseAlignmentSummaries } =
      await import("@/features/outcomes/services/manage-course-alignment");

    await expect(listCourseAlignmentSummaries()).resolves.toEqual({
      success: true,
      data: [
        {
          courseId: "course-ge",
          code: "GESTECH",
          title: "Science, Technology and Society",
          scope: "GENERAL_EDUCATION",
          program: null,
          ciloCount: 1,
          alignedCiloCount: 1,
          readiness: "ready",
        },
        {
          courseId: "course-ps",
          code: "CS101",
          title: "Computing",
          scope: "PROGRAM_SPECIFIC",
          program: { id: PROGRAM_ID, code: "BSCS", name: "Computer Science" },
          ciloCount: 2,
          alignedCiloCount: 1,
          readiness: "incomplete-mapping",
        },
      ],
    });
  });

  it("denies non-Secretary alignment summaries without reading courses", async () => {
    mocks.session.mockResolvedValue({ userId: "dean-1", activeRole: ROLES.DEAN, roles: [ROLES.DEAN] });
    const { listCourseAlignmentSummaries } =
      await import("@/features/outcomes/services/manage-course-alignment");

    await expect(listCourseAlignmentSummaries()).resolves.toEqual({
      success: false,
      error: "Course alignment is unavailable.",
    });
    expect(mocks.course.findMany).not.toHaveBeenCalled();
  });
});
