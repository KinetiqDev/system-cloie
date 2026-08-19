import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  persistPeriodReadinessSnapshot,
  readPeriodReadiness,
  readPeriodReadinessTotals,
} from "@/features/academic-calendar/services/read-period-readiness";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: { findUnique: vi.fn() },
    courseAssignment: { findMany: vi.fn() },
    academicPeriodReadinessSnapshot: { create: vi.fn(), findUnique: vi.fn() },
    institutionalOutcome: { findMany: vi.fn() },
  },
}));

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1",
    course_id: "course-1",
    program_id: "program-1",
    year_level: "FIRST_YEAR",
    section: "MORNING",
    course: {
      code: "C-101",
      title: "Course",
      course_scope: "PROGRAM_SPECIFIC",
      is_active: true,
      program_id: "program-1",
      cilos: [
        {
          id: "cilo-1",
          description: "Apply knowledge",
          is_active: true,
          cilo_mappings: [],
          cilo_institutional_outcome_mappings: [],
        },
      ],
    },
    program: { id: "program-1", name: "Program A", is_active: true, plos: [] },
    ...overrides,
  };
}

function generalEducationCourse() {
  return { ...assignment().course, course_scope: "GENERAL_EDUCATION", program_id: null };
}

function activePloMapping(id = "go-1", programId = "program-1") {
  return { plo: { id, program_id: programId, is_active: true } };
}

function activeIloMapping(id = "ilo-1") {
  return { institutional_outcome: { id, is_active: true } };
}

const ILO_CATALOG = [
  { id: "ilo-1", code: "ILO1", description: "Shared outcome", is_active: true, order: 0 },
  { id: "ilo-2", code: "ILO2", description: "Retired outcome", is_active: false, order: 1 },
];

