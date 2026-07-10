export function getConfirmationSecret(): string {
  const secret = process.env.CONFIRMATION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CONFIRMATION_SECRET must be set in production.");
  }
  // ponytail: local/test fallback only; production requires a deployment secret.
  return "dev-secret-only";
}
