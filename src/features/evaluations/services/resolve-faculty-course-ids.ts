import { prisma } from "@/lib/db/prisma";

/**
 * Resolve course IDs that the faculty member is assigned to.
 * Returns course IDs from active assignment-period assignments only.
 */
export async function resolveFacultyCourseIds(
  facultyId: string,
  termInstanceId?: string
): Promise<string[]> {
  if (termInstanceId) {
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        faculty_id: facultyId,
        term_instance_id: termInstanceId,
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
    });
    return assignments.map((a) => a.course_id);
  } else {
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        faculty_id: facultyId,
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { course_id: true },
      distinct: ["course_id"],
    });
    return assignments.map((a) => a.course_id);
  }
}
