import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import { type EditUserBySecretaryInput, editUserBySecretarySchema } from "../schemas/edit-user";
import { applyProgramHeadAssignmentSet, lockProgramHeadAssignmentSet } from "./manage-users";
import {
  buildConfirmationReview,
  deriveProtectedPayload,
  hydrateReviewLabels,
  projectProtectedEditState,
  protectedChangeDetected,
} from "./secretary-protected-review";
import { backfillCentralAssignmentsForUsers } from "@/features/evaluations/services/central-stakeholder-eligibility";
import CryptoJS from "crypto-js";
import { timingSafeEqual } from "node:crypto";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import { SystemRole, EnrollmentSource } from "@prisma/client";

/** Placement writes need somewhere to write: the single ACTIVE Academic Period. */
const NO_ACTIVE_PERIOD_PLACEMENT_ERROR =
  "No active Academic Period is set. Activate one before setting placement.";

export function generateConfirmationToken(payload: string): string {
  const secret = getConfirmationSecret();
  // We embed an expiration timestamp (e.g. 5 minutes from now)
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const raw = `${payload}|${expiresAt}`;
  const hmac = CryptoJS.HmacSHA256(raw, secret).toString();
  // Return base64 encoded token containing the raw data and signature
  return btoa(`${raw}|${hmac}`);
}

