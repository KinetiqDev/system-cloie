import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const course = {
  id: "11111111-1111-4111-a111-111111111111",
  code: "BSCS101",
  title: "Introduction to Computer Science",
  _count: { cilos: 0, curriculum_courses: 0 },
  course_assignments: [],
};

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
        course: { findUnique: vi.fn(), delete: vi.fn() },
        curriculumCourse: { count: vi.fn().mockResolvedValue(0) },
    },
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { deleteCourse } from "@/features/academic-structure/services/manage-courses";

describe("deleteCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the FK violation message when the database rejects deletion with P2003", async () => {
    prismaMock.course.findUnique.mockResolvedValue(course);
    prismaMock.course.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "6.19.2",
      })
    );

    const result = await deleteCourse(course.id);

    expect(result).toEqual({
      success: false,
      error: "Cannot delete course; it has existing assignments. Deactivate it instead.",
    });
  });

  it("returns the curriculum reference message when a reference appears during deletion", async () => {
    prismaMock.course.findUnique.mockResolvedValue(course);
    prismaMock.course.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "6.19.2",
      })
    );
    prismaMock.curriculumCourse.count.mockResolvedValue(1);

    const result = await deleteCourse(course.id);

    expect(result).toEqual({
      success: false,
      error: "This course is referenced by one or more curriculum versions. Deactivate it instead.",
    });
  });

  it("blocks deletion when the course is referenced by a curriculum version", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      ...course,
      _count: { cilos: 0, curriculum_courses: 1 },
    });

    const result = await deleteCourse(course.id);

    expect(result).toEqual({
      success: false,
      error: "This course is referenced by one or more curriculum versions. Deactivate it instead.",
    });
    expect(prismaMock.course.delete).not.toHaveBeenCalled();
  });

  it("re-throws non-FK errors", async () => {
    prismaMock.course.findUnique.mockResolvedValue(course);
    const unexpected = new Error("connection reset");
    prismaMock.course.delete.mockRejectedValue(unexpected);

    await expect(deleteCourse(course.id)).rejects.toThrow("connection reset");
  });
});
