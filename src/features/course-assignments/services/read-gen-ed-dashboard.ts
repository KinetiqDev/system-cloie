import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

// Intentionally exported for consumers to distinguish coordinator auth failure (mirrors DeanReadModelUnauthorizedError).
// fallow-ignore-next-line unused-export
export class GenEdDashboardUnauthorizedError extends Error {
  constructor(message = "General Education Coordinator access required.") {
    super(message);
    this.name = "GenEdDashboardUnauthorizedError";
  }
}

export type GenEdDashboardData = {
  activeAssignments: number;
  geCourses: number;
  programsWithAssignments: number;
  emptyReason: "no-courses" | "no-assignments" | null;
};

export async function getGenEdDashboard(): Promise<GenEdDashboardData> {
  const session = await resolveAuthSession();
  if (!session) throw new GenEdDashboardUnauthorizedError("Authentication required.");
  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    throw new GenEdDashboardUnauthorizedError("General Education Coordinator access required.");
  }

  const [activeAssignments, geCourses, activeGeAssignmentsByProgram] = await Promise.all([
    prisma.courseAssignment.count({
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION", is_active: true } },
    }),
    prisma.course.count({ where: { course_scope: "GENERAL_EDUCATION", is_active: true } }),
    prisma.courseAssignment.groupBy({
      by: ["program_id"],
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION", is_active: true } },
      _count: true,
    }),
  ]);

  const emptyReason =
    geCourses === 0
      ? ("no-courses" as const)
      : activeAssignments === 0
        ? ("no-assignments" as const)
        : null;

  return {
    activeAssignments,
    geCourses,
    programsWithAssignments: activeGeAssignmentsByProgram.length,
    emptyReason,
  };
}
