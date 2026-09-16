// fallow-ignore-file code-duplication
import {
  EnrollmentSource,
  StudentSection,
  SystemRole,
  VerificationStatus,
  YearLevel,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";
import {
  INSTITUTIONAL_EMAIL_MESSAGE,
  type CreateUserBySecretaryInput,
} from "../schemas/create-user";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { backfillCentralAssignmentsForUsers } from "@/features/evaluations/services/central-stakeholder-eligibility";

/**
 * Roles that require an ACD institutional email when a Secretary creates the
 * account or grants the role to an existing account.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.GEN_ED_COORDINATOR,
];

/**
 * Roles that require a program selection when a Secretary creates the account
 * or grants the role to an existing account.
 */
const PROGRAM_REQUIRED_ROLES: SystemRole[] = [
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
];

type ProgramMajorValidationResult =
  | { success: true; activeMajorId: string | null }
  | { success: false; error: string };

async function validateProgramAndMajor(
  programId: string,
  majorId: string | undefined,
  options: { requireMajorIfAvailable: boolean }
): Promise<ProgramMajorValidationResult> {
  const programWithMajors = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      is_active: true,
      majors: {
        where: { is_active: true },
        select: { id: true },
      },
    },
  });

  if (!programWithMajors) {
    return { success: false, error: "The selected program was not found." };
  }

  if (!programWithMajors.is_active) {
    return { success: false, error: "The selected program is no longer active." };
  }

  const programHasActiveMajors = programWithMajors.majors.length > 0;
  if (options.requireMajorIfAvailable && programHasActiveMajors && !majorId) {
    return { success: false, error: "Select a major for this program." };
  }

  if (majorId) {
    const majorBelongsToProgram = programWithMajors.majors.some((major) => major.id === majorId);
    if (!majorBelongsToProgram) {
      return {
        success: false,
        error: "The selected major does not belong to the selected program.",
      };
    }
    return { success: true, activeMajorId: majorId };
  }

  return { success: true, activeMajorId: null };
}

/**
 * The role-entry fields shared by Secretary account creation and role grants on
 * existing accounts. Both entry points must apply the same eligibility rules,
 * so the gates live here once.
 */
type RoleEntryContextInput = {
  role: SystemRole;
  /** Email of the account receiving the role — created or already existing. */
  email: string;
  program_id?: string;
  /** Managed programs for a Program Head grant; legacy single `program_id` falls back to a one-item set. */
  program_ids?: string[];
  major_id?: string;
  year_level?: YearLevel;
  section?: StudentSection;
  graduation_year?: number;
  company_name?: string;
};

/**
 * Applies the role-entry gates for a Secretary-granted role: the
 * institutional-email policy, the required program selection, and the
 * role-specific required fields. Returns the resolved active major so callers
 * persist the same program/major pairing the gates validated.
 */
export async function resolveRoleEntryContext(
  input: RoleEntryContextInput
): Promise<ServiceResult<{ activeMajorId: string | null; programIds: string[] }>> {
  const {
    role,
    email,
    program_id,
    program_ids,
    major_id,
    year_level,
    section,
    graduation_year,
    company_name,
  } = input;

  const emailError = institutionalEmailError(role, email);
  if (emailError) {
    return { success: false, error: emailError };
  }

  const managedProgramIds = resolveManagedProgramIds(role, program_id, program_ids);
  if (role === SystemRole.PROGRAM_HEAD && managedProgramIds.length === 0) {
    return { success: false, error: "Select at least one managed program." };
  }
  if (role !== SystemRole.PROGRAM_HEAD && PROGRAM_REQUIRED_ROLES.includes(role) && !program_id) {
    return { success: false, error: "Select an affiliated program." };
  }

  const programsToVerify =
    role === SystemRole.PROGRAM_HEAD
      ? managedProgramIds
      : role === SystemRole.FACULTY && program_id
        ? [program_id]
        : [];
  const programError = await validateProgramsActive(programsToVerify);
  if (programError) {
    return { success: false, error: programError };
  }

  let activeMajorId: string | null = null;
  if (role === SystemRole.STUDENT) {
    const placementError = studentPlacementError(year_level, section);
    if (placementError) {
      return { success: false, error: placementError };
    }

    const majorResult = await validateProgramAndMajor(program_id!, major_id, {
      requireMajorIfAvailable: true,
    });
    if (!majorResult.success) {
      return { success: false, error: majorResult.error };
    }
    activeMajorId = majorResult.activeMajorId;
  }

  if (role === SystemRole.ALUMNI) {
    const placementError = alumniPlacementError(graduation_year, program_id);
    if (placementError) {
      return { success: false, error: placementError };
    }
    const majorResult = await validateProgramAndMajor(program_id!, major_id, {
      requireMajorIfAvailable: true,
    });
    if (!majorResult.success) {
      return { success: false, error: majorResult.error };
    }
    activeMajorId = majorResult.activeMajorId;
  }

  if (role === SystemRole.INDUSTRY_PARTNER) {
    const partnerError = industryPartnerError(company_name);
    if (partnerError) {
      return { success: false, error: partnerError };
    }
  }

  return { success: true, data: { activeMajorId, programIds: managedProgramIds } };
}

function institutionalEmailError(role: SystemRole, email: string): string | null {
  if (INSTITUTIONAL_EMAIL_ROLES.includes(role) && !isInstitutionalEmail(email)) {
    return INSTITUTIONAL_EMAIL_MESSAGE;
  }
  return null;
}

function resolveManagedProgramIds(
  role: SystemRole,
  program_id: string | undefined,
  program_ids: string[] | undefined
): string[] {
  if (role !== SystemRole.PROGRAM_HEAD) {
    return [];
  }
  const submitted =
    program_ids && program_ids.length > 0 ? program_ids : program_id ? [program_id] : [];
  return [...new Set(submitted)];
}

