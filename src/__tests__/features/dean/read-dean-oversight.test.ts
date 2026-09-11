import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, readinessMock, readinessTotalsMock } = vi.hoisted(() => ({
  prismaMock: {
    academicTermInstance: { findFirst: vi.fn(), findUnique: vi.fn() },
    courseAssignment: { findMany: vi.fn(), findFirst: vi.fn() },
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

import type { PeriodReadiness } from "@/features/academic-calendar/services/read-period-readiness";
import {
  getDeanDashboard,
  getDeanLearningOutcomes,
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

function mixedReadiness(status: "ACTIVE" | "COMPLETED" = "ACTIVE"): PeriodReadiness {
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

  it("requires an explicit period when an eligible active period exists", async () => {
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(period());

    await expect(getDeanLearningOutcomes(undefined)).rejects.toThrow("period is required");
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
    expect(result.data.programs[0]?.plos.map((outcome) => outcome.code)).toEqual(["GO1", "GO2"]);
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
