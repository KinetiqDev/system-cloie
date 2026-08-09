import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  program: { findMany: vi.fn() },
  curriculumVersion: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
  schoolYear: { findMany: vi.fn() },
}));

const listSchoolYearsMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ items: [{ id: "year-1", code: "2025-2026" }] })
);

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/academic-calendar/services/list-school-years", () => ({
  listSchoolYears: listSchoolYearsMock,
}));

import { listSecretaryCurriculumPageData } from "@/features/curriculum/services/read-curriculum-pages";

describe("listSecretaryCurriculumPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.program.findMany.mockResolvedValue([
      { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
    ]);
  });

  it("loads only the bounded program list and school years, not global catalogs", async () => {
    prismaMock.curriculumVersion.findMany.mockResolvedValue([]);
    prismaMock.course.findMany.mockResolvedValue([]);

    const result = await listSecretaryCurriculumPageData();

    expect(prismaMock.program.findMany).toHaveBeenCalledTimes(1);
    expect(listSchoolYearsMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.curriculumVersion.findMany).not.toHaveBeenCalled();
    expect(prismaMock.course.findMany).not.toHaveBeenCalled();

    expect(result.programs).toHaveLength(1);
    expect(result.schoolYears).toEqual([{ id: "year-1", code: "2025-2026" }]);
  });
});

describe("listCurriculumCourseOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes course options to the requested program plus General Education", async () => {
    const { listCurriculumCourseOptions } = await import(
      "@/features/curriculum/services/read-curriculum-pages"
    );
    prismaMock.course.findMany.mockResolvedValue([
      { id: "c-1", code: "IT101", title: "Intro", program_id: "prog-1" },
    ]);

    await listCurriculumCourseOptions("prog-1");

    expect(prismaMock.course.findMany).toHaveBeenCalledTimes(1);
    const where = prismaMock.course.findMany.mock.calls[0][0].where;
    expect(where.is_active).toBe(true);
    expect(where.OR).toEqual([
      { program_id: "prog-1" },
      { course_scope: CourseScope.GENERAL_EDUCATION },
    ]);
  });
});
