import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";

const { validateRoleDomainMock } = vi.hoisted(() => ({
  validateRoleDomainMock: vi.fn(),
}));

vi.mock("@/features/auth/services/validate-role-domain", () => ({
  validateRoleDomain: validateRoleDomainMock,
}));

import { resolveSelfServiceEligibility } from "@/features/auth/services/self-service-eligibility";

describe("resolveSelfServiceEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([SystemRole.SECRETARY, SystemRole.DEAN, SystemRole.PROGRAM_HEAD])(
    "rejects %s claims as pre-provisioned without consulting domain validation",
    (targetRole) => {
      expect(
        resolveSelfServiceEligibility({
          email: "user@acd.edu.ph",
          targetRole,
          intent: "secretary",
        })
      ).toEqual({ destination: "/status/pre-provisioning-required" });
      expect(validateRoleDomainMock).not.toHaveBeenCalled();
    }
  );

  it("allows self-service claims with a valid domain", () => {
    validateRoleDomainMock.mockReturnValue({ valid: true });
    expect(
      resolveSelfServiceEligibility({
        email: "student@acd.edu.ph",
        targetRole: SystemRole.STUDENT,
        intent: "student",
      })
    ).toBeNull();
    expect(validateRoleDomainMock).toHaveBeenCalledWith(
      "student@acd.edu.ph",
      SystemRole.STUDENT
    );
  });

  it("allows external role claims for any domain", () => {
    validateRoleDomainMock.mockReturnValue({ valid: true });
    expect(
      resolveSelfServiceEligibility({
        email: "alum@gmail.com",
        targetRole: SystemRole.ALUMNI,
        intent: "alumni",
      })
    ).toBeNull();
  });

  it("rejects self-service claims with an invalid domain and encodes the intent", () => {
    validateRoleDomainMock.mockReturnValue({ valid: false, reason: "invalid_domain" });
    expect(
      resolveSelfServiceEligibility({
        email: "student@gmail.com",
        targetRole: SystemRole.FACULTY,
        intent: "industry partner",
      })
    ).toEqual({ destination: "/status/invalid-domain?role=industry%20partner" });
  });

  it("passes the intent through encodeURIComponent like the original callback branches", () => {
    validateRoleDomainMock.mockReturnValue({ valid: false, reason: "invalid_domain" });
    const result = resolveSelfServiceEligibility({
      email: "user@gmail.com",
      targetRole: SystemRole.STUDENT,
      intent: "student",
    });
    expect(result).toEqual({ destination: "/status/invalid-domain?role=student" });
  });
});
