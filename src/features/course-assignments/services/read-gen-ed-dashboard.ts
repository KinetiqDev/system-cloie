import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveActiveAcademicContext } from "@/features/academic-calendar/services/resolve-active-academic-context";
import {
  getGeneralEducationDashboardEvidence,
  type GeneralEducationDashboardEvidence,
} from "@/features/analytics/services/general-education-dashboard-evidence";

export class GenEdDashboardUnauthorizedError extends Error {
  constructor(message = "General Education Coordinator access required.") {
    super(message);
    this.name = "GenEdDashboardUnauthorizedError";
  }
}

export type GenEdDashboardData = {
  period: { id: string; label: string | null } | null;
  coverage: {
    activeCourseCount: number;
    activeAssignmentCount: number;
    reachedProgramCount: number;
    activeProgramCount: number;
    assignedCourseCount: number;
    assignmentCoverageRate: number | null;
  };
  attention: {
    unassignedCourseCount: number;
    unmappedCiloCount: number;
    unreachedProgramCount: number;
    opportunitiesWithoutSubmissions: boolean;
  };
  evidence: GeneralEducationDashboardEvidence | null;
  evidenceState: "available" | "no-active-period" | "read-failed";
  emptyReason: "no-active-period" | "no-courses" | null;
};

export async function getGenEdDashboard(): Promise<GenEdDashboardData> {
  const session = await resolveAuthSession();
  if (!session) throw new GenEdDashboardUnauthorizedError("Authentication required.");
  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    throw new GenEdDashboardUnauthorizedError("General Education Coordinator access required.");
  }

  const academicContext = await resolveActiveAcademicContext();
  const period = academicContext.assignmentPeriod;
  const periodWhere = period
    ? { term_instance_id: period.id }
    : { term_instance_id: "__no_active_period__" };
  const assignmentWhere = {
    is_active: true,
    ...periodWhere,
    course: { course_scope: "GENERAL_EDUCATION" as const, is_active: true },
  };

  const [
    activeCourseCount,
    activeAssignmentCount,
    assignedCourseCount,
    unassignedCourseCount,
    activeAssignmentsByProgram,
    activeProgramCount,
    unmappedCiloCount,
    evidenceRead,
  ] = await Promise.all([
    prisma.course.count({ where: { course_scope: "GENERAL_EDUCATION", is_active: true } }),
    prisma.courseAssignment.count({ where: assignmentWhere }),
    prisma.course.count({
      where: {
        course_scope: "GENERAL_EDUCATION",
        is_active: true,
        course_assignments: { some: { is_active: true, ...periodWhere } },
      },
    }),
    prisma.course.count({
      where: {
        course_scope: "GENERAL_EDUCATION",
        is_active: true,
        course_assignments: { none: { is_active: true, ...periodWhere } },
      },
    }),
    prisma.courseAssignment.groupBy({ by: ["program_id"], where: assignmentWhere, _count: true }),
    prisma.program.count({ where: { is_active: true } }),
    prisma.cILO.count({
      where: {
        is_active: true,
        course: { is_active: true, course_scope: "GENERAL_EDUCATION" },
        cilo_institutional_outcome_mappings: {
          none: {
            manifestation: { not: null },
            institutional_outcome: { is_active: true },
          },
        },
      },
    }),
    period
      ? getGeneralEducationDashboardEvidence(period.id)
          .then((data) => ({ data, failed: false as const }))
          .catch(() => ({ data: null, failed: true as const }))
      : Promise.resolve({ data: null, failed: false as const }),
  ]);

  const reachedProgramCount = activeAssignmentsByProgram.length;
  const evidence = evidenceRead.data;
  const assignmentCoverageRate =
    !period || activeCourseCount === 0 ? null : assignedCourseCount / activeCourseCount;
  const periodLabel =
    period && academicContext.schoolYear
      ? formatTermInstanceLabel(academicContext.schoolYear.code, period.semester, period.term)
      : null;
  const emptyReason = !period
    ? ("no-active-period" as const)
    : activeCourseCount === 0
      ? ("no-courses" as const)
      : null;

  return {
    period: period ? { id: period.id, label: periodLabel } : null,
    coverage: {
      activeCourseCount,
      activeAssignmentCount,
      reachedProgramCount,
      activeProgramCount,
      assignedCourseCount,
      assignmentCoverageRate,
    },
    attention: {
      unassignedCourseCount: period ? unassignedCourseCount : 0,
      unmappedCiloCount,
      unreachedProgramCount: period ? Math.max(0, activeProgramCount - reachedProgramCount) : 0,
      opportunitiesWithoutSubmissions:
        evidence !== null &&
        evidence.evaluationOpportunityCount > 0 &&
        evidence.submittedResponseCount === 0,
    },
    evidence,
    evidenceState: !period ? "no-active-period" : evidenceRead.failed ? "read-failed" : "available",
    emptyReason,
  };
}
