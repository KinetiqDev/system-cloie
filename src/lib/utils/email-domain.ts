const INSTITUTIONAL_DOMAINS = ["acd.edu.ph", "acdeducation.com"];

/**
 * Checks whether an email address belongs to an ACD institutional domain.
 *
 * The check is performed on the trimmed lowercase address and only accepts
 * exact domain matches for acd.edu.ph or acdeducation.com.
 */
export function isInstitutionalEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) {
    return false;
  }

  const domain = normalized.slice(atIndex + 1);
  return INSTITUTIONAL_DOMAINS.includes(domain);
}
