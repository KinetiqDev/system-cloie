import type { YearLevel } from "@prisma/client";

export function courseAssignmentKey(courseCode: string, programCode: string, yearLevel: YearLevel, section: string) {
  return `${courseCode}:${programCode}:${yearLevel}:${section}`;
}

export function requireCourseAssignment(
  assignmentMap: Map<string, string>,
  courseCode: string,
  programCode: string,
  yearLevel: YearLevel,
  section: string
) {
  const assignmentId = assignmentMap.get(courseAssignmentKey(courseCode, programCode, yearLevel, section));
  if (!assignmentId) throw new Error(`Missing course assignment for ${courseCode}`);
  return assignmentId;
}

export async function ensureAssignment(opts: {
  courseBoundId?: string;
  centralDeploymentId?: string;
  respondentId: string;
}) {
  const { prisma } = await import("../../../src/lib/db/prisma");
  const existing = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: opts.courseBoundId ?? null,
      central_deployment_id: opts.centralDeploymentId ?? null,
      respondent_id: opts.respondentId,
    },
  });
  if (existing) return existing;
  return prisma.evaluationAssignment.create({
    data: {
      course_bound_id: opts.courseBoundId ?? null,
      central_deployment_id: opts.centralDeploymentId ?? null,
      respondent_id: opts.respondentId,
    },
  });
}

export async function listSeededRosterStudents(courseAssignmentId: string) {
  const { prisma } = await import("../../../src/lib/db/prisma");
  const memberships = await prisma.courseAssignmentMembership.findMany({
    where: { course_assignment_id: courseAssignmentId, is_active: true },
    select: { student_user_id: true },
    orderBy: { created_at: "asc" },
  });
  const studentIds = memberships.map((membership) => membership.student_user_id);
  if (studentIds.length === 0) {
    throw new Error(`Missing seeded roster students for course assignment ${courseAssignmentId}`);
  }
  return studentIds;
}
