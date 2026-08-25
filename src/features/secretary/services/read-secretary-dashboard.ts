import { VerificationStatus } from "@prisma/client";
import { resolveActiveAcademicContext } from "@/features/academic-calendar/services/resolve-active-academic-context";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";

export type SecretaryDashboardData = {
  activePeriod: { id: string; label: string } | null;
  inventory: {
    users: number;
    activePrograms: number;
    activeCourses: number;
    activeBaselineInstruments: number;
  };
  attention: {
    studentsAwaitingTermPlacement: number;
    pendingExternalVerification: number;
    activeAssignmentsWithoutRoster: number;
  };
};

export async function readSecretaryDashboard(): Promise<SecretaryDashboardData> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    throw new Error("Secretary access required");
  }

  const activeContext = await resolveActiveAcademicContext();
  const periodId = activeContext.schoolYear ? activeContext.assignmentPeriod?.id : undefined;

  const [
    users,
    activePrograms,
    activeCourses,
    activeBaselineInstruments,
    pendingAlumni,
    pendingIndustryPartners,
    studentsAwaitingTermPlacement,
    activeAssignmentsWithoutRoster,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.program.count({ where: { is_active: true } }),
    prisma.course.count({ where: { is_active: true } }),
    prisma.instrumentTemplate.count({
      where: { is_active: true, program_id: null, faculty_owner_id: null },
    }),
    prisma.alumniProfile.count({ where: { verification_status: VerificationStatus.PENDING } }),
    prisma.industryPartnerProfile.count({
      where: { verification_status: VerificationStatus.PENDING },
    }),
    periodId
      ? prisma.user.count({
          where: {
            is_active: true,
            roles: { some: { role: ROLES.STUDENT } },
            student_profile: { isNot: null },
            enrollments: { none: { term_instance_id: periodId, is_active: true } },
          },
        })
      : Promise.resolve(0),
    periodId
      ? prisma.courseAssignment.count({
          where: {
            term_instance_id: periodId,
            is_active: true,
            memberships: { none: { is_active: true } },
          },
        })
      : Promise.resolve(0),
  ]);

  const assignmentPeriod = activeContext.assignmentPeriod;
  const activePeriod =
    activeContext.schoolYear && assignmentPeriod
      ? {
          id: assignmentPeriod.id,
          label: formatTermInstanceLabel(
            activeContext.schoolYear.code,
            assignmentPeriod.semester,
            assignmentPeriod.term
          ),
        }
      : null;

  return {
    activePeriod,
    inventory: { users, activePrograms, activeCourses, activeBaselineInstruments },
    attention: {
      studentsAwaitingTermPlacement,
      pendingExternalVerification: pendingAlumni + pendingIndustryPartners,
      activeAssignmentsWithoutRoster,
    },
  };
}
