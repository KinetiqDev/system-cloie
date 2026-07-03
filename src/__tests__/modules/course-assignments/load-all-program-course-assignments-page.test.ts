import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAllProgramCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    schoolYear: {
      findMany: vi.fn(),
    },
    program: {
      findMany: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    facultyProgramAffiliation: {
      findMany: vi.fn(),
    },
  },
}));

describe("loadAllProgramCourseAssignmentsPageData", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
    vi.mocked(prisma.program.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.facultyProgramAffiliation.findMany).mockResolvedValue([] as never);
  });

  it("loads assignment periods from all school years, including archived ones", async () => {
    vi.mocked(prisma.schoolYear.findMany).mockResolvedValue([
      {
        id: "school-year-current",
        code: "2026-2027",
        created_at: new Date("2026-01-01"),
        term_instances: [
          {
            id: "term-current",
            school_year_id: "school-year-current",
            semester: AcademicSemester.FIRST,
            term: AcademicTerm.FIRST_TERM,
            start_date: null,
            end_date: null,
            is_active: true,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-01"),
          },
        ],
      },
      {
        id: "school-year-archived",
        code: "2024-2025",
        created_at: new Date("2024-01-01"),
        term_instances: [
          {
            id: "term-archived",
            school_year_id: "school-year-archived",
            semester: AcademicSemester.SECOND,
            term: AcademicTerm.SECOND_TERM,
            start_date: null,
            end_date: null,
            is_active: false,
            created_at: new Date("2024-01-01"),
            updated_at: new Date("2024-01-01"),
          },
        ],
      },
    ] as never);

    const result = await loadAllProgramCourseAssignmentsPageData();

    expect(result.termInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "term-current", schoolYearCode: "2026-2027" }),
        expect.objectContaining({ id: "term-archived", schoolYearCode: "2024-2025" }),
      ])
    );
    expect(prisma.schoolYear.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ skip: expect.any(Number), take: expect.any(Number) })
    );
  });

  it("maps all-program dropdown data", async () => {
    vi.mocked(prisma.schoolYear.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.program.findMany).mockResolvedValue([
      { id: "program-1", code: "BSCS", name: "BS Computer Science" },
    ] as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: "course-1",
        code: "CS101",
        title: "Intro to Computing",
        default_year_level: YearLevel.FIRST_YEAR,
        course_scope: CourseScope.PROGRAM_SPECIFIC,
        program_id: "program-1",
      },
    ] as never);
    vi.mocked(prisma.facultyProgramAffiliation.findMany).mockResolvedValue([
      {
        faculty: {
          id: "faculty-1",
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
        },
      },
    ] as never);

    const result = await loadAllProgramCourseAssignmentsPageData();

    expect(result.availablePrograms).toEqual([
      { id: "program-1", code: "BSCS", name: "BS Computer Science" },
    ]);
    expect(result.availableCourses).toEqual([
      {
        id: "course-1",
        code: "CS101",
        title: "Intro to Computing",
        default_year_level: YearLevel.FIRST_YEAR,
        course_scope: CourseScope.PROGRAM_SPECIFIC,
        program_id: "program-1",
      },
    ]);
    expect(result.availableFaculty).toEqual([
      {
        id: "faculty-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
    ]);
  });
});