function verifyConfirmationToken(token: string, expectedPayload: string): boolean {
  try {
    const decoded = atob(token);
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;

    const [payload, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) return false;
    if (payload !== expectedPayload) return false;

    const secret = getConfirmationSecret();
    const expectedSignature = CryptoJS.HmacSHA256(`${payload}|${expiresAtStr}`, secret).toString();

    const actual = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Secretary role-based user edit service. #80 establishes the deep-module
 * write seam and base identity behavior. Subsequent role slices (#81–#85)
 * extend the protected-change detection, confirmation protocol, and
 * role-specific record updates without reshaping this surface.
 */
// Preserves the established atomic Secretary edit boundary.
// fallow-ignore-next-line complexity
export async function editUserBySecretary(rawInput: EditUserBySecretaryInput): Promise<
  ServiceResult<{
    id: string;
    protectedConfirmationRequired?: boolean;
    protectedPayload?: string;
    token?: string;
    confirmationReview?: {
      role: SystemRole;
      oldValues: Record<string, string>;
      newValues: Record<string, string>;
    };
  }>
> {
  const parsed = editUserBySecretarySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const session = await resolveAuthSession();
  if (!session?.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  if (session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }

  const { id, expectedRole, name, student, faculty, program_head, alumni, industry_partner } =
    parsed.data;

  if (id === session.userId) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      is_active: true,
      roles: { select: { role: true }, orderBy: { role: "asc" } },
      student_profile: {
        include: { program: { select: { name: true } }, major: { select: { name: true } } },
      },
      enrollments: {
        where: { is_active: true, term: { status: "ACTIVE" } },
        take: 1,
      },
      faculty_program_affiliations: {
        where: { is_active: true, is_primary: true },
        take: 1,
        include: { program: { select: { name: true } } },
      },
      program_head_assignments: {
        include: { program: { select: { name: true, code: true } } },
      },
      alumni_profile: {
        include: { program: { select: { name: true } }, major: { select: { name: true } } },
      },
      industry_partner_profile: { include: { program: { select: { name: true } } } },
    },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  // The form names the role it was loaded for; the save accepts it while the
  // account still holds it. A revocation in between therefore makes the form
  // stale instead of retargeting the submitted role-specific fields.
  const assignedRoles = existing.roles.map((entry) => entry.role);
  if (assignedRoles.length === 0) {
    return { success: false, error: "User has no assigned CLOIE account role." };
  }

  if (!assignedRoles.includes(expectedRole)) {
    return {
      success: false,
      error: "The account roles changed since this form was loaded. Please reload and try again.",
    };
  }

  const existingRole = expectedRole;

  const reviewed = projectProtectedEditState(existing);

  // Detect protected changes — payload signs reviewed before-state + requested after-state.
  const protectedPayload = deriveProtectedPayload(parsed.data, existingRole, id, reviewed);

  // Each role needs an explicit review of its protected fields.
  let confirmationReview = protectedPayload
    ? buildConfirmationReview(parsed.data, existingRole, reviewed)
    : undefined;

  if (confirmationReview) {
    const ids = [
      student?.program_id,
      faculty?.program_id,
      ...(program_head?.program_ids ?? []),
      alumni?.program_id,
      industry_partner?.program_id,
    ].filter((value): value is string => Boolean(value));
    const catalogs = await prisma.program.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, majors: { select: { id: true, name: true } } },
    });
    confirmationReview = hydrateReviewLabels(confirmationReview, parsed.data, catalogs);
  }

  if (existingRole === SystemRole.STUDENT && !student) {
    return { success: false, error: "Student details are required for Student accounts." };
  }
  if (existingRole === SystemRole.FACULTY && !faculty) {
    return { success: false, error: "Faculty details are required for Faculty accounts." };
  }
  if (existingRole === SystemRole.PROGRAM_HEAD && !program_head) {
    return {
      success: false,
      error: "Program Head details are required for Program Head accounts.",
    };
  }
  if (existingRole === SystemRole.ALUMNI && !alumni) {
    return { success: false, error: "Alumni details are required for Alumni accounts." };
  }
  if (existingRole === SystemRole.INDUSTRY_PARTNER && !industry_partner) {
    return {
      success: false,
      error: "Industry Partner details are required for Industry Partner accounts.",
    };
  }
  if (student && Boolean(student.year_level) !== Boolean(student.section)) {
    return { success: false, error: "Year level and section must be provided together." };
  }
  if (student && (student.year_level || student.section)) {
    // Fail before issuing a confirmation token when there is nowhere to place
    // the Student; the save itself re-checks inside the transaction.
    const activePeriod = await prisma.academicTermInstance.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    if (!activePeriod) {
      return { success: false, error: NO_ACTIVE_PERIOD_PLACEMENT_ERROR };
    }
  }

  if (protectedPayload) {
    const requiresConfirmation = protectedChangeDetected(parsed.data, existingRole, reviewed);

    if (requiresConfirmation) {
      if (!parsed.data.confirmationToken) {
        // Issue token and bounce back for confirmation
        return {
          success: true,
          data: {
            id,
            protectedConfirmationRequired: true,
            protectedPayload,
            token: generateConfirmationToken(protectedPayload),
            confirmationReview,
          },
        };
      } else {
        // Verify token
        if (!verifyConfirmationToken(parsed.data.confirmationToken, protectedPayload)) {
          return {
            success: false,
            error: "Invalid or expired confirmation token. Please review the changes again.",
          };
        }
      }
    }
  }

  // Perform the transactional update
  try {
    // Keeps all role-specific updates within one transaction.
    // fallow-ignore-next-line complexity
    await prisma.$transaction(async (tx) => {
      // Base identity update — name correction is not a protected academic change.
      await tx.user.update({
        where: { id },
        data: {
          name,
        },
      });

      // Student role updates
      if (existingRole === SystemRole.STUDENT && student) {
        // Validate major belongs to program and program has active majors requirement
        const program = await tx.program.findUnique({
          where: { id: student.program_id },
          include: { majors: { where: { is_active: true } } },
        });

        if (
          !program ||
          (!program.is_active && program.id !== existing.student_profile?.program_id)
        ) {
          throw new Error("Selected program is archived or inactive.");
        }

        if (program.majors.length > 0) {
          if (!student.major_id) {
            throw new Error("A major is required for the selected program.");
          }
          if (
            !program.majors.some((m) => m.id === student.major_id) &&
            student.major_id !== existing.student_profile?.major_id
          ) {
            throw new Error("Selected major is not valid for this program.");
          }
        } else if (student.major_id) {
          throw new Error("Selected program does not have majors.");
        }

        // Upsert static profile
        await tx.studentAcademicProfile.upsert({
          where: { user_id: id },
          create: {
            user_id: id,
            program_id: student.program_id,
            major_id: student.major_id ?? null,
          },
          update: {
            program_id: student.program_id,
            major_id: student.major_id ?? null,
          },
        });

        // Write the Student's placement for the active term: update their row
        // in place (reactivating a deactivated one), or create the placement
        // when they have none yet. Other terms' enrollments are untouched.
        const activeTerm = await tx.academicTermInstance.findFirst({ where: { status: "ACTIVE" } });
        if (activeTerm) {
          const placement =
            student.year_level && student.section
              ? { year_level: student.year_level, section: student.section }
              : null;
          const enrollment = await tx.studentEnrollment.findUnique({
            where: {
              student_user_id_term_instance_id: {
                student_user_id: id,
                term_instance_id: activeTerm.id,
              },
            },
          });

          if (enrollment) {
            await tx.studentEnrollment.update({
              where: { id: enrollment.id },
              data: {
                program_id: student.program_id,
                major_id: student.major_id ?? null,
                year_level: student.year_level ?? enrollment.year_level,
                section: student.section ?? enrollment.section,
                ...(placement ? { is_active: true } : {}),
              },
            });
          } else if (placement) {
            await tx.studentEnrollment.create({
              data: {
                student_user_id: id,
                term_instance_id: activeTerm.id,
                program_id: student.program_id,
                major_id: student.major_id ?? null,
                year_level: placement.year_level,
                section: placement.section,
                source: EnrollmentSource.SECRETARY,
                created_by: session.userId,
                is_active: true,
              },
            });
          }
        } else if (student.year_level || student.section) {
          throw new Error(NO_ACTIVE_PERIOD_PLACEMENT_ERROR);
        }
      } else if (existingRole === SystemRole.FACULTY && faculty) {
        // Find existing active primary affiliation to see if we need to change it
        const primary = await tx.facultyProgramAffiliation.findFirst({
          where: { faculty_id: id, is_active: true, is_primary: true },
        });

        if (!primary || primary.program_id !== faculty.program_id) {
          const program = await tx.program.findUnique({ where: { id: faculty.program_id } });
          if (!program || !program.is_active)
            throw new Error("Selected program is archived or inactive.");
          if (primary) {
            // Deactivate current primary
            await tx.facultyProgramAffiliation.update({
              where: { id: primary.id },
              data: { is_active: false, is_primary: false },
            });
          }

          // Check if there's an existing record for the target program (active or inactive)
          const existingTarget = await tx.facultyProgramAffiliation.findUnique({
            where: { faculty_id_program_id: { faculty_id: id, program_id: faculty.program_id } },
          });

          if (existingTarget) {
            // Reactivate/promote existing
            await tx.facultyProgramAffiliation.update({
              where: { id: existingTarget.id },
              data: { is_active: true, is_primary: true },
            });
          } else {
            // Create new primary
            await tx.facultyProgramAffiliation.create({
              data: {
                faculty_id: id,
                program_id: faculty.program_id,
                is_active: true,
                is_primary: true,
              },
            });
          }
        }
      } else if (existingRole === SystemRole.PROGRAM_HEAD && program_head) {
        // Serialize assignment-set administration for this target user so a
        // concurrent assignment edit or role revocation cannot interleave
        // with the role and set re-reads below. The locked client is passed
        // to `applyProgramHeadAssignmentSet` below.
        const lockedTx = await lockProgramHeadAssignmentSet(tx, id);

        // The save transaction re-verifies that the target still holds the
        // Program Head role; a role revocation racing this save is denied.
        const roleRecord = await tx.userRole.findUnique({
          where: { user_id_role: { user_id: id, role: SystemRole.PROGRAM_HEAD } },
          select: { role: true },
        });
        if (!roleRecord) {
          throw new Error("The target user no longer has the Program Head role.");
        }

        // Re-read the assignment set inside the transaction and reject a
        // stale confirmation whose reviewed set changed after the review.
        const currentRows = await tx.programHeadAssignment.findMany({
          where: { program_head_id: id },
          select: { program_id: true, is_active: true },
        });
        const txActiveProgramIds = currentRows
          .filter((row) => row.is_active)
          .map((row) => row.program_id)
          .sort();

        if (txActiveProgramIds.join(",") !== reviewed.programHeadActiveIds.join(",")) {
          throw new Error("The assignment set changed since your review. Please review again.");
        }

        const requestedIds = [...program_head.program_ids].sort();
        if (txActiveProgramIds.join(",") !== requestedIds.join(",")) {
          // Validate every newly selected Program under current Program
          // lifecycle rules. Retained active assignments are left untouched.
          const newlySelectedProgramIds = program_head.program_ids.filter(
            (programId) => !txActiveProgramIds.includes(programId)
          );
          if (newlySelectedProgramIds.length > 0) {
            const programs = await tx.program.findMany({
              where: { id: { in: newlySelectedProgramIds } },
              select: { id: true, is_active: true },
            });
            const programStates = new Map(
              programs.map((program) => [program.id, program.is_active])
            );
            const invalidProgram = newlySelectedProgramIds.find(
              (programId) => !programStates.has(programId) || !programStates.get(programId)
            );
            if (invalidProgram) {
              throw new Error("Selected program is archived or inactive.");
            }
          }

          await applyProgramHeadAssignmentSet(lockedTx, {
            programHeadId: id,
            programIds: program_head.program_ids,
          });
        }
      } else if (existingRole === SystemRole.ALUMNI && alumni) {
        const program = await tx.program.findUnique({
          where: { id: alumni.program_id },
          include: { majors: { where: { is_active: true } } },
        });
        if (!program || (!program.is_active && program.id !== existing.alumni_profile?.program_id))
          throw new Error("Selected program is archived or inactive.");
        if (program.majors.length > 0 && !alumni.major_id) {
          throw new Error("A major is required for the selected program.");
        }
        if (
          alumni.major_id &&
          !program.majors.some((major) => major.id === alumni.major_id) &&
          alumni.major_id !== existing.alumni_profile?.major_id
        ) {
          throw new Error("Selected major is not valid for this program.");
        }
        if (program.majors.length === 0 && alumni.major_id) {
          throw new Error("Selected program does not have majors.");
        }
        await tx.alumniProfile.upsert({
          where: { user_id: id },
          create: {
            user_id: id,
            graduation_year: alumni.graduation_year,
            program_id: alumni.program_id,
            major_id: alumni.major_id ?? null,
            verification_status: alumni.verification_status,
          },
          update: {
            graduation_year: alumni.graduation_year,
            program_id: alumni.program_id,
            major_id: alumni.major_id ?? null,
            verification_status: alumni.verification_status,
          },
        });
        const previousAlumni = existing.alumni_profile;
        if (
          alumni.verification_status === "APPROVED" &&
          (previousAlumni?.verification_status !== "APPROVED" ||
            previousAlumni.program_id !== alumni.program_id ||
            (previousAlumni.major_id ?? null) !== (alumni.major_id ?? null))
        ) {
          await backfillCentralAssignmentsForUsers(tx, {
            programId: alumni.program_id,
            majorId: alumni.major_id ?? null,
            targetStakeholder: "ALUMNI",
            userIds: [id],
          });
        }
      } else if (existingRole === SystemRole.INDUSTRY_PARTNER && industry_partner) {
        if (industry_partner.program_id) {
          const program = await tx.program.findUnique({
            where: { id: industry_partner.program_id },
          });
          if (!program || !program.is_active) {
            throw new Error("Selected affiliated program is archived or inactive.");
          }
        }
        await tx.industryPartnerProfile.upsert({
          where: { user_id: id },
          create: {
            user_id: id,
            company_name: industry_partner.company_name,
            position: industry_partner.position || null,
            program_id: industry_partner.program_id ?? null,
            verification_status: industry_partner.verification_status,
          },
          update: {
            company_name: industry_partner.company_name,
            position: industry_partner.position || null,
            program_id: industry_partner.program_id ?? null,
            verification_status: industry_partner.verification_status,
          },
        });
        const previousPartner = existing.industry_partner_profile;
        if (
          industry_partner.verification_status === "APPROVED" &&
          industry_partner.program_id &&
          (previousPartner?.verification_status !== "APPROVED" ||
            (previousPartner.program_id ?? null) !== industry_partner.program_id)
        ) {
          await backfillCentralAssignmentsForUsers(tx, {
            programId: industry_partner.program_id,
            targetStakeholder: "INDUSTRY_PARTNER",
            userIds: [id],
          });
        }
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Database update failed." };
  }

  return { success: true, data: { id } };
}
