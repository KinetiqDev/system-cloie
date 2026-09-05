import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const course = {
  id: "11111111-1111-4111-a111-111111111111",
  code: "BSCS101",
  title: "Introduction to Computer Science",
  _count: { cilos: 0 },
  course_assignments: [],
};

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      course: { findUnique: vi.fn(), delete: vi.fn() },
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

  it("re-throws non-FK errors", async () => {
    prismaMock.course.findUnique.mockResolvedValue(course);
    const unexpected = new Error("connection reset");
    prismaMock.course.delete.mockRejectedValue(unexpected);

    await expect(deleteCourse(course.id)).rejects.toThrow("connection reset");
  });
});
