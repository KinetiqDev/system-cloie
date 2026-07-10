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
  firstName: string;
  lastName: string;
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
          program: { select: { id: true, code: true, name: true } },
          major: { select: { id: true, name: true } },
        },
      },
      industry_partner_profile: true,
      alumni_profile: true,
    },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const role = user.roles[0]?.role;
  if (!role) {
    return { success: false, error: "User has no assigned CLOIE account role." };
  }

  return {
    success: true,
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      isActive: user.is_active,
      role,
      student: user.student_profile
        ? {
            programId: user.student_profile.program_id,
            programCode: user.student_profile.program?.code ?? null,
            programName: user.student_profile.program?.name ?? null,
            majorId: user.student_profile.major_id,
            majorName: user.student_profile.major?.name ?? null,
            studentIdNumber: user.student_profile.student_id_number,
          }
        : null,
      // #81 will project the active enrollment record when Student placement
      // becomes editable. The dialog surface keeps this slot reserved so the
      // role-aware read seam can grow without reshaping the wire format.
      activeEnrollment: null,
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
          }
        : null,
    },
  };
}