describe("readPeriodReadiness", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue([] as never);
  });

  it("lists affected CILOs when no active Program GOs exist", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment()] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      targetType: "GRADUATE_OUTCOME",
      affectedCiloIds: ["cilo-1"],
      affectedPloIds: [],
      affectedInstitutionalOutcomeIds: [],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [],
      missingPloIds: [],
      missingInstitutionalOutcomeIds: [],
    });
  });

  it("classifies a Program-specific context ready when every active CILO maps an owning-Program GO", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [activePloMapping("go-1", "program-1")],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({ state: "ready", affectedCiloIds: [] });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [{ id: "go-1", isArchived: false }],
      missingPloIds: [],
    });
  });

  it("rejects Program-specific mappings to a GO outside the owning Program", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [activePloMapping("go-2", "program-2")],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      affectedCiloIds: ["cilo-1"],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({ mappedTargets: [] });
  });

  it("rejects wrong-layer Institutional Outcome mappings for Program-specific CILOs", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [],
              cilo_institutional_outcome_mappings: [activeIloMapping("ilo-1")],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      affectedCiloIds: ["cilo-1"],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({ mappedTargets: [] });
  });

  it("does not satisfy readiness with only an archived owning-Program GO", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [{ plo: { id: "go-1", program_id: "program-1", is_active: false } }],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      affectedCiloIds: ["cilo-1"],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [{ id: "go-1", isArchived: true }],
    });
  });

  it("orders active GOs before archived GOs", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        program: {
          id: "program-1",
          name: "Program A",
          is_active: true,
          plos: [
            { id: "go-archived", code: "GO-1", description: "Old", is_active: false, order: 0 },
            { id: "go-active", code: "GO-2", description: "Current", is_active: true, order: 1 },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]?.plos.map((plo) => plo.id)).toEqual([
      "go-active",
      "go-archived",
    ]);
  });

  it("groups sections into one Program-specific Course context", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment(),
      assignment({ id: "assignment-2", section: "AFTERNOON" }),
      assignment({
        id: "wrong-program",
        program_id: "program-2",
        program: { id: "program-2", name: "Program B", is_active: true, plos: [] },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts).toHaveLength(1);
    expect(readiness.contexts[0]?.assignmentIds).toEqual(["assignment-1", "assignment-2"]);
  });

  it("keeps separate General Education contexts for active assignment Programs", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({ course: generalEducationCourse() }),
      assignment({
        id: "assignment-2",
        program_id: "program-2",
        course: generalEducationCourse(),
        program: { id: "program-2", name: "Program B", is_active: true, plos: [] },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts.map((context) => context.programId)).toEqual([
      "program-1",
      "program-2",
    ]);
  });

  it("accepts General Education mappings to an active Institutional Outcome", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue(ILO_CATALOG as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...generalEducationCourse(),
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [],
              cilo_institutional_outcome_mappings: [activeIloMapping("ilo-1")],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "ready",
      targetType: "INSTITUTIONAL_OUTCOME",
      affectedCiloIds: [],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [{ id: "ilo-1", isArchived: false }],
      missingPloIds: [],
      missingInstitutionalOutcomeIds: [],
    });
  });

  it("applies one shared General Education mapping to every active assignment context", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue(ILO_CATALOG as never);
    const sharedCourse = {
      ...generalEducationCourse(),
      cilos: [
        {
          id: "cilo-1",
          description: "Shared CILO",
          is_active: true,
          cilo_mappings: [],
          cilo_institutional_outcome_mappings: [activeIloMapping("ilo-1")],
        },
      ],
    };
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({ course: sharedCourse }),
      assignment({
        id: "assignment-2",
        program_id: "program-2",
        course: sharedCourse,
        program: { id: "program-2", name: "Program B", is_active: true, plos: [] },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts).toHaveLength(2);
    for (const context of readiness.contexts) {
      expect(context.state).toBe("ready");
      expect(context.cilos[0]?.mappedTargets).toEqual([{ id: "ilo-1", isArchived: false }]);
    }
  });

  it("identifies Institutional Outcome gaps without labeling them as missing Program GOs", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue(ILO_CATALOG as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({ course: generalEducationCourse() }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      targetType: "INSTITUTIONAL_OUTCOME",
      affectedCiloIds: ["cilo-1"],
      affectedPloIds: [],
      affectedInstitutionalOutcomeIds: ["ilo-1"],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [],
      missingPloIds: [],
      missingInstitutionalOutcomeIds: ["ilo-1"],
    });
  });

  it("does not satisfy General Education readiness with only an archived Institutional Outcome", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue(ILO_CATALOG as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...generalEducationCourse(),
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [],
              cilo_institutional_outcome_mappings: [
                { institutional_outcome: { id: "ilo-2", is_active: false } },
              ],
            },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      affectedCiloIds: ["cilo-1"],
      affectedInstitutionalOutcomeIds: ["ilo-1"],
    });
    expect(readiness.contexts[0]?.cilos[0]).toMatchObject({
      mappedTargets: [{ id: "ilo-2", isArchived: true }],
      missingInstitutionalOutcomeIds: ["ilo-1"],
    });
  });

  it("includes the typed Institutional Outcome catalog on General Education contexts only", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.institutionalOutcome.findMany).mockResolvedValue(ILO_CATALOG as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({ course: generalEducationCourse() }),
      assignment({
        id: "assignment-2",
        course_id: "course-2",
        course: { ...assignment().course, cilos: [] },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    const generalEducationContext = readiness.contexts.find(
      (context) => context.courseScope === "GENERAL_EDUCATION"
    );
    const programSpecificContext = readiness.contexts.find(
      (context) => context.courseScope === "PROGRAM_SPECIFIC"
    );
    expect(generalEducationContext?.institutionalOutcomes).toEqual([
      { id: "ilo-1", code: "ILO1", description: "Shared outcome", isArchived: false, order: 0 },
      { id: "ilo-2", code: "ILO2", description: "Retired outcome", isArchived: true, order: 1 },
    ]);
    expect(programSpecificContext?.institutionalOutcomes).toEqual([]);
  });

  it("reads completed readiness only from its immutable snapshot", async () => {
    const snapshot = {
      schema_version: 2,
      contexts: [{ courseId: "historical-course" }],
      program_totals: [{ programId: "program-1" }],
    };
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      status: "COMPLETED",
    } as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.findUnique).mockResolvedValue(
      snapshot as never
    );

    await expect(readPeriodReadiness("period-1")).resolves.toMatchObject({
      schemaVersion: 2,
      contexts: snapshot.contexts,
      programTotals: snapshot.program_totals,
    });
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("retains the legacy interpretation of pre-typed snapshots", async () => {
    const snapshot = {
      schema_version: 1,
      contexts: [
        {
          courseId: "historical-course",
          courseScope: "GENERAL_EDUCATION",
          cilos: [{ id: "cilo-1", description: "Legacy", isArchived: false }],
          plos: [{ id: "go-1" }],
        },
      ],
      program_totals: [{ programId: "program-1" }],
    };
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      status: "COMPLETED",
    } as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.findUnique).mockResolvedValue(
      snapshot as never
    );

    await expect(readPeriodReadiness("period-1")).resolves.toMatchObject({
      schemaVersion: 1,
      contexts: snapshot.contexts,
      programTotals: snapshot.program_totals,
    });
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("computes active-period totals from a bounded readiness projection", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        id: "ready-assignment",
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "ready-cilo",
              description: "Hidden from the totals projection",
              is_active: true,
              cilo_mappings: [activePloMapping("go-1", "program-1")],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
      assignment({
        id: "missing-assignment",
        course_id: "course-2",
        course: { ...assignment().course, cilos: [] },
      }),
      assignment({
        id: "incomplete-assignment",
        course_id: "course-3",
        program_id: "program-2",
        program: { id: "program-2", name: "Program B", is_active: true, plos: [] },
        course: {
          ...assignment().course,
          program_id: "program-2",
          cilos: [
            {
              id: "incomplete-cilo",
              description: "Hidden from the totals projection",
              is_active: true,
              cilo_mappings: [activePloMapping("go-1", "program-1")],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
    ] as never);

    await expect(readPeriodReadinessTotals("period-1")).resolves.toEqual([
      {
        programId: "program-1",
        programName: "Program A",
        activeContexts: 2,
        readyContexts: 1,
        missingCiloContexts: 1,
        incompleteMappingContexts: 0,
      },
      {
        programId: "program-2",
        programName: "Program B",
        activeContexts: 1,
        readyContexts: 0,
        missingCiloContexts: 0,
        incompleteMappingContexts: 1,
      },
    ]);
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          term_instance_id: "period-1",
          is_active: true,
        }),
        select: expect.objectContaining({
          course: expect.objectContaining({
            select: expect.objectContaining({ cilos: expect.anything() }),
          }),
        }),
      })
    );
    const select = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0]?.[0]?.select as {
      course?: { select?: { title?: boolean } };
    };
    expect(select.course?.select).not.toHaveProperty("title");
  });

  it("keeps active totals equal to the canonical readiness projection", async () => {
    const assignments = [
      assignment({
        id: "program-context-morning",
        course: {
          ...assignment().course,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [activePloMapping("go-1", "program-1")],
              cilo_institutional_outcome_mappings: [],
            },
          ],
        },
      }),
      assignment({ id: "program-context-afternoon", section: "AFTERNOON" }),
      assignment({
        id: "general-context",
        course_id: "course-ge",
        course: {
          ...assignment().course,
          course_scope: "GENERAL_EDUCATION",
          program_id: null,
          cilos: [
            {
              id: "cilo-ge",
              description: "Shared context",
              is_active: true,
              cilo_mappings: [],
              cilo_institutional_outcome_mappings: [activeIloMapping("ilo-shared")],
            },
          ],
        },
      }),
      assignment({
        id: "malformed-context",
        course_id: "course-malformed",
        course: {
          ...assignment().course,
          program_id: "program-2",
        },
      }),
    ];
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue(assignments as never);

    const totals = await readPeriodReadinessTotals("period-1");
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue(assignments as never);
    const canonical = await readPeriodReadiness("period-1");

    expect(totals).toEqual(canonical.programTotals);
  });

  it("reads completed totals from the immutable snapshot", async () => {
    const snapshotTotals = [
      {
        programId: "program-1",
        programName: "Historical Program",
        activeContexts: 4,
        readyContexts: 4,
        missingCiloContexts: 0,
        incompleteMappingContexts: 0,
      },
    ];
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "COMPLETED",
    } as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.findUnique).mockResolvedValue({
      program_totals: snapshotTotals,
    } as never);

    await expect(readPeriodReadinessTotals("period-1")).resolves.toEqual(snapshotTotals);
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("creates a versioned completion snapshot without an update path", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment()] as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.create).mockResolvedValue({} as never);

    await persistPeriodReadinessSnapshot("period-1");

    expect(prisma.academicPeriodReadinessSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ period_id: "period-1", schema_version: 2 }),
      })
    );
  });
});
