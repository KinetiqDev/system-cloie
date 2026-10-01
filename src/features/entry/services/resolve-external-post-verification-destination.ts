import { resolveAuthSessionFromUser } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";
import { roleToIntent, type TicketIntent } from "@/features/auth/services/role-intent";
import { resolveProfileGate } from "@/features/users/services/resolve-profile-gate";
import { externalRoleSchema } from "@/lib/schemas/external-entry";
import type { Role } from "@/lib/constants/roles";

/**
 * Resolves where a just-verified external identity goes next.
 *
 * The person has proven inbox control and the identity is now linked to a
 * domain account carrying the role they registered for, so the ordinary
 * post-login resolver owns the destination — including the onboarding form
 * that collects that role's real fields, which the entry form never asks for.
 *
 * Returns null when no session resolves: the verified address belongs to an
 * account this identity cannot use (already linked elsewhere, or an internal
 * Secretary-provisioned account), and the code step keeps its neutral
 * completion message instead of claiming a destination it cannot honour.
 */
export async function resolveExternalPostVerificationDestination(
  authUserId: string,
  requestedRole: Role | null
): Promise<{ activeRole: Role; path: string } | null> {
  const session = await resolveAuthSessionFromUser({ id: authUserId, email: null });
  const selected = externalRoleSchema.safeParse(requestedRole);
  const role =
    selected.success && session.roles.includes(selected.data) ? selected.data : session.activeRole;
  if (!role) return null;

  const profileGate = resolveProfileGate({
    ...session,
    activeRole: role,
    isActive: session.profileGate.status !== "INACTIVE",
  });

  // The role named by the onboarding gate is the one the person is being asked
  // to complete; it is already narrowed to the names roleToIntent understands.
  const intent: TicketIntent | null =
    "intent" in profileGate ? profileGate.intent : roleToIntent(role);

  return {
    activeRole: role,
    path: resolvePostLoginDestination({
      requestedPath: null,
      intent,
      activeRole: role,
      profileGate,
    }),
  };
}
