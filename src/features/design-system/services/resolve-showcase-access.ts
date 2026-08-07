import { getDemoAuthConfig } from "@/features/auth/services/demo-auth";

/**
 * Server-side access policy for the protected Design System Showcase
 * (ADR 0010, Design Decision 5):
 *
 * - `NODE_ENV === "development"` — available to any account that passes the
 *   existing `(app)` account-state guard.
 * - Isolated dedicated demo deployment — available only when
 *   `getDemoAuthConfig()` returns a valid configuration (ADR 0008
 *   fail-closed identity checks).
 * - Primary Production or malformed demo configuration — denied.
 *
 * The policy is environment-owned and never trusts a client-supplied role or
 * public environment flag.
 */
export function resolveShowcaseAccess(): boolean {
  return process.env.NODE_ENV === "development" || getDemoAuthConfig() !== null;
}
