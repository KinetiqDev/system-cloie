import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import {
  type EditUserBySecretaryInput,
  editUserBySecretarySchema,
} from "../schemas/edit-user";
import CryptoJS from "crypto-js";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import { SystemRole } from "@prisma/client";

/**
 * Derives a deterministic protected payload string for the requested changes.
 * This ensures the confirmation token is bound to exactly these values.
 */
function deriveProtectedPayload(parsedData: EditUserBySecretaryInput, existingRole: SystemRole): string | null {
  if (existingRole === SystemRole.STUDENT && parsedData.student) {
    return `STUDENT:program=${parsedData.student.program_id}:major=${parsedData.student.major_id ?? "null"}:year=${parsedData.student.year_level ?? "null"}:section=${parsedData.student.section ?? "null"}`;
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
    
    return signature === expectedSignature;
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
export async function editUserBySecretary(
  rawInput: EditUserBySecretaryInput
): Promise<ServiceResult<{ id: string; protectedConfirmationRequired?: boolean; protectedPayload?: string; token?: string }>> {
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

  const { id, first_name, last_name, student } = parsed.data;

  if (id === session.userId) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { 
      id: true, 
      is_active: true, 
      roles: { select: { role: true } },
      student_profile: true,
      enrollments: {
        where: { is_active: true, term: { is_active: true } },
        take: 1
      }
    },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  const existingRole = existing.roles[0]?.role;
  if (!existingRole) {
    return { success: false, error: "User has no assigned CLOIE account role." };
  }

  // Detect protected changes
  const protectedPayload = deriveProtectedPayload(parsed.data, existingRole);
  
  if (protectedPayload) {
    let requiresConfirmation = false;
    if (existingRole === SystemRole.STUDENT && student) {
      const p = existing.student_profile;
      const e = existing.enrollments[0];
      
      const profileChanged = !p || p.program_id !== student.program_id || p.major_id !== (student.major_id ?? null);
      const placementChanged = (student.year_level && student.section) && 
        (!e || e.year_level !== student.year_level || e.section !== student.section);
        
      if (profileChanged || placementChanged) {
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
            protectedPayload,
            token: generateConfirmationToken(protectedPayload),
          }
        };
      } else {
        // Verify token
        if (!verifyConfirmationToken(parsed.data.confirmationToken, protectedPayload)) {
          return { success: false, error: "Invalid or expired confirmation token. Please review the changes again." };
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
          include: { majors: { where: { is_active: true } } }
        });
        
        if (!program) throw new Error("Selected program not found.");
        
        if (program.majors.length > 0) {
          if (!student.major_id) {
            throw new Error("A major is required for the selected program.");
          }
          if (!program.majors.some(m => m.id === student.major_id)) {
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
          }
        });

        // Sync active enrollment if present or if placement is being set
        const activeTerm = await tx.academicTermInstance.findFirst({ where: { is_active: true } });
        if (activeTerm) {
          const activeEnrollment = await tx.studentEnrollment.findFirst({
            where: { student_user_id: id, is_active: true, term_instance_id: activeTerm.id }
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
              }
            });
          }
          // Do NOT create a missing enrollment per spec #79 / #81
        }
      }
    });
  } catch (err: any) {
    return { success: false, error: err.message ?? "Database update failed." };
  }

  return { success: true, data: { id } };
}
