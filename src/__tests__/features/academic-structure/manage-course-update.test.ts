import { beforeEach, describe, expect, it, vi } from "vitest";

const courseId = "11111111-1111-4111-a111-111111111111";

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      course: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { updateCourse } from "@/features/academic-structure/services/manage-courses";

const baseInput = {
  id: courseId,
  code: "GE101",
  title: "General Education 101",
  course_scope: "GENERAL_EDUCATION" as const,
  default_year_level: undefined,
  default_semester: undefined,
  default_term: undefined,
};

describe("updateCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes through the conditional update when the concurrency token is current", async () => {
    prismaMock.course.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateCourse({
      ...baseInput,
      updated_at: "2026-08-22T03:00:00.000Z",
    });

    expect(result).toEqual({ success: true, data: { id: courseId } });
    expect(prismaMock.course.updateMany).toHaveBeenCalledWith({
      where: { id: courseId, updated_at: new Date("2026-08-22T03:00:00.000Z") },
      data: expect.objectContaining({ code: "GE101", course_scope: "GENERAL_EDUCATION" }),
    });
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });

  it("rejects a stale snapshot instead of overwriting the newer record", async () => {
    prismaMock.course.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.course.findUnique.mockResolvedValue({ id: courseId });

    const result = await updateCourse({
      ...baseInput,
      updated_at: "2026-08-22T02:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("updated by someone else");
    }
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });

  it("reports a missing course when the conditional update matches nothing", async () => {
    prismaMock.course.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.course.findUnique.mockResolvedValue(null);

    const result = await updateCourse({
      ...baseInput,
      updated_at: "2026-08-22T02:00:00.000Z",
    });

    expect(result).toEqual({ success: false, error: "Course not found." });
  });

  it("keeps the unconditional update for callers without a concurrency token", async () => {
    prismaMock.course.update.mockResolvedValue({ id: courseId });

    const result = await updateCourse(baseInput);

    expect(result).toEqual({ success: true, data: { id: courseId } });
    expect(prismaMock.course.update).toHaveBeenCalledWith({
      where: { id: courseId },
      data: expect.objectContaining({ code: "GE101" }),
    });
    expect(prismaMock.course.updateMany).not.toHaveBeenCalled();
  });
});
