import { prisma } from "../../../src/lib/db/prisma";
import { courseAssignmentDefinitions, membershipDefinitions } from "../fixtures/course-assignments";
import { courseAssignmentKey } from "../helpers/assignments";
import { U } from "../constants/ids";
import type { CourseAssignmentContext, FoundationContext } from "../types";

export async function seedCourseAssignments(
  { pMap, cMap }: Pick<FoundationContext, "pMap" | "cMap">,
  termInstanceId: string
): Promise<CourseAssignmentContext> {
  console.log("  → Course assignments...");
  const assignmentMap = new Map<string, string>();
  for (const ca of courseAssignmentDefinitions) {
    const course = cMap.get(ca.courseCode);
    const program = pMap.get(ca.programCode);
    if (!course || !program) {
      console.warn(`    ⚠️ Skipping assignment for ${ca.courseCode} - course or program not found`);
      continue;
    }
    const existing = await prisma.courseAssignment.findFirst({
      where: {
        term_instance_id: termInstanceId,
        course_id: course.id,
        program_id: program.id,
        year_level: ca.yearLevel,
        section: ca.section,
      },
    });
    const assignment = existing ?? await prisma.courseAssignment.create({
      data: {
        term_instance_id: termInstanceId,
        course_id: course.id,
        faculty_id: ca.facultyId,
        program_id: program.id,
        year_level: ca.yearLevel,
        section: ca.section,
        is_active: true,
      },
    });
    assignmentMap.set(courseAssignmentKey(ca.courseCode, ca.programCode, ca.yearLevel, ca.section), assignment.id);
    console.log(`    ✓ Assigned ${ca.courseCode} to faculty`);
  }

  console.log("  → Course-assignment memberships...");
  for (const definition of membershipDefinitions) {
    const assignmentId = assignmentMap.get(courseAssignmentKey(definition.course, definition.program, definition.year, definition.section));
    if (!assignmentId) throw new Error(`Missing course assignment for roster fixture ${definition.course}`);
    const assignment = await prisma.courseAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { course_id: true, term_instance_id: true, program_id: true },
    });
    for (const studentUserId of definition.students) {
      await prisma.courseAssignmentMembership.upsert({
        where: { course_assignment_id_student_user_id: { course_assignment_id: assignmentId, student_user_id: studentUserId } },
        update: {
          course_id: assignment.course_id,
          term_instance_id: assignment.term_instance_id,
          program_id: assignment.program_id,
          is_active: true,
          updated_by: U.ADMIN,
          removed_by: null,
          removed_at: null,
        },
        create: {
          course_assignment_id: assignmentId,
          student_user_id: studentUserId,
          course_id: assignment.course_id,
          term_instance_id: assignment.term_instance_id,
          program_id: assignment.program_id,
          is_active: true,
          created_by: U.ADMIN,
          updated_by: U.ADMIN,
        },
      });
    }
  }
  return { assignmentMap };
}
