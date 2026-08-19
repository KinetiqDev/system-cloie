import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  assignment: { findFirst: vi.fn() },
  course: { findFirst: vi.fn(), findMany: vi.fn() },
  plo: { count: vi.fn(), findMany: vi.fn() },
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
    pLO: mocks.plo,
    institutionalOutcome: mocks.ilo,
    $transaction: mocks.transaction,
  },
}));

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const PLO_ID = "33333333-3333-4333-8333-333333333333";
const PROGRAM_ID = "44444444-4444-4444-8444-444444444444";
const FACULTY = { userId: "faculty-1", activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY] };
const FRESHNESS_TOKEN = JSON.stringify({
  ciloIds: [CILO_ID],
  catalogIds: [PLO_ID],
  mappings: [{ ciloId: CILO_ID, targetId: PLO_ID, manifestation: null }],
});

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
            plo_id: PLO_ID,
            plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true },
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
    mocks.plo.findMany.mockResolvedValue([
      { id: PLO_ID, code: "GO-1", description: "Think critically" },
    ]);
    mocks.plo.count.mockResolvedValue(1);
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
        targets: [{ id: PLO_ID }],
        cilos: [{ id: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: null }] }],
        readiness: "ready",
      },
    });
    expect(mocks.plo.findMany).toHaveBeenCalledWith(
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
                plo_id: PLO_ID,
                plo: {
                  id: PLO_ID,
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
    mocks.plo.findMany.mockResolvedValue([]);

    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        cilos: [{ id: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: null }] }],
        targets: [],
        unavailableTargets: [{ id: PLO_ID, code: "GO-1" }],
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
    expect(mocks.plo.count).not.toHaveBeenCalled();
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
        before: [{ ciloId: CILO_ID, targetIds: [PLO_ID] }],
        after: [{ ciloId: CILO_ID, targetIds: [] }],
        additions: [],
        removals: [{ ciloId: CILO_ID, targetId: PLO_ID }],
      },
    });

    mocks.plo.count.mockResolvedValue(0);
    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: ["55555555-5555-4555-8555-555555555555"] }],
        freshnessToken: FRESHNESS_TOKEN,
      })
    ).resolves.toEqual({
      success: false,
      error: "Program Learning Outcome availability changed. Reload and review the latest mappings.",
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
        pLO: mocks.plo,
        cILOMapping: { deleteMany: vi.fn(), createMany: vi.fn() },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: {
        changed: 1,
        freshnessToken: JSON.stringify({
          ciloIds: [CILO_ID],
          catalogIds: [PLO_ID],
          mappings: [],
        }),
      },
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
    expect(mocks.plo.findMany).not.toHaveBeenCalled();
  });

  it("never mixes Program Learning Outcomes into a General Education alignment read", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(
      generalEducationCourse({
        cilos: [
          {
            id: CILO_ID,
            description: "Analyze science and technology interactions",
            cilo_mappings: [{ plo_id: PLO_ID, plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true } }],
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

  it("rejects a forged General Education mapping to a Program Learning Outcome", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
    mocks.ilo.findMany.mockResolvedValue([
      { id: ILO_ID, code: "ILO-1", description: "Think critically" },
    ]);
    const freshness = JSON.stringify({
      ciloIds: [CILO_ID],
      catalogIds: [ILO_ID],
      mappings: [{ ciloId: CILO_ID, targetId: ILO_ID, manifestation: null }],
    });

    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [PLO_ID] }],
        freshnessToken: freshness,
      })
    ).resolves.toEqual({
      success: false,
      error: "Institutional Outcome availability changed. Reload and review the latest mappings.",
    });
    expect(mocks.ilo.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [PLO_ID] }, is_active: true } })
    );
  });

  it("prepares and commits a General Education ILO diff with actor provenance", async () => {
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
    mocks.ilo.findMany.mockResolvedValue([
      { id: ILO_ID, code: "ILO-1", description: "Think critically" },
    ]);
    const freshness = JSON.stringify({
      ciloIds: [CILO_ID],
      catalogIds: [ILO_ID],
      mappings: [{ ciloId: CILO_ID, targetId: ILO_ID, manifestation: null }],
    });
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
        pLO: mocks.plo,
        institutionalOutcome: mocks.ilo,
        cILOInstitutionalOutcomeMapping: { deleteMany, createMany: vi.fn() },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: {
        changed: 1,
        freshnessToken: JSON.stringify({
          ciloIds: [CILO_ID],
          catalogIds: [ILO_ID],
          mappings: [],
        }),
      },
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
        cilos: [{ id: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: null }] }],
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
    const NEW_PLO_ID = "77777777-7777-4777-8777-777777777777";
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [
        { ciloId: CILO_ID, targetIds: [PLO_ID, NEW_PLO_ID] },
      ],
      freshnessToken: FRESHNESS_TOKEN,
    });
    expect(reviewResult).toMatchObject({
      success: true,
      data: {
        additions: [{ ciloId: CILO_ID, targetId: NEW_PLO_ID }],
        removals: [],
      },
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    const createMany = vi.fn();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        courseAssignment: mocks.assignment,
        course: { findFirst: vi.fn().mockResolvedValue(course()) },
        pLO: mocks.plo,
        cILOMapping: { deleteMany: vi.fn(), createMany },
      })
    );
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: {
        changed: 1,
        freshnessToken: JSON.stringify({
          ciloIds: [CILO_ID],
          catalogIds: [PLO_ID],
          mappings: [
            { ciloId: CILO_ID, targetId: PLO_ID, manifestation: null },
            { ciloId: CILO_ID, targetId: NEW_PLO_ID, manifestation: null },
          ],
        }),
      },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          cilo_id: CILO_ID,
          plo_id: NEW_PLO_ID,
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
            cilo_mappings: [{ plo: { id: PLO_ID, is_active: true, program_id: PROGRAM_ID } }],
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

  it("surfaces classified and legacy manifestations per pairing", async () => {
    const SECOND_PLO_ID = "55555555-5555-4555-8555-555555555555";
    mocks.course.findFirst.mockResolvedValue(
      course({
        cilos: [
          {
            id: CILO_ID,
            description: "Apply core concepts",
            cilo_mappings: [
              {
                plo_id: PLO_ID,
                manifestation: "LEARNING",
                plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true },
              },
              {
                plo_id: SECOND_PLO_ID,
                manifestation: null,
                plo: { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate", is_active: true },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      })
    );
    mocks.plo.findMany.mockResolvedValue([
      { id: PLO_ID, code: "GO-1", description: "Think critically" },
      { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
    ]);

    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    await expect(readCourseAlignment(COURSE_ID)).resolves.toMatchObject({
      success: true,
      data: {
        cilos: [
          {
            id: CILO_ID,
            mappings: [
              { ploId: PLO_ID, manifestation: "LEARNING" },
              { ploId: SECOND_PLO_ID, manifestation: null },
            ],
          },
        ],
      },
    });
  });

  it("keeps the freshness token stable while nothing observable changed", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const first = await readCourseAlignment(COURSE_ID);
    const second = await readCourseAlignment(COURSE_ID);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) throw new Error("expected successful reads");
    expect(first.data.freshnessToken).toBe(second.data.freshnessToken);
  });

  it("invalidates the token when a manifestation changes", async () => {
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const classifiedCourse = (overrides: Record<string, unknown> = {}) =>
      course({
        cilos: [
          {
            id: CILO_ID,
            description: "Apply core concepts",
            cilo_mappings: [
              {
                plo_id: PLO_ID,
                manifestation: "LEARNING",
                plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
        ],
        ...overrides,
      });
    mocks.course.findFirst.mockResolvedValue(classifiedCourse());
    const learning = await readCourseAlignment(COURSE_ID);
    mocks.course.findFirst.mockResolvedValue(
      classifiedCourse({ cilos: [{ id: CILO_ID, cilo_mappings: [{ plo_id: PLO_ID, manifestation: "PRACTICE", plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true } }], cilo_institutional_outcome_mappings: [] }] })
    );
    const practice = await readCourseAlignment(COURSE_ID);
    expect(learning.success).toBe(true);
    expect(practice.success).toBe(true);
    if (!learning.success || !practice.success) throw new Error("expected successful reads");
    expect(learning.data.freshnessToken).not.toBe(practice.data.freshnessToken);
  });

  it("invalidates the token when pair membership changes", async () => {
    const SECOND_PLO_ID = "55555555-5555-4555-8555-555555555555";
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(course());
    mocks.plo.findMany.mockResolvedValue([
      { id: PLO_ID, code: "GO-1", description: "Think critically" },
      { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
    ]);
    const before = await readCourseAlignment(COURSE_ID);
    mocks.course.findFirst.mockResolvedValue(
      course({
        cilos: [
          {
            id: CILO_ID,
            description: "Apply core concepts",
            cilo_mappings: [
              {
                plo_id: PLO_ID,
                plo: { id: PLO_ID, code: "GO-1", description: "Think critically", is_active: true },
              },
              {
                plo_id: SECOND_PLO_ID,
                plo: { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate", is_active: true },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      })
    );
    const after = await readCourseAlignment(COURSE_ID);
    expect(before.success).toBe(true);
    expect(after.success).toBe(true);
    if (!before.success || !after.success) throw new Error("expected successful reads");
    expect(before.data.freshnessToken).not.toBe(after.data.freshnessToken);
  });

  it("invalidates the token when catalog membership changes", async () => {
    const NEW_PLO_ID = "55555555-5555-4555-8555-555555555555";
    const { readCourseAlignment } =
      await import("@/features/outcomes/services/manage-course-alignment");
    mocks.course.findFirst.mockResolvedValue(course());
    const before = await readCourseAlignment(COURSE_ID);
    mocks.plo.findMany.mockResolvedValue([
      { id: PLO_ID, code: "GO-1", description: "Think critically" },
      { id: NEW_PLO_ID, code: "GO-3", description: "Collaborate" },
    ]);
    const after = await readCourseAlignment(COURSE_ID);
    expect(before.success).toBe(true);
    expect(after.success).toBe(true);
    if (!before.success || !after.success) throw new Error("expected successful reads");
    expect(before.data.freshnessToken).not.toBe(after.data.freshnessToken);
  });
});
