import { EnrollmentSource, SystemRole, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";
import {
  INSTITUTIONAL_EMAIL_MESSAGE,
  type CreateUserBySecretaryInput,
} from "../schemas/create-user";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

/**
 * Roles that require an ACD institutional email when created by a Secretary.
 */
const INSTITUTIONAL_EMAIL_ROLES: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
];

/**
 * Roles that require a program selection at creation time.
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
    include: {
      majors: {
        where: { is_active: true },
        select: { id: true },
      },
    },
  });

  if (!programWithMajors) {
    return { success: false, error: "The selected program was not found." };
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

export async function createUserBySecretary(
  input: CreateUserBySecretaryInput
): Promise<ServiceResult<{ id: string }>> {
  const {
    first_name,
    last_name,
    email,
    role,
    program_id,
    major_id,
    student_id_number,
    year_level,
    section,
    graduation_year,
    company_name,
    position,
  } = input;

  // 1. Enforce institutional email for internal roles
  if (INSTITUTIONAL_EMAIL_ROLES.includes(role) && !isInstitutionalEmail(email)) {
    return { success: false, error: INSTITUTIONAL_EMAIL_MESSAGE };
  }

  // 2. Enforce required program for Program Head, Faculty, Student, and Alumni
  if (PROGRAM_REQUIRED_ROLES.includes(role) && !program_id) {
    return { success: false, error: "Select an affiliated program." };
  }

  if ((role === SystemRole.PROGRAM_HEAD || role === SystemRole.FACULTY) && program_id) {
    const programResult = await validateProgramAndMajor(program_id, undefined, {
      requireMajorIfAvailable: false,
    });
    if (!programResult.success) {
      return { success: false, error: programResult.error };
    }
  }

  // 3. Validate Student-specific academic context and conditional major requirement
  let activeMajorId: string | null = null;
  if (role === SystemRole.STUDENT) {
    if (!student_id_number || !year_level || !section) {
      return {
        success: false,
        error: "Student ID number, year level, and section are required.",
      };
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
    if (!graduation_year || !program_id) {
      return {
        success: false,
        error: "Graduation year and program are required.",
      };
    }

    const majorResult = await validateProgramAndMajor(program_id, major_id, {
      requireMajorIfAvailable: true,
    });
    if (!majorResult.success) {
      return { success: false, error: majorResult.error };
    }
    activeMajorId = majorResult.activeMajorId;
  }

  // 4. Validate Industry Partner-specific required fields
  if (role === SystemRole.INDUSTRY_PARTNER) {
    if (!company_name || company_name.trim().length < 2) {
      return { success: false, error: "Company or organization name is required." };
    }
  }

  // 5. Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { success: false, error: "A user with this email already exists." };
  }

  try {
    // 5. Atomic transaction: create user + role + role-specific records
    const user = await prisma.$transaction(async (tx) => {
      // a. Create User record
      const newUser = await tx.user.create({
        data: {
          first_name,
          last_name,
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
          if (program_id) {
            await tx.programHeadAssignment.create({
              data: {
                program_head_id: newUser.id,
                program_id,
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
              student_id_number: student_id_number!,
            },
          });

          const activeTerm = await tx.academicTermInstance.findFirst({
            where: { is_active: true },
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
      return { success: false, error: "A user with this email already exists." };
    }

    throw error;
  }
}
