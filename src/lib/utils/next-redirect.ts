/**
 * `redirect()` travels as a thrown value carrying a `NEXT_REDIRECT` digest, so
 * any `catch` on the way out must rethrow it rather than report navigation as a
 * failure. Shared by the client wrapper that awaits a navigating Server Action
 * and the Server Actions that redirect from inside a guarded block.
 */
export function isNextRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
