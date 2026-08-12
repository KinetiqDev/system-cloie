import { SystemRole, VerificationStatus, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";

/**
 * On-demand edit record projection for the Secretary role-based user edit
 * dialog. It is intentionally narrower than the lightweight list summary in
 * `list-secretary-users-summary` because the dialog only needs what is
 * relevant for the selected user's existing CLOIE account role.
 */
export type SecretaryUserEditRecord = {
  id: string;
  /** Opaque canonical account name (ADR 0014). */
  name: string;
  email: string;
  isActive: boolean;
  role: SystemRole;
  // Populated only for the relevant role slices (Student in #81, etc.).
  student: {
    programId: string | null;
    programCode: string | null;
    programName: string | null;
    majorId: string | null;
    majorName: string | null;
    programIsActive: boolean | null;
    majorIsActive: boolean | null;
    studentIdNumber: string | null;
  } | null;
  // Active-term enrollment record is intentionally not projected here; #81
  // owns the active enrollment projection and placement fields.
  activeEnrollment: {
    id: string;
    termInstanceId: string;
    programId: string;
    majorId: string | null;
    yearLevel: YearLevel;
    section: string | null;
  } | null;
  // Faculty primary program affiliation.
  faculty: {
    primaryProgramId: string | null;
  } | null;
  programHead: {
    // Complete active assignment set used to preselect the Secretary edit
    // dialog fieldset. Historical rows are not projected; they reactivate
    // when the Secretary selects their Program again.
    assignments: Array<{
      programId: string;
      programCode: string | null;
      programName: string | null;
    }>;
  } | null;
  // External verification status for Alumni and Industry Partner accounts.
  verification: {
    status: VerificationStatus;
  } | null;
  // Organization identity for Industry Partner accounts.
  industryPartner: {
    companyName: string;
    position: string | null;
    programId: string | null;
  } | null;
  // Graduate identity for Alumni accounts.
  alumni: {
    graduationYear: number;
    programId: string;
    majorId: string | null;
    programName: string | null;
    majorName: string | null;
    programIsActive: boolean;
    majorIsActive: boolean | null;
  } | null;
};

async function getCurrentSecretaryId(): Promise<ServiceResult<{ id: string; role: SystemRole }>> {
  const session = await resolveAuthSession();
  if (!session?.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  if (session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }
  return { success: true, data: { id: session.userId, role: session.activeRole } };
}

export async function getUserEditRecordBySecretary(
  userId: string
): Promise<ServiceResult<SecretaryUserEditRecord>> {
  const access = await getCurrentSecretaryId();
  if (!access.success) {
    return access;
  }

  if (userId === access.data.id) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { select: { role: true } },
      student_profile: {
        include: {
          program: { select: { code: true, name: true, is_active: true } },
          major: { select: { name: true, is_active: true } },
        },
      },
      enrollments: {
        where: {
          is_active: true,
          term: { status: "ACTIVE" },
        },
        include: {
          term: { select: { id: true, semester: true, school_year: { select: { code: true } } } },
        },
        take: 1, // A student has at most one active enrollment in the active term
      },
      faculty_program_affiliations: {
        where: { is_active: true, is_primary: true },
        take: 1,
      },
      program_head_assignments: {
        include: {
          program: { select: { code: true, name: true } },
        },
      },
      industry_partner_profile: true,
      alumni_profile: {
        include: {
          program: { select: { name: true, is_active: true } },
          major: { select: { name: true, is_active: true } },
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const role = user.roles[0]?.role;
  if (!role) {
    return { success: false, error: "User has no assigned CLOIE account role." };
  }

  const activeEnrollment = user.enrollments?.[0] ?? null;

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.is_active,
      role,
      student: user.student_profile
        ? {
            programId: user.student_profile.program_id,
            programCode: user.student_profile.program?.code ?? null,
            programName: user.student_profile.program?.name ?? null,
            programIsActive: user.student_profile.program?.is_active ?? null,
            majorId: user.student_profile.major_id,
            majorName: user.student_profile.major?.name ?? null,
            majorIsActive: user.student_profile.major?.is_active ?? null,
            studentIdNumber: user.student_profile.student_id_number,
          }
        : null,
      activeEnrollment: activeEnrollment
        ? {
            id: activeEnrollment.id,
            termInstanceId: activeEnrollment.term_instance_id,
            programId: activeEnrollment.program_id,
            majorId: activeEnrollment.major_id,
            yearLevel: activeEnrollment.year_level,
            section: activeEnrollment.section,
          }
        : null,
      faculty: user.faculty_program_affiliations && user.faculty_program_affiliations.length > 0
        ? {
            primaryProgramId: user.faculty_program_affiliations[0].program_id,
          }
        : null,
      programHead: {
        assignments: (user.program_head_assignments ?? [])
          .filter((assignment) => assignment.is_active)
          .map((assignment) => ({
            programId: assignment.program_id,
            programCode: assignment.program?.code ?? null,
            programName: assignment.program?.name ?? null,
          })),
      },
      verification: user.alumni_profile
        ? { status: user.alumni_profile.verification_status }
        : user.industry_partner_profile
          ? { status: user.industry_partner_profile.verification_status }
          : null,
      industryPartner: user.industry_partner_profile
        ? {
            companyName: user.industry_partner_profile.company_name,
            position: user.industry_partner_profile.position,
            programId: user.industry_partner_profile.program_id,
          }
        : null,
      alumni: user.alumni_profile
        ? {
            graduationYear: user.alumni_profile.graduation_year,
            programId: user.alumni_profile.program_id,
            majorId: user.alumni_profile.major_id,
            programName: user.alumni_profile.program?.name ?? null,
            majorName: user.alumni_profile.major?.name ?? null,
            programIsActive: user.alumni_profile.program?.is_active ?? false,
            majorIsActive: user.alumni_profile.major?.is_active ?? null,
          }
        : null,
    },
  };
}
