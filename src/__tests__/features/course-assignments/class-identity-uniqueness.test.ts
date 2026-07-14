import crypto from "crypto";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

describe.skipIf(!process.env.DATABASE_URL)("CourseAssignment class identity", () => {
  it("rejects duplicate classes while allowing separate sections and GE program contexts", async () => {
    const [term, firstProgram, secondProgram, firstFaculty, secondFaculty] = await Promise.all([
      prisma.academicTermInstance.findFirst(),
      prisma.program.findFirst(),
      prisma.program.findFirst({ skip: 1 }),
      prisma.user.findFirst({ where: { roles: { some: { role: "FACULTY" } } } }),
      prisma.user.findFirst({
        where: { roles: { some: { role: "FACULTY" } } },
        skip: 1,
      }),
    ]);

    expect(term).toBeTruthy();
    expect(firstProgram).toBeTruthy();
    expect(secondProgram).toBeTruthy();
    expect(firstFaculty).toBeTruthy();
    expect(secondFaculty).toBeTruthy();

    if (!term || !firstProgram || !secondProgram || !firstFaculty || !secondFaculty) return;

    const course = await prisma.course.create({
      data: {
        code: `TEST-GE-${crypto.randomUUID()}`,
        title: "Temporary class identity test course",
        course_scope: CourseScope.GENERAL_EDUCATION,
      },
    });

    try {
      await prisma.courseAssignment.create({
        data: {
          term_instance_id: term.id,
          course_id: course.id,
          faculty_id: firstFaculty.id,
          program_id: firstProgram.id,
          year_level: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      });

      await expect(
        prisma.courseAssignment.create({
          data: {
            term_instance_id: term.id,
            course_id: course.id,
            faculty_id: secondFaculty.id,
            program_id: firstProgram.id,
            year_level: YearLevel.FIRST_YEAR,
            section: StudentSection.MORNING,
          },
        })
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.courseAssignment.create({
          data: {
            term_instance_id: term.id,
            course_id: course.id,
            faculty_id: firstFaculty.id,
            program_id: firstProgram.id,
            year_level: YearLevel.FIRST_YEAR,
            section: StudentSection.AFTERNOON,
          },
        })
      ).resolves.toMatchObject({ section: StudentSection.AFTERNOON });

      await expect(
        prisma.courseAssignment.create({
          data: {
            term_instance_id: term.id,
            course_id: course.id,
            faculty_id: firstFaculty.id,
            program_id: secondProgram.id,
            year_level: YearLevel.FIRST_YEAR,
            section: StudentSection.MORNING,
          },
        })
      ).resolves.toMatchObject({ program_id: secondProgram.id });
    } finally {
      await prisma.courseAssignment.deleteMany({ where: { course_id: course.id } });
      await prisma.course.delete({ where: { id: course.id } });
    }
  });
});
