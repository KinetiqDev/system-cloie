import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, readinessMock, readinessTotalsMock } = vi.hoisted(() => ({
  prismaMock: {
    academicTermInstance: { findFirst: vi.fn(), findUnique: vi.fn() },
    courseAssignment: { findMany: vi.fn(), findFirst: vi.fn() },
    studentEnrollment: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    institutionalOutcome: { findMany: vi.fn() },
  },
  readinessMock: vi.fn(),
  readinessTotalsMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/academic-calendar/services/read-period-readiness", () => ({
  readPeriodReadiness: readinessMock,
  readPeriodReadinessTotals: readinessTotalsMock,
}));

import {
  DeanReadModelNotFoundError,
  getDeanDashboard,
  getDeanEnrollments,
  getDeanLearningOutcomes,
  getDeanRoster,
  getDeanRosterPage,
} from "@/features/dean/services/read-dean-oversight";

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";

function period(status: "ACTIVE" | "COMPLETED" = "ACTIVE") {
  return {
    id: PERIOD_ID,
    status,
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { code: "2025-2026" },
  };
}

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSIGNMENT_ID,
    course_id: "course-1",
    program_id: "program-1",
    year_level: "FIRST_YEAR",
    section: "MORNING",
    course: {
      code: "CS101",
      title: "Intro",
      is_active: true,
      course_scope: "PROGRAM_SPECIFIC",
      program_id: "program-1",
    },
    program: { id: "program-1", name: "Computer Science", is_active: true },
    ...overrides,
  };
}

function generalEducationAssignment() {
  return assignment({
    id: "assignment-ge",
    course_id: "course-ge",
    year_level: "FIRST_YEAR",
    section: "AFTERNOON",
    course: {
      code: "GE101",
      title: "Ethics",
      is_active: true,
      course_scope: "GENERAL_EDUCATION",
      program_id: null,
    },
  });
}

function mixedReadiness(status: "ACTIVE" | "COMPLETED" = "ACTIVE") {
  return {
    period: { id: PERIOD_ID, status },
    schemaVersion: 2,
    contexts: [
      {
        courseId: "course-ge",
        courseCode: "GE101",
        courseName: "Ethics",
        courseIsArchived: false,
        programId: "program-1",
        programName: "Computer Science",
        programIsArchived: false,
        assignmentIds: ["assignment-ge"],
        courseScope: "GENERAL_EDUCATION",
        targetType: "INSTITUTIONAL_OUTCOME",
        yearLevels: ["FIRST_YEAR"],
        sections: ["AFTERNOON"],
        state: "incomplete-mapping",
        cilos: [
          {
            id: "cilo-ge",
            description: "Examine civic duty",
            isArchived: false,
            mappedTargets: [],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: ["ilo-1"],
          },
        ],
        institutionalOutcomes: [
          {
            id: "ilo-1",
            code: "ILO1",
            description: "Serve the community",
            isArchived: false,
            order: 0,
          },
          {
            id: "ilo-2",
            code: "ILO2",
            description: "Retired shared outcome",
            isArchived: true,
            order: 1,
          },
        ],
        plos: [],
        affectedCiloIds: ["cilo-ge"],
        affectedPloIds: [],
        affectedInstitutionalOutcomeIds: ["ilo-1"],
      },
      {
        courseId: "course-1",
        courseCode: "CS101",
        courseName: "Intro",
        courseIsArchived: false,
        programId: "program-1",
        programName: "Computer Science",
        programIsArchived: false,
        assignmentIds: [ASSIGNMENT_ID],
        courseScope: "PROGRAM_SPECIFIC",
        targetType: "GRADUATE_OUTCOME",
        yearLevels: ["FIRST_YEAR"],
        sections: ["MORNING"],
        state: "incomplete-mapping",
        cilos: [
          {
            id: "cilo-1",
            description: "Explain core ideas",
            isArchived: false,
            mappedTargets: [],
            missingPloIds: ["go-1"],
            missingInstitutionalOutcomeIds: [],
          },
        ],
        institutionalOutcomes: [],
        plos: [
          {
            id: "go-1",
            code: "GO1",
            description: "Build systems",
            isArchived: false,
            order: 1,
          },
          {
            id: "go-2",
            code: "GO2",
            description: "Lead change",
            isArchived: true,
            order: 2,
          },
        ],
        affectedCiloIds: ["cilo-1"],
        affectedPloIds: ["go-1"],
        affectedInstitutionalOutcomeIds: [],
      },
    ],
    programTotals: [
      {
        programId: "program-1",
        programName: "Computer Science",
        activeContexts: 2,
        readyContexts: 0,
        missingCiloContexts: 0,
        incompleteMappingContexts: 2,
      },
    ],
  };
}

