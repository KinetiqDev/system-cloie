import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import { type EditUserBySecretaryInput, editUserBySecretarySchema } from "../schemas/edit-user";
import { applyProgramHeadAssignmentSet, lockProgramHeadAssignmentSet } from "./manage-users";
import CryptoJS from "crypto-js";
import { timingSafeEqual } from "node:crypto";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import { SystemRole } from "@prisma/client";

type ProgramHeadAssignmentRow = {
  id: string;
  program_id: string;
  is_active: boolean;
  program?: { name: string | null; code: string | null } | null;
};

function activeAssignmentProgramIds(
  assignments: ProgramHeadAssignmentRow[] | undefined
): string[] {
  return (assignments ?? [])
    .filter((assignment) => assignment.is_active)
    .map((assignment) => assignment.program_id)
    .sort();
}

function formatProgramSet(names: string[]): string {
  return names.sort((a, b) => a.localeCompare(b)).join(", ") || "None";
}

/**
 * Derives a deterministic protected payload string for the requested changes.
 * This ensures the confirmation token is bound to exactly these values.
 * For Program Head assignment-set edits the payload signs both the reviewed
 * before set and the desired after set, so a stale confirmation (an
 * intervening administrator change) never silently overwrites the set.
 */
function deriveProtectedPayload(
  parsedData: EditUserBySecretaryInput,
  existingRole: SystemRole,
  userId: string,
  currentActiveProgramIds: string[]
): string | null {
  if (existingRole === SystemRole.STUDENT && parsedData.student) {
    return `STUDENT:id=${userId}:program=${parsedData.student.program_id}:major=${parsedData.student.major_id ?? "null"}:year=${parsedData.student.year_level ?? "null"}:section=${parsedData.student.section ?? "null"}`;
  }
  if (existingRole === SystemRole.FACULTY && parsedData.faculty) {
    return `FACULTY:id=${userId}:program=${parsedData.faculty.program_id}`;
  }
  if (existingRole === SystemRole.PROGRAM_HEAD && parsedData.program_head) {
    const before = currentActiveProgramIds.join(",");
    const after = [...parsedData.program_head.program_ids].sort().join(",");
    return `PROGRAM_HEAD:id=${userId}:before=${before}:after=${after}`;
  }
  if (existingRole === SystemRole.ALUMNI && parsedData.alumni) {
    return `ALUMNI:id=${userId}:program=${parsedData.alumni.program_id}:major=${parsedData.alumni.major_id ?? "null"}:graduationYear=${parsedData.alumni.graduation_year}:verificationStatus=${parsedData.alumni.verification_status}`;
  }
  if (existingRole === SystemRole.INDUSTRY_PARTNER && parsedData.industry_partner) {
    return `INDUSTRY_PARTNER:id=${userId}:company=${parsedData.industry_partner.company_name}:position=${parsedData.industry_partner.position ?? "null"}:program=${parsedData.industry_partner.program_id ?? "null"}:verificationStatus=${parsedData.industry_partner.verification_status}`;
  }
  return null;
}

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

  const { id, first_name, last_name, student, faculty, program_head, alumni, industry_partner } =
    parsed.data;

  if (id === session.userId) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      is_active: true,
      roles: { select: { role: true } },
      student_profile: { include: { program: { select: { name: true } }, major: { select: { name: true } } } },
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
      alumni_profile: { include: { program: { select: { name: true } }, major: { select: { name: true } } } },
      industry_partner_profile: { include: { program: { select: { name: true } } } },
    },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  const existingRole = existing.roles[0]?.role;
  if (!existingRole) {
    return { success: false, error: "User has no assigned CLOIE account role." };
  }

  // The complete reviewed before-set: every currently active assignment.
  const currentActiveProgramIds = activeAssignmentProgramIds(existing.program_head_assignments);

  // Detect protected changes
  const protectedPayload = deriveProtectedPayload(
    parsed.data,
    existingRole,
    id,
    currentActiveProgramIds
  );

  const confirmationReview: {
    role: SystemRole;
    oldValues: Record<string, string>;
    newValues: Record<string, string>;
  } | undefined = protectedPayload
    ? (() : {
        role: SystemRole;
        oldValues: Record<string, string>;
        newValues: Record<string, string>;
      } | undefined => {
        if (existingRole === SystemRole.STUDENT && student) {
          const current = existing.student_profile;
          const enrollment = existing.enrollments[0];
          return {
            role: existingRole,
            oldValues: {
              program: current?.program?.name ?? "None",
              major: current?.major?.name ?? "None",
              year: enrollment?.year_level ? String(enrollment.year_level) : "None",
              section: enrollment?.section ? String(enrollment.section) : "None",
            },
            newValues: {
              program: student.program_id,
              major: student.major_id ?? "None",
              year: student.year_level ? String(student.year_level) : "None",
              section: student.section ? String(student.section) : "None",
            },
          };
        }
        if (existingRole === SystemRole.FACULTY && faculty) {
          return {
            role: existingRole,
            oldValues: { program: existing.faculty_program_affiliations[0]?.program?.name ?? "None" },
            newValues: { program: faculty.program_id },
          };
        }
        if (existingRole === SystemRole.PROGRAM_HEAD && program_head) {
          return {
            role: existingRole,
            oldValues: {
              programs: formatProgramSet(
                existing.program_head_assignments
                  .filter((assignment) => assignment.is_active)
                  .map((assignment) => assignment.program?.name ?? assignment.program_id)
              ),
            },
            newValues: { programs: "" },
          };
        }
        if (existingRole === SystemRole.ALUMNI && alumni) {
          const current = existing.alumni_profile;
          return {
            role: existingRole,
            oldValues: {
              program: current?.program?.name ?? "None",
              major: current?.major?.name ?? "None",
              graduationYear: current ? String(current.graduation_year) : "None",
              verification: current?.verification_status ?? "None",
            },
            newValues: {
              program: alumni.program_id,
              major: alumni.major_id ?? "None",
              graduationYear: String(alumni.graduation_year),
              verification: alumni.verification_status,
            },
          };
        }
        if (existingRole === SystemRole.INDUSTRY_PARTNER && industry_partner) {
          const current = existing.industry_partner_profile;
          return {
            role: existingRole,
            oldValues: {
              company: current?.company_name ?? "None",
              position: current?.position ?? "None",
              program: current?.program?.name ?? "None",
              verification: current?.verification_status ?? "None",
            },
            newValues: {
              company: industry_partner.company_name,
              position: industry_partner.position ?? "None",
              program: industry_partner.program_id ?? "None",
              verification: industry_partner.verification_status,
            },
          };
        }
        return undefined;
      })()
    : undefined;

  if (confirmationReview && prisma.program) {
    const ids = [
      student?.program_id,
      faculty?.program_id,
      ...(program_head?.program_ids ?? []),
      alumni?.program_id,
      industry_partner?.program_id,
    ]
      .filter((value): value is string => Boolean(value));
    const catalogs = await prisma.program.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, majors: { select: { id: true, name: true } } },
    });
    const names = new Map(catalogs.map((program) => [program.id, program.name]));
    const majors = new Map(catalogs.flatMap((program) => program.majors.map((major) => [major.id, major.name])));
    const requestedProgram = ids[0];
    if (requestedProgram) {
      confirmationReview.newValues.program = names.get(requestedProgram) ?? requestedProgram;
    }
    if (program_head) {
      confirmationReview.newValues.programs = formatProgramSet(
        program_head.program_ids.map((programId) => names.get(programId) ?? programId)
      );
    }
    if (student?.major_id || alumni?.major_id) {
      const requestedMajor = student?.major_id ?? alumni?.major_id;
      confirmationReview.newValues.major = majors.get(requestedMajor!) ?? requestedMajor!;
    }
  }

  if (existingRole === SystemRole.STUDENT && !student) {
    return { success: false, error: "Student details are required for Student accounts." };
  }
  if (existingRole === SystemRole.FACULTY && !faculty) {
    return { success: false, error: "Faculty details are required for Faculty accounts." };
  }
  if (existingRole === SystemRole.PROGRAM_HEAD && !program_head) {
    return { success: false, error: "Program Head details are required for Program Head accounts." };
  }
  if (existingRole === SystemRole.ALUMNI && !alumni) {
    return { success: false, error: "Alumni details are required for Alumni accounts." };
  }
  if (existingRole === SystemRole.INDUSTRY_PARTNER && !industry_partner) {
    return { success: false, error: "Industry Partner details are required for Industry Partner accounts." };
  }
  if (student && Boolean(student.year_level) !== Boolean(student.section)) {
    return { success: false, error: "Year level and section must be provided together." };
  }
  if (student && (student.year_level || student.section) && !existing.enrollments[0]) {
    return { success: false, error: "Student has no editable active enrollment." };
  }

  if (protectedPayload) {
    let requiresConfirmation = false;
    if (existingRole === SystemRole.STUDENT && student) {
      const p = existing.student_profile;
      const e = existing.enrollments[0];

      const profileChanged =
        !p || p.program_id !== student.program_id || p.major_id !== (student.major_id ?? null);
      const placementChanged =
        student.year_level &&
        student.section &&
        (!e || e.year_level !== student.year_level || e.section !== student.section);

      if (profileChanged || placementChanged) {
        requiresConfirmation = true;
      }
    } else if (existingRole === SystemRole.FACULTY && faculty) {
      const currentPrimary =
        existing.faculty_program_affiliations && existing.faculty_program_affiliations.length > 0
          ? existing.faculty_program_affiliations[0]
          : null;
      if (!currentPrimary || currentPrimary.program_id !== faculty.program_id) {
        requiresConfirmation = true;
      }
    } else if (existingRole === SystemRole.PROGRAM_HEAD && program_head) {
      const requestedIds = [...program_head.program_ids].sort();
      if (currentActiveProgramIds.join(",") !== requestedIds.join(",")) {
        requiresConfirmation = true;
      }
    } else if (existingRole === SystemRole.ALUMNI && alumni) {
      const profile = existing.alumni_profile;
      if (
        !profile ||
        profile.program_id !== alumni.program_id ||
        profile.major_id !== (alumni.major_id ?? null) ||
        profile.graduation_year !== alumni.graduation_year ||
        profile.verification_status !== alumni.verification_status
      ) {
        requiresConfirmation = true;
      }
    } else if (existingRole === SystemRole.INDUSTRY_PARTNER && industry_partner) {
      const profile = existing.industry_partner_profile;
      if (!profile || profile.verification_status !== industry_partner.verification_status) {
        requiresConfirmation = true;
      }
    }

    if (requiresConfirmation) {
      if (!parsed.data.confirmationToken) {
        // Issue token and bounce back for confirmation
        return {
          success: true,
          data: {
            id,
            protectedConfirmationRequired: true,
            protectedPayload: protectedPayload!,
            token: generateConfirmationToken(protectedPayload!),
            confirmationReview,
          },
        };
      } else {
        // Verify token
        if (!verifyConfirmationToken(parsed.data.confirmationToken, protectedPayload!)) {
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
    await prisma.$transaction(async (tx) => {
      // Base identity update
      await tx.user.update({
        where: { id },
        data: {
          first_name,
          last_name,
        },
      });

      // Student role updates
      if (existingRole === SystemRole.STUDENT && student) {
        // Validate major belongs to program and program has active majors requirement
        const program = await tx.program.findUnique({
          where: { id: student.program_id },
          include: { majors: { where: { is_active: true } } },
        });

         if (!program || (!program.is_active && program.id !== existing.student_profile?.program_id)) {
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
            student_id_number: student.student_id_number,
            program_id: student.program_id,
            major_id: student.major_id ?? null,
          },
          update: {
            student_id_number: student.student_id_number,
            program_id: student.program_id,
            major_id: student.major_id ?? null,
          },
        });

        // Sync active enrollment if present or if placement is being set
        const activeTerm = await tx.academicTermInstance.findFirst({ where: { status: "ACTIVE" } });
        if (activeTerm) {
          const activeEnrollment = await tx.studentEnrollment.findFirst({
            where: { student_user_id: id, is_active: true, term_instance_id: activeTerm.id },
          });

          if (activeEnrollment) {
            // Update existing enrollment
            await tx.studentEnrollment.update({
              where: { id: activeEnrollment.id },
              data: {
                program_id: student.program_id,
                major_id: student.major_id ?? null,
                year_level: student.year_level ?? activeEnrollment.year_level,
                section: student.section ?? activeEnrollment.section,
              },
            });
          }
          // Do NOT create a missing enrollment per spec #79 / #81
        }
      } else if (existingRole === SystemRole.FACULTY && faculty) {
        // Find existing active primary affiliation to see if we need to change it
        const primary = await tx.facultyProgramAffiliation.findFirst({
          where: { faculty_id: id, is_active: true, is_primary: true },
        });

        if (!primary || primary.program_id !== faculty.program_id) {
          const program = await tx.program.findUnique({ where: { id: faculty.program_id } });
          if (!program || !program.is_active) throw new Error("Selected program is archived or inactive.");
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
          where: { user_id: id },
          select: { role: true },
        });
        if (!roleRecord || roleRecord.role !== SystemRole.PROGRAM_HEAD) {
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

        if (txActiveProgramIds.join(",") !== currentActiveProgramIds.join(",")) {
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
            const programStates = new Map(programs.map((program) => [program.id, program.is_active]));
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