async function validateProgramsActive(programIds: string[]): Promise<string | null> {
  for (const programId of programIds) {
    const programResult = await validateProgramAndMajor(programId, undefined, {
      requireMajorIfAvailable: false,
    });
    if (!programResult.success) {
      return programResult.error;
    }
  }
  return null;
}

function studentPlacementError(
  year_level: YearLevel | undefined,
  section: StudentSection | undefined
): string | null {
  if (!year_level || !section) {
    return "Year level and section are required.";
  }
  return null;
}

function alumniPlacementError(
  graduation_year: number | undefined,
  program_id: string | undefined
): string | null {
  if (!graduation_year || !program_id) {
    return "Graduation year and program are required.";
  }
  return null;
}

function industryPartnerError(company_name: string | undefined): string | null {
  if (!company_name || company_name.trim().length < 2) {
    return "Company or organization name is required.";
  }
  return null;
}

/**
 * Failure returned when the submitted email already belongs to an account. The
 * caller does not retry creation: it pivots to granting the role on the
 * existing account through `addRoleToExistingUser`.
 */
type UserExistsResult = {
  success: false;
  error: "USER_EXISTS";
  existingUserId: string;
};

type CreateUserBySecretaryResult = ServiceResult<{ id: string }> | UserExistsResult;

export async function createUserBySecretary(
  input: CreateUserBySecretaryInput
): Promise<CreateUserBySecretaryResult> {
  const {
    name,
    email,
    role,
    program_id,
    program_ids,
    major_id,
    year_level,
    section,
    graduation_year,
    company_name,
    position,
  } = input;

  const contextResult = await resolveRoleEntryContext({
    role,
    email,
    program_id,
    program_ids,
    major_id,
    year_level,
    section,
    graduation_year,
    company_name,
  });

  if (!contextResult.success) {
    return contextResult;
  }

  const activeMajorId = contextResult.data.activeMajorId;
  const managedProgramIds = contextResult.data.programIds;

  // 5. An existing account is not a creation failure: the caller pivots to
  // granting the role on that account instead of duplicating the identity.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { success: false, error: "USER_EXISTS", existingUserId: existing.id };
  }

  try {
    // 5. Atomic transaction: create user + role + role-specific records
    const user = await prisma.$transaction(async (tx) => {
      // a. Create User record
      const newUser = await tx.user.create({
        data: {
          // Provisional opaque name required for complete pre-link accounts.
          name,
          email,
          is_active: true,
        },
      });

      // b. Create UserRole record
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role,
        },
      });

      // c. Role-specific records
      switch (role) {
        case SystemRole.FACULTY: {
          // program_id is guaranteed present by the guard above; TypeScript just needs reassurance.
          if (program_id) {
            await tx.facultyProgramAffiliation.create({
              data: {
                faculty_id: newUser.id,
                program_id,
                is_active: true,
                is_primary: true,
              },
            });
          }
          break;
        }

        case SystemRole.PROGRAM_HEAD: {
          // The gate guarantees a non-empty managed set; every program is
          // validated active before the transaction opens.
          for (const managedProgramId of managedProgramIds) {
            await tx.programHeadAssignment.create({
              data: {
                program_head_id: newUser.id,
                program_id: managedProgramId,
                is_active: true,
              },
            });
          }
          break;
        }

        case SystemRole.STUDENT: {
          // Required fields and program_id are guaranteed by guards above.
          await tx.studentAcademicProfile.create({
            data: {
              user_id: newUser.id,
              program_id: program_id!,
              major_id: activeMajorId,
            },
          });

          const activeTerm = await tx.academicTermInstance.findFirst({
            where: { status: "ACTIVE" },
            select: { id: true },
          });

          if (activeTerm) {
            await tx.studentEnrollment.create({
              data: {
                student_user_id: newUser.id,
                term_instance_id: activeTerm.id,
                program_id: program_id!,
                major_id: activeMajorId,
                year_level: year_level!,
                section: section!,
                source: EnrollmentSource.SECRETARY,
              },
            });
          }
          break;
        }
        case SystemRole.INDUSTRY_PARTNER: {
          await tx.industryPartnerProfile.create({
            data: {
              user_id: newUser.id,
              company_name: company_name!.trim(),
              position: position ?? null,
              program_id: program_id ?? null,
              verification_status: VerificationStatus.APPROVED,
            },
          });
          if (program_id) {
            await backfillCentralAssignmentsForUsers(tx, {
              programId: program_id,
              targetStakeholder: "INDUSTRY_PARTNER",
              userIds: [newUser.id],
            });
          }
          break;
        }

        case SystemRole.ALUMNI: {
          await tx.alumniProfile.create({
            data: {
              user_id: newUser.id,
              graduation_year: graduation_year!,
              program_id: program_id!,
              major_id: activeMajorId,
              verification_status: VerificationStatus.APPROVED,
            },
          });
          await backfillCentralAssignmentsForUsers(tx, {
            programId: program_id!,
            majorId: activeMajorId,
            targetStakeholder: "ALUMNI",
            userIds: [newUser.id],
          });
          break;
        }

        // STUDENT branch handled above.
        // ADMIN, DEAN — just the role is sufficient.
        default:
          break;
      }

      return newUser;
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Lost a concurrent race for the same email between the lookup and the
      // insert: the account now exists, so report the same pivot result. Any
      // other unique violation on a brand-new user leaves the generic failure.
      const raced = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (raced) {
        return { success: false, error: "USER_EXISTS", existingUserId: raced.id };
      }

      return { success: false, error: "A user with this email already exists." };
    }

    throw error;
  }
}
