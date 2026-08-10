import { AcademicSemester, AcademicTerm, Prisma, YearLevel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    program: { findMany: vi.fn(), findUnique: vi.fn() },
    course: { findMany: vi.fn() },
    curriculumVersion: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { generateBaselineCurricula } from "@/features/curriculum/services/generate-baseline";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_ID = "22222222-2222-4222-8222-222222222222";

describe("generateBaselineCurricula", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.program.findMany).mockResolvedValue([
      { id: PROGRAM_ID, code: "BSIT" },
    ] as never);
    vi.mocked(prisma.program.findUnique).mockResolvedValue(
      { id: PROGRAM_ID, code: "BSIT" } as never
    );
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.$transaction).mockImplementation((callback) => callback(prisma as never));
    vi.mocked(prisma.curriculumVersion.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({ id: "version-1" } as never);
  });

  it("creates one DRAFT baseline with snapshots and Summer null term", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: COURSE_ID,
        program_id: PROGRAM_ID,
        code: "IT101",
        title: "Programming",
        default_year_level: YearLevel.FIRST_YEAR,
        default_semester: AcademicSemester.SUMMER,
        default_term: AcademicTerm.FIRST_TERM,
        program: { code: "BSIT" },
      },
    ] as never);

    const result = await generateBaselineCurricula();

    expect(result).toEqual({ created: 1, skippedPrograms: 0, skippedCourses: 0 });
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith({
      data: {
        program_id: PROGRAM_ID,
        code: "BSIT-BASELINE",
        status: "DRAFT",
        courses: {
          create: [
            {
              course_id: COURSE_ID,
              year_level: YearLevel.FIRST_YEAR,
              semester: AcademicSemester.SUMMER,
              term: null,
              course_code_snapshot: "IT101",
              course_title_snapshot: "Programming",
            },
          ],
        },
      },
      select: { id: true },
    });
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: PROGRAM_ID, is_active: true } })
    );
  });

  it("does not include inactive courses in a new baseline", async () => {
    vi.mocked(prisma.course.findMany).mockImplementation(((args: { where?: { is_active?: boolean } }) =>
      Promise.resolve(
        args.where?.is_active
          ? []
          : [
              {
                id: COURSE_ID,
                program_id: PROGRAM_ID,
                code: "IT-OD-401",
                title: "Outline Defense Demo Course",
                is_active: false,
                default_year_level: YearLevel.FOURTH_YEAR,
                default_semester: AcademicSemester.SECOND,
                default_term: AcademicTerm.SECOND_TERM,
              },
            ]
      )) as never);

    await generateBaselineCurricula();

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { program_id: PROGRAM_ID, is_active: true } })
    );
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ courses: { create: [] } }) })
    );
  });

  it("creates an empty baseline when all program courses lack placements", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: COURSE_ID,
        program_id: PROGRAM_ID,
        code: "IT101",
        title: "Programming",
        default_year_level: null,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
        program: { code: "BSIT" },
      },
    ] as never);

    const result = await generateBaselineCurricula();

    expect(result).toEqual({ created: 1, skippedPrograms: 0, skippedCourses: 1 });
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ courses: { create: [] } }) })
    );
  });

  it("does not create a second baseline when run again", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: COURSE_ID,
        program_id: PROGRAM_ID,
        code: "IT101",
        title: "Programming",
        default_year_level: YearLevel.FIRST_YEAR,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
        program: { code: "BSIT" },
      },
    ] as never);
    vi.mocked(prisma.curriculumVersion.findFirst).mockResolvedValue({ id: "version-1" } as never);

    const result = await generateBaselineCurricula();

    expect(result).toEqual({ created: 0, skippedPrograms: 1, skippedCourses: 0 });
    expect(prisma.curriculumVersion.create).not.toHaveBeenCalled();
  });

  it("creates an empty baseline for a program with no courses", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);

    const result = await generateBaselineCurricula();

    expect(result).toEqual({ created: 1, skippedPrograms: 0, skippedCourses: 0 });
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "BSIT-BASELINE",
          status: "DRAFT",
          courses: { create: [] },
        }),
      })
    );
  });

  it("retries serialization conflicts and succeeds", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: COURSE_ID,
        program_id: PROGRAM_ID,
        code: "IT101",
        title: "Programming",
        default_year_level: YearLevel.FIRST_YEAR,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
        program: { code: "BSIT" },
      },
    ] as never);
    const conflict = new Prisma.PrismaClientKnownRequestError("retry", {
      code: "P2034",
      clientVersion: "6.19.2",
    });
    vi.mocked(prisma.$transaction)
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockImplementation((callback) => callback(prisma as never));

    const result = await generateBaselineCurricula();

    expect(result.created).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("fails after exhausting serialization retries", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("retry", {
      code: "P2034",
      clientVersion: "6.19.2",
    });
    vi.mocked(prisma.$transaction).mockRejectedValue(conflict);

    await expect(generateBaselineCurricula()).rejects.toThrow(
      `Unable to generate baseline curriculum for program ${PROGRAM_ID}; retry later`
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("uses course ownership and defaults read inside the baseline transaction", async () => {
    let transactionStarted = false;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      transactionStarted = true;
      return callback(prisma as never);
    });
    vi.mocked(prisma.course.findMany).mockImplementation((async () => {
      if (!transactionStarted) {
        return [
          {
            id: COURSE_ID,
            program_id: PROGRAM_ID,
            code: "IT101",
            title: "Programming",
            default_year_level: YearLevel.FIRST_YEAR,
            default_semester: AcademicSemester.FIRST,
            default_term: AcademicTerm.FIRST_TERM,
            program: { code: "BSIT" },
          },
        ] as never;
      }
      return [] as never;
    }) as never);

    await generateBaselineCurricula();

    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ courses: { create: [] } }) })
    );
  });

  it("persists current placement defaults from inside the baseline transaction", async () => {
    let transactionStarted = false;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      transactionStarted = true;
      return callback(prisma as never);
    });
    vi.mocked(prisma.course.findMany).mockImplementation((async () => {
      return [
        {
          id: COURSE_ID,
          program_id: PROGRAM_ID,
          code: "IT101",
          title: "Programming",
          default_year_level: transactionStarted ? YearLevel.SECOND_YEAR : YearLevel.FIRST_YEAR,
          default_semester: transactionStarted
            ? AcademicSemester.SECOND
            : AcademicSemester.FIRST,
          default_term: transactionStarted ? AcademicTerm.SECOND_TERM : AcademicTerm.FIRST_TERM,
          program: { code: "BSIT" },
        },
      ];
    }) as never);

    await generateBaselineCurricula();

    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courses: {
            create: [
              expect.objectContaining({
                year_level: YearLevel.SECOND_YEAR,
                semester: AcademicSemester.SECOND,
                term: AcademicTerm.SECOND_TERM,
              }),
            ],
          },
        }),
      })
    );
  });

  it("uses current program code from inside the baseline transaction", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue(
      { id: PROGRAM_ID, code: "BIT" } as never
    );

    await generateBaselineCurricula();

    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "BIT-BASELINE" }),
      })
    );
  });

  it("skips a program deleted after the outer scan", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue(null);

    const result = await generateBaselineCurricula();

    expect(result).toEqual({ created: 0, skippedPrograms: 1, skippedCourses: 0 });
    expect(prisma.course.findMany).not.toHaveBeenCalled();
    expect(prisma.curriculumVersion.create).not.toHaveBeenCalled();
  });
});
