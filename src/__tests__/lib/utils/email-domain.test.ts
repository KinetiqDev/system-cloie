import { describe, expect, it } from "vitest";
import { isInstitutionalEmail } from "@/lib/utils/email-domain";

describe("isInstitutionalEmail", () => {
  it("accepts ACD institutional email addresses", () => {
    expect(isInstitutionalEmail("user@acd.edu.ph")).toBe(true);
    expect(isInstitutionalEmail("user@acdeducation.com")).toBe(true);
    expect(isInstitutionalEmail("  User@ACD.EDU.PH  ")).toBe(true);
  });

  it("rejects non-institutional addresses", () => {
    expect(isInstitutionalEmail("user@gmail.com")).toBe(false);
    expect(isInstitutionalEmail("user@example.org")).toBe(false);
  });

  it("rejects subdomains and prefixed domains that are not exact ACD domains", () => {
    expect(isInstitutionalEmail("user@sub.acd.edu.ph")).toBe(false);
    expect(isInstitutionalEmail("user@notacd.edu.ph")).toBe(false);
    expect(isInstitutionalEmail("user@xacdeducation.com")).toBe(false);
    expect(isInstitutionalEmail("user@myacdeducation.com")).toBe(false);
  });

  it("rejects malformed inputs", () => {
    expect(isInstitutionalEmail("")).toBe(false);
    expect(isInstitutionalEmail("not-an-email")).toBe(false);
    expect(isInstitutionalEmail("@acd.edu.ph")).toBe(false);
  });
});
