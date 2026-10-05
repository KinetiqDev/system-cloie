import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifySecretaryAccess } from "@/features/academic-calendar/services/secretary-access";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");

describe("secretary-access / verifySecretaryAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({
        userId: "sec-1",
        email: "secretary@test.com",
        roles: [ROLES.SECRETARY],
      })
    );

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("sec-1");
    }
  });

  it("should deny non-secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({
        userId: "faculty-1",
        email: "faculty@test.com",
        roles: [ROLES.FACULTY],
      })
    );

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });

  it("should deny Secretary role when it is not active", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.FACULTY, ROLES.SECRETARY] })
    );

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });

  it("should deny unauthenticated access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null as never);

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });
});
