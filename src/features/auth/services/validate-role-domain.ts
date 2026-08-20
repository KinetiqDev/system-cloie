import { SystemRole } from "@prisma/client";

export interface ValidationResult {
  valid: boolean;
  reason?: "invalid_domain" | "pre-provisioned";
}

/**
 * Validates whether the given email domain is allowed for the specified role intent.
 * 
 * - Internal roles (STUDENT, FACULTY) require institutional domains (@acd.edu.ph or @acdeducation.com).
 * - External roles (ALUMNI, INDUSTRY_PARTNER) allow any domain.
 * - Pre-provisioned roles (SECRETARY, DEAN, PROGRAM_HEAD) must be provisioned by administration and are rejected from self-service.
 */
export function validateRoleDomain(email: string, intent: SystemRole): ValidationResult {
  const normalizedEmail = email.toLowerCase().trim();
  const bootstrapEmail = process.env.BOOTSTRAP_SECRETARY_EMAIL?.trim().toLowerCase();
  const isBootstrap = bootstrapEmail && normalizedEmail === bootstrapEmail;

  // Pre-provisioned roles are rejected unless it is the bootstrap secretary user
  if (
    intent === SystemRole.SECRETARY ||
    intent === SystemRole.DEAN ||
    intent === SystemRole.PROGRAM_HEAD ||
    intent === SystemRole.GEN_ED_COORDINATOR
  ) {
    if (intent === SystemRole.SECRETARY && isBootstrap) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: "pre-provisioned",
    };
  }

  // Internal roles (STUDENT, FACULTY) require institutional domains
  if (intent === SystemRole.STUDENT || intent === SystemRole.FACULTY) {
    const isInstitutional =
      normalizedEmail.endsWith("@acd.edu.ph") ||
      normalizedEmail.endsWith("@acdeducation.com");
    if (!isInstitutional) {
      return {
        valid: false,
        reason: "invalid_domain",
      };
    }
  }

  // External roles (ALUMNI, INDUSTRY_PARTNER) allow any domain
  return { valid: true };
}
