import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFacultyCourseIds } from "@/features/evaluations/services/resolve-faculty-course-ids";

const {
  findManyCourseAssignmentMock,
} = vi.hoisted(() => ({
  findManyCourseAssignmentMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: {
      findMany: findManyCourseAssignmentMock,
    },
  },
}));

describe("resolveFacultyCourseIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves course IDs for a specific term assignment", async () => {
    findManyCourseAssignmentMock.mockResolvedValue([
      { course_id: "course-1" },
      { course_id: "course-2" },
    ]);

    const result = await resolveFacultyCourseIds("faculty-1", "term-1");
    expect(result).toEqual(["course-1", "course-2"]);
    expect(findManyCourseAssignmentMock).toHaveBeenCalledWith({
      where: {
        faculty_id: "faculty-1",
        term_instance_id: "term-1",
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
    });
  });

  it("resolves distinct course IDs across all terms when termInstanceId is omitted", async () => {
    findManyCourseAssignmentMock.mockResolvedValue([
      { course_id: "course-1" },
      { course_id: "course-3" },
    ]);

    const result = await resolveFacultyCourseIds("faculty-1");
    expect(result).toEqual(["course-1", "course-3"]);
    expect(findManyCourseAssignmentMock).toHaveBeenCalledWith({
      where: {
        faculty_id: "faculty-1",
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
      distinct: ["course_id"],
    });
  });

  it("returns empty array if no assignments are found", async () => {
    findManyCourseAssignmentMock.mockResolvedValue([]);

    const result = await resolveFacultyCourseIds("faculty-1", "term-empty");
    expect(result).toEqual([]);
  });
});
