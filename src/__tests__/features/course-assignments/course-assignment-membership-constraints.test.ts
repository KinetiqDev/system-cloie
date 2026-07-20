import crypto from "node:crypto";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

describe.skipIf(!process.env.DATABASE_URL)("CourseAssignmentMembership database invariants", () => {
  it("enforces scope, lifecycle uniqueness, deletion protection, and assignment cascade", async () => {
    const [program, faculty, otherCourse, term] = await Promise.all([
      prisma.program.findFirstOrThrow(),
      prisma.user.findFirstOrThrow({ where: { roles: { some: { role: "FACULTY" } } } }),
      prisma.course.findFirstOrThrow(),
      prisma.academicTermInstance.findFirstOrThrow(),
    ]);
    const course = await prisma.course.create({
      data: {
        code: `TEST-ROSTER-${crypto.randomUUID()}`,
        title: "Temporary roster constraint course",
        course_scope: CourseScope.GENERAL_EDUCATION,
      },
    });
    const actor = await prisma.user.create({
      data: {
        email: `roster-actor-${crypto.randomUUID()}@test.invalid`,
        first_name: "Roster",
        last_name: "Actor",
      },
    });
    const student = await prisma.user.create({
      data: {
        email: `roster-student-${crypto.randomUUID()}@test.invalid`,
        first_name: "Roster",
        last_name: "Student",
      },
    });
    const assignmentData = {
      term_instance_id: term.id,
      faculty_id: faculty.id,
      course_id: course.id,
      program_id: program.id,
      year_level: YearLevel.FIRST_YEAR,
    } as const;
    const morning = await prisma.courseAssignment.create({
      data: { ...assignmentData, section: StudentSection.MORNING },
    });
    const afternoon = await prisma.courseAssignment.create({
      data: { ...assignmentData, section: StudentSection.AFTERNOON },
    });

    const membershipData = {
      student_user_id: student.id,
      course_id: course.id,
      term_instance_id: term.id,
      program_id: program.id,
      is_active: true,
      created_by: actor.id,
      updated_by: actor.id,
    } as const;

    try {
      await expect(
        prisma.courseAssignmentMembership.create({
          data: { ...membershipData, course_assignment_id: morning.id, course_id: otherCourse.id },
        })
      ).rejects.toMatchObject({ code: "P2003" });

      const morningMembership = await prisma.courseAssignmentMembership.create({
        data: { ...membershipData, course_assignment_id: morning.id },
      });

      await expect(
        prisma.courseAssignmentMembership.create({
          data: { ...membershipData, course_assignment_id: morning.id },
        })
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.courseAssignmentMembership.create({
          data: { ...membershipData, course_assignment_id: afternoon.id },
        })
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.courseAssignmentMembership.update({
          where: { id: morningMembership.id },
          data: { is_active: false, removed_by: actor.id, removed_at: new Date() },
        })
      ).resolves.toBeTruthy();

      const afternoonMembership = await prisma.courseAssignmentMembership.create({
        data: { ...membershipData, course_assignment_id: afternoon.id },
      });

      await expect(
        prisma.courseAssignmentMembership.update({
          where: { id: morningMembership.id },
          data: { is_active: true, updated_by: actor.id, removed_by: null, removed_at: null },
        })
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.courseAssignmentMembership.update({
          where: { id: afternoonMembership.id },
          data: { is_active: true, removed_by: null, removed_at: null },
        })
      ).resolves.toBeTruthy();

      await expect(
        prisma.courseAssignment.update({
          where: { id: afternoon.id },
          data: { section: StudentSection.EVENING },
        })
      ).rejects.toThrow(/identity is immutable/i);

      await expect(prisma.user.delete({ where: { id: student.id } })).rejects.toMatchObject({ code: "P2003" });
      await expect(prisma.user.delete({ where: { id: actor.id } })).rejects.toMatchObject({ code: "P2003" });

      await prisma.courseAssignment.delete({ where: { id: afternoon.id } });
      await expect(
        prisma.courseAssignmentMembership.findUnique({ where: { id: afternoonMembership.id } })
      ).resolves.toBeNull();

      await prisma.courseAssignment.delete({ where: { id: morning.id } });
      await expect(
        prisma.courseAssignmentMembership.findUnique({ where: { id: morningMembership.id } })
      ).resolves.toBeNull();
    } finally {
      await prisma.courseAssignmentMembership.deleteMany({ where: { student_user_id: student.id } });
      await prisma.courseAssignment.deleteMany({ where: { course_id: course.id } });
      await prisma.course.delete({ where: { id: course.id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: student.id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: actor.id } }).catch(() => undefined);
    }
  }, 30000);
});
