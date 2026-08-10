import { AcademicSemester, Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

type GenerateBaselineResult = {
  created: number;
  skippedPrograms: number;
  skippedCourses: number;
};

/**
 * Create one DRAFT baseline for each program that has no curriculum version.
 * Courses without a complete valid default placement are left out.
 */
export async function generateBaselineCurricula(): Promise<GenerateBaselineResult> {
  const programs = await prisma.program.findMany({
    select: { id: true, code: true },
  });

  let created = 0;
  let skippedPrograms = 0;
  let skippedCourses = 0;

  for (const program of programs) {
    const result = await createBaselineForProgram(program.id);
    if (result.status === "created") created += 1;
    else skippedPrograms += 1;
    skippedCourses += result.skippedCourses;
  }

  return { created, skippedPrograms, skippedCourses };
}

async function createBaselineForProgram(
  programId: string
): Promise<{ status: "created" | "skipped"; skippedCourses: number }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx: PrismaTypes.TransactionClient) => {
          const existing = await tx.curriculumVersion.findFirst({
            where: { program_id: programId },
            select: { id: true },
          });
          if (existing) return { status: "skipped" as const, skippedCourses: 0 };

          const program = await tx.program.findUnique({
            where: { id: programId },
            select: { code: true },
          });
          if (!program) return { status: "skipped" as const, skippedCourses: 0 };

          const courses = await tx.course.findMany({
            where: { program_id: programId, is_active: true },
            select: {
              id: true,
              code: true,
              title: true,
              default_year_level: true,
              default_semester: true,
              default_term: true,
            },
          });
          const eligibleCourses = courses.filter(
            (course) =>
              course.default_year_level &&
              course.default_semester &&
              (course.default_semester === AcademicSemester.SUMMER || course.default_term)
          );

          await tx.curriculumVersion.create({
            data: {
              program_id: programId,
              code: `${program.code}-BASELINE`,
              status: "DRAFT",
              courses: {
                create: eligibleCourses.map((course) => ({
                  course_id: course.id,
                  year_level: course.default_year_level!,
                  semester: course.default_semester!,
                  term:
                    course.default_semester === AcademicSemester.SUMMER
                      ? null
                      : course.default_term,
                  course_code_snapshot: course.code,
                  course_title_snapshot: course.title,
                })),
              },
            },
            select: { id: true },
          });

          return {
            status: "created" as const,
            skippedCourses: courses.length - eligibleCourses.length,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        continue;
      }
      if (isUniqueConstraintError(error)) return { status: "skipped", skippedCourses: 0 };
      throw error;
    }
  }

  throw new Error(`Unable to generate baseline curriculum for program ${programId}; retry later`);
}
