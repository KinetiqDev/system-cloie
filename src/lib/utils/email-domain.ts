/**
 * Checks whether an email address belongs to an ACD institutional domain.
 *
 * The check is performed on the trimmed lowercase address and only accepts
 * exact matches for @acd.edu.ph or @acdeducation.com.
 */
export function isInstitutionalEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return (
    normalized.endsWith("@acd.edu.ph") || normalized.endsWith("@acdeducation.com")
  );
}
