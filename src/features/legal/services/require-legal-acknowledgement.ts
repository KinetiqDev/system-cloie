import { cookies } from "next/headers";
import {
  LEGAL_ACKNOWLEDGEMENT_COOKIE_NAME,
  verifyLegalAcknowledgementTicket,
} from "./legal-acknowledgement-ticket";
import type { TicketIntent } from "@/features/auth/services/role-intent";

/**
 * Server-side legal acknowledgement gate for public entry and role requests.
 * The OAuth callback verifies and consumes its ticket before linked-account
 * onboarding. Email signup, verification, password sign-in and recovery verify
 * the external entrance ticket directly. Ordinary authenticated profile and
 * administrative writes rely on their authorized session, not a consumed entry
 * ticket.
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
