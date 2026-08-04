import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";

const { facultyProgramAffiliationFindManyMock, programHeadAssignmentFindManyMock } = vi.hoisted(
  () => ({
    facultyProgramAffiliationFindManyMock: vi.fn(),
    programHeadAssignmentFindManyMock: vi.fn(),
  })
);

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facultyProgramAffiliation: {
      findMany: facultyProgramAffiliationFindManyMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
    },
  },
}));

describe("resolveReviewerProgramScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns faculty-affiliated program ids for faculty reviewers", async () => {
    facultyProgramAffiliationFindManyMock.mockResolvedValue([
      { program_id: "program-1" },
      { program_id: "program-2" },
      { program_id: "program-1" },
    ]);

    await expect(
      resolveReviewerProgramScope({
        reviewerId: "faculty-1",
        reviewerRole: ROLES.FACULTY,
      })
    ).resolves.toEqual(["program-1", "program-2"]);

    expect(facultyProgramAffiliationFindManyMock).toHaveBeenCalledWith({
      select: { program_id: true },
      where: { faculty_id: "faculty-1", is_active: true },
    });
    expect(programHeadAssignmentFindManyMock).not.toHaveBeenCalled();
  });

  it("returns assigned program ids for program heads", async () => {
    programHeadAssignmentFindManyMock.mockResolvedValue([
      { program_id: "program-2" },
      { program_id: "program-3" },
    ]);

    await expect(
      resolveReviewerProgramScope({
        reviewerId: "program-head-1",
        reviewerRole: ROLES.PROGRAM_HEAD,
      })
    ).resolves.toEqual(["program-2", "program-3"]);

    expect(programHeadAssignmentFindManyMock).toHaveBeenCalledWith({
      select: { program_id: true },
      where: { program_head_id: "program-head-1", is_active: true },
    });
    expect(facultyProgramAffiliationFindManyMock).not.toHaveBeenCalled();
  });

  it("returns only the explicitly selected assigned Program", async () => {
    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: "program-2" }]);

    await expect(
      resolveReviewerProgramScope({
        programId: "program-2",
        reviewerId: "program-head-1",
        reviewerRole: ROLES.PROGRAM_HEAD,
      })
    ).resolves.toEqual(["program-2"]);

    expect(programHeadAssignmentFindManyMock).toHaveBeenCalledWith({
      select: { program_id: true },
      where: {
        is_active: true,
        program_head_id: "program-head-1",
        program_id: "program-2",
      },
    });
  });

  it("returns null for dean reviewers", async () => {
    await expect(
      resolveReviewerProgramScope({
        reviewerId: "dean-1",
        reviewerRole: ROLES.DEAN,
      })
    ).resolves.toBeNull();

    expect(programHeadAssignmentFindManyMock).not.toHaveBeenCalled();
    expect(facultyProgramAffiliationFindManyMock).not.toHaveBeenCalled();
  });
});
