import { cookies } from "next/headers";
import {
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
  verifyLegalAcknowledgementTicket,
} from "./legal-acknowledgement-ticket";
import type { TicketIntent } from "@/features/auth/services/role-intent";

/**
 * Server-side legal acknowledgement gate for identity and role mutations.
 *
 * The OAuth callback already verifies the ticket before the code exchange; this
 * guard extends the same rule to the non-Google paths (issue #649), so no
 * Server Action can create an account, a role, or a role profile without a
 * current, unexpired, version-matched acknowledgement of the same entrance.
 *
 * A missing, expired, tampered, or intent-mismatched ticket fails closed.
 */
export async function requireLegalAcknowledgement(
  expectedIntent: TicketIntent
): Promise<{ acknowledged: true } | { acknowledged: false; reason: string }> {
  try {
    const cookieStore = await cookies();
    const ticket = cookieStore.get(LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME)?.value ?? null;
    const verification = verifyLegalAcknowledgementTicket(ticket, expectedIntent);

    if (!verification.valid) {
      return { acknowledged: false, reason: verification.reason };
    }
    return { acknowledged: true };
  } catch {
    return { acknowledged: false, reason: "not-readable" };
  }
}