describe("Dean oversight read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses active period before completed fallback", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
    expect(prismaMock.academicTermInstance.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      })
    );
  });

  it("uses the bounded readiness totals read for the dashboard", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(period());
    readinessTotalsMock.mockResolvedValue([
      {
        programId: "program-1",
        programName: "Computer Science",
        activeContexts: 3,
        readyContexts: 2,
        missingCiloContexts: 1,
        incompleteMappingContexts: 0,
      },
    ]);

    await expect(getDeanDashboard()).resolves.toEqual({
      state: "ready",
      data: {
        activePeriod: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term" },
        kpis: {
          activeContexts: 3,
          readyContexts: 2,
          missingCiloContexts: 1,
          incompleteMappingContexts: 0,
        },
        risks: { missingCilos: 1, incompleteMappings: 0, notReady: 1 },
        programs: [
          {
            id: "program-1",
            name: "Computer Science",
            activeContexts: 3,
            readyContexts: 2,
            missingCiloContexts: 1,
            incompleteMappingContexts: 0,
          },
        ],
      },
    });
    expect(readinessTotalsMock).toHaveBeenCalledWith(PERIOD_ID);
    expect(readinessMock).not.toHaveBeenCalled();
  });

  it("requires an explicit period when only a completed period exists", async () => {
    prismaMock.academicTermInstance.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(period("COMPLETED"));
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
  });

  it("does not silently select a completed period for an omitted URL period", async () => {
    prismaMock.academicTermInstance.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(period("COMPLETED"));

    await expect(getDeanEnrollments(undefined)).rejects.toThrow("period is required");
    expect(prismaMock.academicTermInstance.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { status: "COMPLETED" },
        orderBy: [{ end_date: "desc" }, { created_at: "desc" }],
      })
    );
  });

  it("returns enrollment counts from placement keys, not broad enrollment records", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([assignment()]);
    prismaMock.studentEnrollment.groupBy
      .mockResolvedValueOnce([{ program_id: "program-1", _count: { student_user_id: 2 } }])
      .mockResolvedValueOnce([
        {
          program_id: "program-1",
          year_level: "FIRST_YEAR",
          section: "MORNING",
          _count: { student_user_id: 2 },
        },
      ]);

    await expect(getDeanEnrollments(PERIOD_ID)).resolves.toEqual({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        programs: [
          {
            id: "program-1",
            name: "Computer Science",
            enrolledStudentCount: 2,
            classes: [
              {
                assignmentId: ASSIGNMENT_ID,
                courseCode: "CS101",
                courseName: "Intro",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                enrolledStudentCount: 2,
              },
            ],
          },
        ],
      },
    });
    expect(prismaMock.studentEnrollment.groupBy).toHaveBeenCalledTimes(2);
  });

  it("rejects assignment from another period before reading students", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(null);

    await expect(
      getDeanRoster({ periodId: PERIOD_ID, assignmentId: ASSIGNMENT_ID, page: 1 })
    ).rejects.toBeInstanceOf(DeanReadModelNotFoundError);
    expect(prismaMock.studentEnrollment.findMany).not.toHaveBeenCalled();
  });

  it("rejects archived current-period assignments before reading students", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(null);

    await expect(
      getDeanRoster({ periodId: PERIOD_ID, assignmentId: ASSIGNMENT_ID, page: 1 })
    ).rejects.toBeInstanceOf(DeanReadModelNotFoundError);
    expect(prismaMock.courseAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course: { is_active: true },
          program: { is_active: true },
        }),
      })
    );
  });

  it("queries roster within selected assignment placement and returns names only", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(assignment());
    prismaMock.studentEnrollment.count.mockResolvedValue(1);
    prismaMock.studentEnrollment.findMany.mockResolvedValue([
      { student: { name: "Ada Lovelace" } },
    ]);

    const result = await getDeanRoster({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      query: "Ada",
      page: 2,
    });

    expect(result).toEqual({
      state: "ready",
      data: {
        assignment: {
          id: ASSIGNMENT_ID,
          courseCode: "CS101",
          courseName: "Intro",
          programName: "Computer Science",
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
        },
        students: [{ displayName: "Ada Lovelace" }],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        totalPages: 1,
      },
    });
    expect(prismaMock.studentEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 25,
        where: expect.objectContaining({
          term_instance_id: PERIOD_ID,
          program_id: "program-1",
          year_level: "FIRST_YEAR",
          section: "MORNING",
        }),
        select: { student: { select: { name: true } } },
        orderBy: [{ student: { name: "asc" } }, { student_user_id: "asc" }],
      })
    );
    expect(JSON.stringify(result)).not.toMatch(/studentId|email|enrollmentId|source|accountId/i);
  });

  it("clamps roster pages before calculating Prisma offset", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(assignment());
    prismaMock.studentEnrollment.count.mockResolvedValue(26);
    prismaMock.studentEnrollment.findMany.mockResolvedValue([
      { student: { name: "Ada Lovelace" } },
    ]);

    const result = await getDeanRoster({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      page: Number.MAX_SAFE_INTEGER,
    });

    expect(result).toMatchObject({ state: "ready", data: { page: 2, totalPages: 2 } });
    expect(prismaMock.studentEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 })
    );
  });

  it("shares the roster page-size and count projection with the detail read", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findFirst.mockResolvedValue(assignment());
    prismaMock.studentEnrollment.count.mockResolvedValue(26);
    prismaMock.studentEnrollment.findMany.mockResolvedValue([
      { student: { name: "Ada Lovelace" } },
    ]);

    const pageResult = await getDeanRosterPage({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      page: 2,
    });
    const rosterResult = await getDeanRoster({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      page: 2,
    });

    expect(pageResult).toEqual({ state: "ready", data: { page: 2 } });
    expect(rosterResult).toMatchObject({
      state: "ready",
      data: { page: 2, pageSize: 25, totalCount: 26, totalPages: 2 },
    });
    expect(prismaMock.studentEnrollment.findMany).toHaveBeenCalledTimes(1);
  });

  it("projects Institutional Outcome catalog coverage separately from Program GO gaps", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      generalEducationAssignment(),
      assignment(),
    ]);
    prismaMock.institutionalOutcome.findMany.mockResolvedValue([
      {
        id: "ilo-1",
        code: "ILO1",
        description: "Serve the community",
        is_active: true,
        order: 0,
      },
      {
        id: "ilo-2",
        code: "ILO2",
        description: "Retired shared outcome",
        is_active: false,
        order: 1,
      },
    ]);
    readinessMock.mockResolvedValue(mixedReadiness());

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result).toMatchObject({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, status: "ACTIVE" },
        schemaVersion: 2,
        institutionalOutcomes: [
          {
            id: "ilo-1",
            code: "ILO1",
            statement: "Serve the community",
            isArchived: false,
            displayOrder: 0,
          },
        ],
      },
    });
    if (result.state !== "ready") throw new Error("expected ready state");
    const [program] = result.data.programs;
    expect(program?.plos.map((outcome) => outcome.code)).toEqual(["GO1"]);
    expect(program?.mappingGaps).toEqual([
      expect.objectContaining({
        courseCode: "CS101",
        targetType: "GRADUATE_OUTCOME",
        courseScope: "PROGRAM_SPECIFIC",
        missingPloIds: ["go-1"],
        missingInstitutionalOutcomeIds: [],
      }),
      expect.objectContaining({
        courseCode: "GE101",
        targetType: "INSTITUTIONAL_OUTCOME",
        courseScope: "GENERAL_EDUCATION",
        missingPloIds: [],
        missingInstitutionalOutcomeIds: ["ilo-1"],
        ciloStatement: "Examine civic duty",
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /studentId|email|enrollmentId|faculty|accountId|roster/i
    );
  });

  it("keeps archived Institutional Outcomes visible on completed snapshots", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period("COMPLETED"));
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      generalEducationAssignment(),
      assignment(),
    ]);
    readinessMock.mockResolvedValue(mixedReadiness("COMPLETED"));

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result).toMatchObject({
      state: "ready",
      data: {
        schemaVersion: 2,
        institutionalOutcomes: [
          expect.objectContaining({ code: "ILO1", isArchived: false }),
          expect.objectContaining({ code: "ILO2", isArchived: true }),
        ],
      },
    });
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.plos.map((outcome) => outcome.code)).toEqual([
      "GO1",
      "GO2",
    ]);
    expect(prismaMock.institutionalOutcome.findMany).not.toHaveBeenCalled();
  });

  it("does not relabel legacy completed snapshots as Institutional Outcome coverage", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period("COMPLETED"));
    prismaMock.courseAssignment.findMany.mockResolvedValue([generalEducationAssignment()]);
    readinessMock.mockResolvedValue({
      period: { id: PERIOD_ID, status: "COMPLETED" },
      schemaVersion: 1,
      contexts: [
        {
          courseId: "course-ge",
          courseCode: "GE101",
          courseName: "Ethics",
          courseIsArchived: false,
          programId: "program-1",
          programName: "Computer Science",
          programIsArchived: false,
          assignmentIds: ["assignment-ge"],
          courseScope: "GENERAL_EDUCATION",
          yearLevels: ["FIRST_YEAR"],
          sections: ["AFTERNOON"],
          state: "incomplete-mapping",
          cilos: [
            {
              id: "cilo-ge",
              description: "Examine civic duty",
              isArchived: false,
              missingPloIds: ["go-legacy"],
            },
          ],
          plos: [
            {
              id: "go-legacy",
              code: "GO1",
              description: "Legacy coverage",
              isArchived: false,
              order: 1,
            },
          ],
          affectedCiloIds: ["cilo-ge"],
          affectedPloIds: ["go-legacy"],
        },
      ],
      programTotals: [
        {
          programId: "program-1",
          programName: "Computer Science",
          activeContexts: 1,
          readyContexts: 0,
          missingCiloContexts: 0,
          incompleteMappingContexts: 1,
        },
      ],
    });

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result).toMatchObject({
      state: "ready",
      data: {
        schemaVersion: 1,
        institutionalOutcomes: [],
      },
    });
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.mappingGaps).toEqual([
      expect.objectContaining({
        courseCode: "GE101",
        targetType: null,
        courseScope: "GENERAL_EDUCATION",
        missingPloIds: ["go-legacy"],
        missingInstitutionalOutcomeIds: [],
      }),
    ]);
  });

  it("does not list a CILO as a gap when it already has a valid active target", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([generalEducationAssignment()]);
    prismaMock.institutionalOutcome.findMany.mockResolvedValue([
      {
        id: "ilo-1",
        code: "ILO1",
        description: "Serve the community",
        is_active: true,
        order: 0,
      },
      {
        id: "ilo-2",
        code: "ILO2",
        description: "Communicate clearly",
        is_active: true,
        order: 1,
      },
    ]);
    const readiness = mixedReadiness();
    readiness.contexts = [
      {
        ...readiness.contexts[0],
        state: "incomplete-mapping",
        cilos: [
          {
            id: "cilo-aligned",
            description: "Already mapped",
            isArchived: false,
            mappedTargets: [{ id: "ilo-1", isArchived: false }],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: ["ilo-2"],
          },
          {
            id: "cilo-ge",
            description: "Examine civic duty",
            isArchived: false,
            mappedTargets: [],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: ["ilo-1", "ilo-2"],
          },
        ],
      },
    ];
    readinessMock.mockResolvedValue(readiness);

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.mappingGaps).toEqual([
      expect.objectContaining({
        ciloId: "cilo-ge",
        targetType: "INSTITUTIONAL_OUTCOME",
      }),
    ]);
  });

  it("lists active Program-specific CILOs as gaps when the Program has zero active PLOs", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([assignment()]);
    const readiness = mixedReadiness();
    readiness.contexts = [
      {
        ...readiness.contexts[1],
        state: "incomplete-mapping",
        plos: [],
        cilos: [
          {
            id: "cilo-1",
            description: "Explain core ideas",
            isArchived: false,
            mappedTargets: [],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: [],
          },
        ],
      },
    ];
    readinessMock.mockResolvedValue(readiness);

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.mappingGaps).toEqual([
      expect.objectContaining({
        ciloId: "cilo-1",
        courseScope: "PROGRAM_SPECIFIC",
        missingPloIds: [],
      }),
    ]);
  });

  it("falls back to stored missing lists when a version 2 snapshot CILO lacks mappedTargets", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period());
    prismaMock.courseAssignment.findMany.mockResolvedValue([assignment()]);
    readinessMock.mockResolvedValue({
      period: { id: PERIOD_ID, status: "COMPLETED" },
      schemaVersion: 2,
      programTotals: [],
      contexts: [
        {
          courseId: "course-1",
          courseCode: "CS101",
          courseName: "Foundations",
          courseIsArchived: false,
          programId: "program-1",
          programName: "Computer Science",
          programIsArchived: false,
          assignmentIds: ["assignment-prog"],
          courseScope: "PROGRAM_SPECIFIC",
          targetType: "GRADUATE_OUTCOME",
          yearLevels: ["FIRST_YEAR"],
          sections: ["AFTERNOON"],
          state: "incomplete-mapping",
          cilos: [
            {
              id: "cilo-gap",
              description: "Explain core ideas",
              isArchived: false,
              missingPloIds: ["go-1"],
              missingInstitutionalOutcomeIds: [],
            },
            {
              id: "cilo-fine",
              description: "Apply principles",
              isArchived: false,
              missingPloIds: [],
              missingInstitutionalOutcomeIds: [],
            },
          ],
          plos: [],
          affectedCiloIds: ["cilo-gap"],
        },
      ],
    });

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.mappingGaps).toEqual([
      expect.objectContaining({ ciloId: "cilo-gap", missingPloIds: ["go-1"] }),
    ]);
  });

  it("does not list archived CILOs as current mapping gaps", async () => {
    prismaMock.academicTermInstance.findUnique.mockResolvedValue(period("COMPLETED"));
    prismaMock.courseAssignment.findMany.mockResolvedValue([generalEducationAssignment()]);
    const readiness = mixedReadiness("COMPLETED");
    readiness.contexts = [
      {
        ...readiness.contexts[0],
        state: "incomplete-mapping",
        cilos: [
          {
            id: "cilo-archived",
            description: "Retired CILO",
            isArchived: true,
            mappedTargets: [],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: ["ilo-1"],
          },
          {
            id: "cilo-ge",
            description: "Examine civic duty",
            isArchived: false,
            mappedTargets: [],
            missingPloIds: [],
            missingInstitutionalOutcomeIds: ["ilo-1"],
          },
        ],
      },
    ];
    readinessMock.mockResolvedValue(readiness);

    const result = await getDeanLearningOutcomes(PERIOD_ID);

    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready state");
    expect(result.data.programs[0]?.mappingGaps.map((gap) => gap.ciloId)).toEqual(["cilo-ge"]);
  });

  it("returns an explicit no-eligible-period state instead of zero coverage", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(null);

    await expect(getDeanLearningOutcomes(undefined)).resolves.toEqual({
      state: "no-eligible-period",
    });
    expect(readinessMock).not.toHaveBeenCalled();
  });
});
