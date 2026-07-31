import { describe, expect, it } from "vitest";
import { SystemRole } from "@prisma/client";
import { intentToRole, isRoleIntent, roleToCanonicalIntent, roleToIntent } from "@/features/auth/services/role-intent";

describe("role intent contract", () => {
  it("serializes all configured roles to canonical callback slugs", () => {
    expect(roleToCanonicalIntent(SystemRole.SECRETARY)).toBe("secretary");
    expect(roleToCanonicalIntent(SystemRole.DEAN)).toBe("dean");
    expect(roleToCanonicalIntent(SystemRole.PROGRAM_HEAD)).toBe("program-head");
    expect(roleToCanonicalIntent(SystemRole.FACULTY)).toBe("faculty");
    expect(roleToCanonicalIntent(SystemRole.STUDENT)).toBe("student");
    expect(roleToCanonicalIntent(SystemRole.ALUMNI)).toBe("alumni");
    expect(roleToCanonicalIntent(SystemRole.INDUSTRY_PARTNER)).toBe("industry-partner");
  });

  it("accepts legacy underscore input but emits the canonical industry partner slug", () => {
    expect(roleToIntent("industry_partner")).toBe("industry-partner");
    expect(intentToRole("industry_partner")).toBe(SystemRole.INDUSTRY_PARTNER);
    expect(isRoleIntent("program_head")).toBe(true);
    expect(isRoleIntent("unknown")).toBe(false);
  });
});
