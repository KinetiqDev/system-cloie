import { beforeEach, describe, expect, it, vi } from "vitest";
import { readProgramAssignmentSummary } from "@/features/course-assignments/services/read-program-assignment-summary";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { courseAssignment: { count: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
}));
vi.mock("@/features/academic-calendar/services/resolve-active-term", () => ({
  getActiveTermId: vi.fn(),
}));

describe("readProgramAssignmentSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: true,
      data: { selectedProgram: { id: "program-1" } },
    } as never);
    vi.mocked(getActiveTermId).mockResolvedValue("term-1");
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(2);
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      { id: "program-course" },
      { id: "general-education-course" },
    ] as never);
  });

  it("shows assignments without requiring evaluation evidence or matching course scope", async () => {
    const result = await readProgramAssignmentSummary("program-1", {});
    expect(result).toEqual({
      total: 2,
      assignments: [{ id: "program-course" }, { id: "general-education-course" }],
      termId: "term-1",
    });
    expect(prisma.courseAssignment.count).toHaveBeenCalledWith({
      where: {
        program_id: "program-1",
        is_active: true,
        term_instance_id: "term-1",
        term_instance: {},
      },
    });
  });

  it("denies an unauthorized program before reading assignments", async () => {
    vi.mocked(resolveProgramHeadContext).mockResolvedValue({
      success: false,
      error: "Not authorized",
    });
    expect(await readProgramAssignmentSummary("other-program", {})).toBeNull();
    expect(prisma.courseAssignment.findMany).not.toHaveBeenCalled();
  });

  it("honors explicit academic-period filters", async () => {
    await readProgramAssignmentSummary("program-1", { schoolYearId: "year-1", semester: "SECOND" });
    expect(prisma.courseAssignment.count).toHaveBeenCalledWith({
      where: {
        program_id: "program-1",
        is_active: true,
        term_instance: { school_year_id: "year-1", semester: "SECOND" },
      },
    });
    expect(getActiveTermId).not.toHaveBeenCalled();
  });

  it("does not show historical assignments when there is no active period", async () => {
    vi.mocked(getActiveTermId).mockResolvedValue(null);
    await readProgramAssignmentSummary("program-1", {});
    expect(prisma.courseAssignment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "__no_active_period__" }) })
    );
  });
});
