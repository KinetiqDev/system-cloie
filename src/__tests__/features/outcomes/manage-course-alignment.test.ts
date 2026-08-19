import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import type { CourseAlignmentReview } from "@/features/outcomes/services/manage-course-alignment";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  assignment: { findFirst: vi.fn() },
  course: { findFirst: vi.fn(), findMany: vi.fn() },
  plo: { count: vi.fn(), findMany: vi.fn() },
  ilo: { count: vi.fn(), findMany: vi.fn() },
  transaction: vi.fn(),
  ciloMapping: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
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
vi.mock("@/lib/utils/confirmation-secret", () => ({
  getConfirmationSecret: () => "test-confirmation-secret",
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

const SECOND_PLO_ID = "55555555-5555-4555-8555-555555555555";
const ARCHIVED_PLO_ID = "77777777-7777-4777-8777-777777777777";
const FOREIGN_PLO_ID = "88888888-8888-4888-8888-888888888888";

function emptyCourse(overrides: Record<string, unknown> = {}) {
  return course({
    cilos: [
      {
        id: CILO_ID,
        description: "Apply core concepts",
        cilo_mappings: [],
        cilo_institutional_outcome_mappings: [],
      },
    ],
    ...overrides,
  });
}

function classifiedCourse(
  ploId: string,
  manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY",
  overrides: Record<string, unknown> = {}
) {
  return course({
    cilos: [
      {
        id: CILO_ID,
        description: "Apply core concepts",
        cilo_mappings: [
          {
            plo_id: ploId,
            manifestation,
            plo: {
              id: ploId,
              code: "GO-1",
              description: "Think critically",
              is_active: true,
            },
          },
        ],
        cilo_institutional_outcome_mappings: [],
      },
    ],
    ...overrides,
  });
}

function tokenFor(
  ciloIds: string[],
  catalogIds: string[],
  mappings: Array<{ ciloId: string; targetId: string; manifestation: string | null }>
): string {
  return JSON.stringify({
    ciloIds: [...ciloIds].sort((left, right) => left.localeCompare(right)),
    catalogIds: [...catalogIds].sort((left, right) => left.localeCompare(right)),
    mappings: [...mappings].sort(
      (left, right) =>
        left.ciloId.localeCompare(right.ciloId) || left.targetId.localeCompare(right.targetId)
    ),
  });
}

const CLASSIFIED_TOKEN = tokenFor([CILO_ID], [PLO_ID], [
  { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "LEARNING" },
]);

function signedReview(
  unsigned:
    | Omit<Extract<CourseAlignmentReview, { scope: "GENERAL_EDUCATION" }>, "signature">
    | Omit<Extract<CourseAlignmentReview, { scope: "PROGRAM_SPECIFIC" }>, "signature">,
  userId: string
): CourseAlignmentReview {
  return {
    ...unsigned,
    signature: createHmac("sha256", getConfirmationSecret())
      .update(JSON.stringify({ ...unsigned, userId }))
      .digest("hex"),
  };
}

function pspTxMock(courseFixture: Record<string, unknown>) {
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      courseAssignment: mocks.assignment,
      course: { findFirst: vi.fn().mockResolvedValue(courseFixture) },
      pLO: mocks.plo,
      cILOMapping: mocks.ciloMapping,
    })
  );
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

  it("prepares the exact manifestation diff and rejects targets outside the active Program catalog", async () => {
    const { prepareCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const review = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [
        { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "PRACTICE" as const }] },
      ],
      freshnessToken: FRESHNESS_TOKEN,
    });
    expect(review).toMatchObject({
      success: true,
      data: {
        scope: "PROGRAM_SPECIFIC",
        before: [{ ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: null }] }],
        after: [{ ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "PRACTICE" }] }],
        additions: [],
        updates: [{ ciloId: CILO_ID, ploId: PLO_ID, from: null, to: "PRACTICE" }],
        removals: [],
      },
    });

    await expect(
      prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [
          {
            ciloId: CILO_ID,
            mappings: [{ ploId: FOREIGN_PLO_ID, manifestation: "LEARNING" as const }],
          },
        ],
        freshnessToken: FRESHNESS_TOKEN,
      })
    ).resolves.toEqual({
      success: false,
      error:
        "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
    });
  });

  it("commits the complete manifestation diff in one transaction and requires fresh state", async () => {
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [
        { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "OPPORTUNITY" as const }] },
      ],
      freshnessToken: FRESHNESS_TOKEN,
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    pspTxMock(course());
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: {
        changed: 1,
        freshnessToken: tokenFor([CILO_ID], [PLO_ID], [
          { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "OPPORTUNITY" },
        ]),
      },
    });
    expect(mocks.ciloMapping.updateMany).toHaveBeenCalledWith({
      where: { cilo_id: CILO_ID, plo_id: PLO_ID },
      data: {
        manifestation: "OPPORTUNITY",
        updated_by: "faculty-1",
        updated_at: expect.any(Date),
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
    mocks.course.findFirst.mockResolvedValue(emptyCourse());
    const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
      await import("@/features/outcomes/services/manage-course-alignment");
    const reviewResult = await prepareCourseAlignmentWrite({
      courseId: COURSE_ID,
      desired: [
        { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" as const }] },
      ],
      freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
    });
    expect(reviewResult).toMatchObject({
      success: true,
      data: {
        scope: "PROGRAM_SPECIFIC",
        before: [{ ciloId: CILO_ID, mappings: [] }],
        additions: [{ ciloId: CILO_ID, ploId: PLO_ID, manifestation: "LEARNING" }],
        updates: [],
        removals: [],
      },
    });
    if (!reviewResult.success) throw new Error(reviewResult.error);
    pspTxMock(emptyCourse());
    await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
      success: true,
      data: {
        changed: 1,
        freshnessToken: tokenFor([CILO_ID], [PLO_ID], [
          { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "LEARNING" },
        ]),
      },
    });
    expect(mocks.ciloMapping.createMany).toHaveBeenCalledWith({
      data: [
        {
          cilo_id: CILO_ID,
          plo_id: PLO_ID,
          manifestation: "LEARNING",
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
        program: {
          id: PROGRAM_ID,
          code: "BSCS",
          name: "Computer Science",
          plos: [{ id: PLO_ID }],
        },
        cilos: [
          {
            id: "cilo-ok",
            cilo_mappings: [
              {
                manifestation: "LEARNING",
                plo: { id: PLO_ID, is_active: true, program_id: PROGRAM_ID },
              },
            ],
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

  describe("manifestation draft saves", () => {
    beforeEach(() => {
      mocks.ciloMapping.createMany.mockResolvedValue({ count: 1 });
      mocks.ciloMapping.updateMany.mockResolvedValue({ count: 1 });
      mocks.ciloMapping.deleteMany.mockResolvedValue({ count: 1 });
    });

    it("persists only the classified cells and leaves unanswered pairs absent", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      mocks.plo.findMany.mockResolvedValue([
        { id: PLO_ID, code: "GO-1", description: "Think critically" },
        { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
      ]);
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(emptyCourse());

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], []),
        })
      ).resolves.toEqual({
        success: true,
        data: {
          changed: 1,
          freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], [
            { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "LEARNING" },
          ]),
        },
      });
      expect(mocks.ciloMapping.createMany).toHaveBeenCalledWith({
        data: [
          {
            cilo_id: CILO_ID,
            plo_id: PLO_ID,
            manifestation: "LEARNING",
            created_by: "faculty-1",
            updated_by: "faculty-1",
          },
        ],
      });
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
    });

    it("removes the mapping row when a classified cell is cleared", async () => {
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING"));
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(classifiedCourse(PLO_ID, "LEARNING"));

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [{ ciloId: CILO_ID, mappings: [] }],
          freshnessToken: CLASSIFIED_TOKEN,
        })
      ).resolves.toEqual({
        success: true,
        data: {
          changed: 1,
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
      });
      expect(mocks.ciloMapping.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ cilo_id: CILO_ID, plo_id: PLO_ID }] },
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
    });

    it("updates the existing row with provenance when a manifestation changes", async () => {
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING"));
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(classifiedCourse(PLO_ID, "LEARNING"));

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "PRACTICE" }] },
          ],
          freshnessToken: CLASSIFIED_TOKEN,
        })
      ).resolves.toEqual({
        success: true,
        data: {
          changed: 1,
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], [
            { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "PRACTICE" },
          ]),
        },
      });
      expect(mocks.ciloMapping.updateMany).toHaveBeenCalledWith({
        where: { cilo_id: CILO_ID, plo_id: PLO_ID },
        data: {
          manifestation: "PRACTICE",
          updated_by: "faculty-1",
          updated_at: expect.any(Date),
        },
      });
    });

    it("skips writes entirely when no cell changed", async () => {
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING"));
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(classifiedCourse(PLO_ID, "LEARNING"));

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
          ],
          freshnessToken: CLASSIFIED_TOKEN,
        })
      ).resolves.toEqual({
        success: true,
        data: {
          changed: 0,
          freshnessToken: CLASSIFIED_TOKEN,
        },
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
    });

    it("rejects a stale draft save with a reload requirement", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(emptyCourse());

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [{ ciloId: CILO_ID, mappings: [] }],
          freshnessToken: "outdated",
        })
      ).resolves.toEqual({
        success: false,
        error: "Course alignment changed. Reload and review the latest mappings.",
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
    });

    it("rejects draft saves for General Education Courses", async () => {
      mocks.course.findFirst.mockResolvedValue(generalEducationCourse());
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [{ ciloId: CILO_ID, mappings: [] }],
          freshnessToken: "anything",
        })
      ).resolves.toEqual({
        success: false,
        error: "Draft saves are available only for Program-specific Course alignments.",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects foreign CILOs, pairs outside the active catalog, and duplicate pairs", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            { ciloId: FOREIGN_PLO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Submit a complete alignment for every active CILO.",
      });

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            { ciloId: CILO_ID, mappings: [{ ploId: FOREIGN_PLO_ID, manifestation: "LEARNING" }] },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error:
          "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
      });

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [
            {
              ciloId: CILO_ID,
              mappings: [
                { ploId: PLO_ID, manifestation: "LEARNING" },
                { ploId: PLO_ID, manifestation: "PRACTICE" },
              ],
            },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Submit each CILO-to-PLO pair exactly once.",
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
    });

    it("never deletes rows on archived outcomes", async () => {
      mocks.course.findFirst.mockResolvedValue(
        course({
          cilos: [
            {
              id: CILO_ID,
              description: "Apply core concepts",
              cilo_mappings: [
                {
                  plo_id: ARCHIVED_PLO_ID,
                  manifestation: "LEARNING",
                  plo: {
                    id: ARCHIVED_PLO_ID,
                    code: "GO-9",
                    description: "Retired outcome",
                    is_active: false,
                  },
                },
                {
                  plo_id: PLO_ID,
                  manifestation: "LEARNING",
                  plo: {
                    id: PLO_ID,
                    code: "GO-1",
                    description: "Think critically",
                    is_active: true,
                  },
                },
              ],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        })
      );
      const { saveDraftCourseAlignment } =
        await import("@/features/outcomes/services/manage-course-alignment");
      pspTxMock(
        course({
          cilos: [
            {
              id: CILO_ID,
              description: "Apply core concepts",
              cilo_mappings: [
                {
                  plo_id: ARCHIVED_PLO_ID,
                  manifestation: "LEARNING",
                  plo: {
                    id: ARCHIVED_PLO_ID,
                    code: "GO-9",
                    description: "Retired outcome",
                    is_active: false,
                  },
                },
                {
                  plo_id: PLO_ID,
                  manifestation: "LEARNING",
                  plo: {
                    id: PLO_ID,
                    code: "GO-1",
                    description: "Think critically",
                    is_active: true,
                  },
                },
              ],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        })
      );

      await expect(
        saveDraftCourseAlignment({
          courseId: COURSE_ID,
          cells: [{ ciloId: CILO_ID, mappings: [] }],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], [
            { ciloId: CILO_ID, targetId: ARCHIVED_PLO_ID, manifestation: "LEARNING" },
            { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "LEARNING" },
          ]),
        })
      ).resolves.toEqual({
        success: true,
        data: {
          changed: 1,
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], [
            { ciloId: CILO_ID, targetId: ARCHIVED_PLO_ID, manifestation: "LEARNING" },
          ]),
        },
      });
      expect(mocks.ciloMapping.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ cilo_id: CILO_ID, plo_id: PLO_ID }] },
      });
    });
  });

  describe("exhaustive manifestation commit", () => {
    it("rejects an incomplete alignment with a completeness message", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      mocks.plo.findMany.mockResolvedValue([
        { id: PLO_ID, code: "GO-1", description: "Think critically" },
        { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
      ]);
      const { prepareCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        prepareCourseAlignmentWrite({
          courseId: COURSE_ID,
          desired: [
            {
              ciloId: CILO_ID,
              mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }],
            },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Complete every required CILO-to-PLO pair before committing.",
      });
    });

    it("rejects duplicate pairs and a missing manifestation at prepare", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { prepareCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        prepareCourseAlignmentWrite({
          courseId: COURSE_ID,
          desired: [
            {
              ciloId: CILO_ID,
              mappings: [
                { ploId: PLO_ID, manifestation: "LEARNING" },
                { ploId: PLO_ID, manifestation: "PRACTICE" },
              ],
            },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Submit each CILO-to-PLO pair exactly once.",
      });
    });

    it("rejects a foreign CILO and a target outside the owning Program at prepare", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { prepareCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        prepareCourseAlignmentWrite({
          courseId: COURSE_ID,
          desired: [
            { ciloId: FOREIGN_PLO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Submit a complete alignment for every active CILO.",
      });

      await expect(
        prepareCourseAlignmentWrite({
          courseId: COURSE_ID,
          desired: [
            {
              ciloId: CILO_ID,
              mappings: [{ ploId: FOREIGN_PLO_ID, manifestation: "LEARNING" }],
            },
          ],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error:
          "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
      });
    });

    it("rejects legacy checkbox-shaped program writes with a manifestation message", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { prepareCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");

      await expect(
        prepareCourseAlignmentWrite({
          courseId: COURSE_ID,
          desired: [{ ciloId: CILO_ID, targetIds: [PLO_ID] }],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        })
      ).resolves.toEqual({
        success: false,
        error: "Manifestations are required for every CILO-to-PLO pair.",
      });
    });

    it("revalidates missing pairs scope at commit time", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      mocks.plo.findMany.mockResolvedValue([
        { id: PLO_ID, code: "GO-1", description: "Think critically" },
        { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
      ]);
      const { commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const crafted = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
          ],
          additions: [{ ciloId: CILO_ID, ploId: PLO_ID, manifestation: "LEARNING" }],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], []),
        },
        "faculty-1"
      );
      pspTxMock(emptyCourse());

      await expect(commitCourseAlignmentWrite(crafted, true)).resolves.toEqual({
        success: false,
        error: "Complete every required CILO-to-PLO pair before committing.",
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
    });

    it("rejects crafted duplicate, out-of-Program, and null-manifestation reviews", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const duplicate = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            {
              ciloId: CILO_ID,
              mappings: [
                { ploId: PLO_ID, manifestation: "LEARNING" },
                { ploId: PLO_ID, manifestation: "PRACTICE" },
              ],
            },
          ],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
        "faculty-1"
      );
      pspTxMock(emptyCourse());
      await expect(commitCourseAlignmentWrite(duplicate, true)).resolves.toEqual({
        success: false,
        error: "Submit each CILO-to-PLO pair exactly once.",
      });

      const crossProgram = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            {
              ciloId: CILO_ID,
              mappings: [{ ploId: FOREIGN_PLO_ID, manifestation: "LEARNING" }],
            },
          ],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
        "faculty-1"
      );
      await expect(commitCourseAlignmentWrite(crossProgram, true)).resolves.toEqual({
        success: false,
        error:
          "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
      });

      const nullManifestation = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [{ ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: null }] }],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
        "faculty-1"
      );
      await expect(commitCourseAlignmentWrite(nullManifestation, true)).resolves.toEqual({
        success: false,
        error:
          "Every required CILO-to-PLO pair needs a LEARNING, PRACTICE, or OPPORTUNITY manifestation.",
      });

      const foreignCilo = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            {
              ciloId: FOREIGN_PLO_ID,
              mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }],
            },
          ],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
        "faculty-1"
      );
      await expect(commitCourseAlignmentWrite(foreignCilo, true)).resolves.toEqual({
        success: false,
        error: "Submit a complete alignment for every active CILO.",
      });

      const inactivePlo = signedReview(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            {
              ciloId: CILO_ID,
              mappings: [{ ploId: ARCHIVED_PLO_ID, manifestation: "LEARNING" }],
            },
          ],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
        },
        "faculty-1"
      );
      await expect(commitCourseAlignmentWrite(inactivePlo, true)).resolves.toEqual({
        success: false,
        error:
          "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
      });
    });

    it("rejects a stale commit when another writer changed a manifestation", async () => {
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING"));
      const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const reviewResult = await prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [
          { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "PRACTICE" }] },
        ],
        freshnessToken: CLASSIFIED_TOKEN,
      });
      if (!reviewResult.success) throw new Error(reviewResult.error);

      pspTxMock(classifiedCourse(PLO_ID, "OPPORTUNITY"));
      await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
        success: false,
        error: "Course alignment changed after review. Reload and review the latest mappings.",
      });
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
    });

    it("never touches archived rows when committing active-pair changes", async () => {
      mocks.plo.findMany.mockResolvedValue([
        { id: PLO_ID, code: "GO-1", description: "Think critically" },
        { id: SECOND_PLO_ID, code: "GO-2", description: "Communicate" },
      ]);
      const archivedFixture = {
        cilos: [
          {
            id: CILO_ID,
            description: "Apply core concepts",
            cilo_mappings: [
              {
                plo_id: ARCHIVED_PLO_ID,
                manifestation: "LEARNING",
                plo: {
                  id: ARCHIVED_PLO_ID,
                  code: "GO-9",
                  description: "Retired outcome",
                  is_active: false,
                },
              },
              {
                plo_id: PLO_ID,
                manifestation: "LEARNING",
                plo: {
                  id: PLO_ID,
                  code: "GO-1",
                  description: "Think critically",
                  is_active: true,
                },
              },
              {
                plo_id: SECOND_PLO_ID,
                manifestation: "LEARNING",
                plo: {
                  id: SECOND_PLO_ID,
                  code: "GO-2",
                  description: "Communicate",
                  is_active: true,
                },
              },
            ],
            cilo_institutional_outcome_mappings: [],
          },
        ],
      };
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING", archivedFixture));
      const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const reviewResult = await prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [
          {
            ciloId: CILO_ID,
            mappings: [
              { ploId: PLO_ID, manifestation: "PRACTICE" },
              { ploId: SECOND_PLO_ID, manifestation: "LEARNING" },
            ],
          },
        ],
        freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], [
          { ciloId: CILO_ID, targetId: ARCHIVED_PLO_ID, manifestation: "LEARNING" },
          { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "LEARNING" },
          { ciloId: CILO_ID, targetId: SECOND_PLO_ID, manifestation: "LEARNING" },
        ]),
      });
      expect(reviewResult).toMatchObject({
        data: {
          before: [
            {
              ciloId: CILO_ID,
              mappings: [
                { ploId: PLO_ID, manifestation: "LEARNING" },
                { ploId: SECOND_PLO_ID, manifestation: "LEARNING" },
              ],
            },
          ],
          updates: [{ ciloId: CILO_ID, ploId: PLO_ID, from: "LEARNING", to: "PRACTICE" }],
          removals: [],
        },
      });
      if (!reviewResult.success) throw new Error(reviewResult.error);
      pspTxMock(classifiedCourse(PLO_ID, "LEARNING", archivedFixture));
      await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
        success: true,
        data: {
          changed: 1,
          freshnessToken: tokenFor([CILO_ID], [PLO_ID, SECOND_PLO_ID], [
            { ciloId: CILO_ID, targetId: ARCHIVED_PLO_ID, manifestation: "LEARNING" },
            { ciloId: CILO_ID, targetId: PLO_ID, manifestation: "PRACTICE" },
            { ciloId: CILO_ID, targetId: SECOND_PLO_ID, manifestation: "LEARNING" },
          ]),
        },
      });
      expect(mocks.ciloMapping.updateMany).toHaveBeenCalledWith({
        where: { cilo_id: CILO_ID, plo_id: PLO_ID },
        data: {
          manifestation: "PRACTICE",
          updated_by: "faculty-1",
          updated_at: expect.any(Date),
        },
      });
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
    });

    it("commits a no-op review without touching any row", async () => {
      mocks.course.findFirst.mockResolvedValue(classifiedCourse(PLO_ID, "LEARNING"));
      const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const reviewResult = await prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [
          { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
        ],
        freshnessToken: CLASSIFIED_TOKEN,
      });
      if (!reviewResult.success) throw new Error(reviewResult.error);
      pspTxMock(classifiedCourse(PLO_ID, "LEARNING"));

      await expect(commitCourseAlignmentWrite(reviewResult.data, true)).resolves.toEqual({
        success: true,
        data: { changed: 0, freshnessToken: CLASSIFIED_TOKEN },
      });
      expect(mocks.ciloMapping.createMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.updateMany).not.toHaveBeenCalled();
      expect(mocks.ciloMapping.deleteMany).not.toHaveBeenCalled();
    });

    it("rejects a forged review payload before opening a transaction", async () => {
      mocks.course.findFirst.mockResolvedValue(emptyCourse());
      const { prepareCourseAlignmentWrite, commitCourseAlignmentWrite } =
        await import("@/features/outcomes/services/manage-course-alignment");
      const reviewResult = await prepareCourseAlignmentWrite({
        courseId: COURSE_ID,
        desired: [
          { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "LEARNING" }] },
        ],
        freshnessToken: tokenFor([CILO_ID], [PLO_ID], []),
      });
      if (!reviewResult.success) throw new Error(reviewResult.error);
      const forged = {
        ...reviewResult.data,
        after: [
          { ciloId: CILO_ID, mappings: [{ ploId: PLO_ID, manifestation: "PRACTICE" }] },
        ],
      } as CourseAlignmentReview;
      await expect(commitCourseAlignmentWrite(forged, true)).resolves.toEqual({
        success: false,
        error: "Course alignment is unavailable.",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });
  });
});
