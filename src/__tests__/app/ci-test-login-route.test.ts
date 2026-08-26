/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  setCookieMock,
  resolveSessionMock,
  resolveDestinationMock,
  getCiConfigMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  setCookieMock: vi.fn(),
  resolveSessionMock: vi.fn(),
  resolveDestinationMock: vi.fn(),
  getCiConfigMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: setCookieMock })),
}));

vi.mock("@/features/auth/services/ci-test-auth", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/services/ci-test-auth")>(
    "@/features/auth/services/ci-test-auth"
  );
  return {
    ...actual,
    createCiTestSessionValue: vi.fn(() => "ci-signed-session"),
    getCiTestAuthConfig: getCiConfigMock,
    getCiTestCookieOptions: vi.fn(() => ({ httpOnly: true })),
  };
});

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSessionFromCiTestUser: resolveSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolveDestinationMock,
}));

import { POST } from "@/app/api/auth/ci-test-login/route";

describe("ci test login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    getCiConfigMock.mockReturnValue({
      allowedUsers: new Set(["demo-ph@cloie.test"]),
      sessionSecret: "a".repeat(32),
    });
    resolveSessionMock.mockResolvedValue({
      activeRole: "PROGRAM_HEAD",
      profileGate: { status: "COMPLETE" },
    });
    resolveDestinationMock.mockReturnValue("/program-head");
    findUniqueMock.mockResolvedValue({
      email: "demo-ph@cloie.test",
      id: "user-ci-1",
      is_active: true,
    });
  });

  it("creates an isolated signed session for a configured seeded account", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-ph@cloie.test" }),
      })
    );

    expect(response.status).toBe(200);
    expect(setCookieMock).toHaveBeenCalledWith("cloie_ci_test_auth", "ci-signed-session", {
      httpOnly: true,
    });
    expect(resolveSessionMock).toHaveBeenCalledWith({
      id: "user-ci-1",
      email: "demo-ph@cloie.test",
    });
  });

  it("is unavailable when the CI test configuration fails closed", async () => {
    getCiConfigMock.mockReturnValue(null);

    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-ph@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed request body without querying Prisma", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects unknown catalog identifiers before querying Prisma", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-dean@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects inactive seeded accounts without creating a session", async () => {
    findUniqueMock.mockResolvedValue({
      email: "demo-ph@cloie.test",
      id: "user-ci-1",
      is_active: false,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: JSON.stringify({ email: "demo-ph@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("does not issue a cookie when the resolved account is inactive", async () => {
    resolveSessionMock.mockResolvedValue({
      activeRole: "PROGRAM_HEAD",
      profileGate: { status: "INACTIVE" },
    });

    const response = await POST(
      new Request("http://localhost/api/auth/ci-test-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-ph@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(setCookieMock).not.toHaveBeenCalled();
  });
});
