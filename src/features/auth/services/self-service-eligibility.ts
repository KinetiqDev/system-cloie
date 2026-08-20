import { SystemRole } from "@prisma/client";
import { validateRoleDomain } from "./validate-role-domain";

export type SelfServiceEligibilityFailure = {
  destination: "/status/pre-provisioning-required" | `/status/invalid-domain?role=${string}`;
};

/**
 * Resolves whether a self-service role claim may proceed for a user without
 * a stored role. Returns the account-status destination when the claim must
 * be rejected (pre-provisioned role, or invalid email domain for the role),
 * or null when the claim is eligible.
 *
 * Pre-provisioned roles are rejected before domain validation so the
 * `pre-provisioned` outcome of `validateRoleDomain` is never observable
 * through this path, matching the callback's original sequential gates.
 */
export function resolveSelfServiceEligibility(options: {
  email: string;
  targetRole: SystemRole;
  intent: string;
}): SelfServiceEligibilityFailure | null {
  const { email, targetRole, intent } = options;

  const isPreProvisioned =
    targetRole === SystemRole.SECRETARY ||
    targetRole === SystemRole.DEAN ||
    targetRole === SystemRole.PROGRAM_HEAD ||
    targetRole === SystemRole.GEN_ED_COORDINATOR;
  if (isPreProvisioned) {
    return { destination: "/status/pre-provisioning-required" };
  }

  const validation = validateRoleDomain(email, targetRole);
  if (!validation.valid) {
    return { destination: `/status/invalid-domain?role=${encodeURIComponent(intent)}` };
  }

  return null;
}
