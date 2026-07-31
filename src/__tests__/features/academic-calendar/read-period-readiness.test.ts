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
      cilos: [{ id: "cilo-1", description: "Apply knowledge", is_active: true, cilo_mappings: [] }],
    },
    program: { id: "program-1", name: "Program A", is_active: true, gos: [] },
    ...overrides,
  };
}

describe("readPeriodReadiness", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("lists affected CILOs when no active Program GOs exist", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment()] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({
      state: "incomplete-mapping",
      affectedCiloIds: ["cilo-1"],
      affectedGraduateOutcomeIds: [],
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
          gos: [
            { id: "go-archived", code: "GO-1", description: "Old", is_active: false, order: 0 },
            { id: "go-active", code: "GO-2", description: "Current", is_active: true, order: 1 },
          ],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]?.graduateOutcomes.map((go) => go.id)).toEqual([
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
        program: { id: "program-2", name: "Program B", is_active: true, gos: [] },
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
      assignment({
        course: { ...assignment().course, course_scope: "GENERAL_EDUCATION", program_id: null },
      }),
      assignment({
        id: "assignment-2",
        program_id: "program-2",
        course: { ...assignment().course, course_scope: "GENERAL_EDUCATION", program_id: null },
        program: { id: "program-2", name: "Program B", is_active: true, gos: [] },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts.map((context) => context.programId)).toEqual([
      "program-1",
      "program-2",
    ]);
  });

  it("accepts General Education mappings to an active GO from another Program", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique)
      .mockResolvedValueOnce({ status: "ACTIVE" } as never)
      .mockResolvedValueOnce({ id: "period-1", status: "ACTIVE" } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      assignment({
        course: {
          ...assignment().course,
          course_scope: "GENERAL_EDUCATION",
          program_id: null,
          cilos: [
            {
              id: "cilo-1",
              description: "Apply knowledge",
              is_active: true,
              cilo_mappings: [{ go: { id: "go-2", program_id: "program-2", is_active: true } }],
            },
          ],
        },
        program: {
          id: "program-1",
          name: "Program A",
          is_active: true,
          gos: [{ id: "go-1", code: "GO1", description: "Goal", is_active: true, order: 1 }],
        },
      }),
    ] as never);

    const readiness = await readPeriodReadiness("period-1");

    expect(readiness.contexts[0]).toMatchObject({ state: "ready", affectedCiloIds: [] });
  });

  it("reads completed readiness only from its immutable snapshot", async () => {
    const snapshot = {
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
              cilo_mappings: [{ go: { id: "go-1", program_id: "program-1", is_active: true } }],
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
        program: { id: "program-2", name: "Program B", is_active: true, gos: [] },
        course: {
          ...assignment().course,
          program_id: "program-2",
          cilos: [
            {
              id: "incomplete-cilo",
              description: "Hidden from the totals projection",
              is_active: true,
              cilo_mappings: [{ go: { id: "go-1", program_id: "program-1", is_active: true } }],
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
              cilo_mappings: [{ go: { id: "go-1", program_id: "program-1", is_active: true } }],
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
              cilo_mappings: [
                { go: { id: "go-other-program", program_id: "program-2", is_active: true } },
              ],
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

  it("creates a completion snapshot without an update path", async () => {
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "period-1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([assignment()] as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.create).mockResolvedValue({} as never);

    await persistPeriodReadinessSnapshot("period-1");

    expect(prisma.academicPeriodReadinessSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ period_id: "period-1" }) })
    );
  });
});
