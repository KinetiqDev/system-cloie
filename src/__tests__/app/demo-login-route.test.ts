/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  setCookieMock,
  resolveSessionMock,
  resolveDestinationMock,
  getDemoConfigMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  setCookieMock: vi.fn(),
  resolveSessionMock: vi.fn(),
  resolveDestinationMock: vi.fn(),
  getDemoConfigMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: setCookieMock })),
}));

vi.mock("@/features/auth/services/demo-auth", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/services/demo-auth")>(
    "@/features/auth/services/demo-auth"
  );
  return {
    ...actual,
    createDemoSessionValue: vi.fn(() => "signed-session"),
    getDemoAuthConfig: getDemoConfigMock,
    getDemoCookieOptions: vi.fn(() => ({ httpOnly: true })),
  };
});

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSessionFromDemoUser: resolveSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolveDestinationMock,
}));

import { POST } from "@/app/api/auth/demo-login/route";

describe("demo login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    getDemoConfigMock.mockReturnValue({
      allowedUsers: new Set(["demo-faculty@cloie.test"]),
      sessionSecret: "a".repeat(32),
    });
    resolveSessionMock.mockResolvedValue({
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
    resolveDestinationMock.mockReturnValue("/faculty/dashboard");
    findUniqueMock.mockResolvedValue({
      email: "demo-faculty@cloie.test",
      id: "user-1",
      is_active: true,
    });
  });

  it("creates a dedicated signed session for a configured seeded account", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-faculty@cloie.test" }),
      })
    );

    expect(response.status).toBe(200);
    expect(setCookieMock).toHaveBeenCalledWith("cloie_demo_auth", "signed-session", {
      httpOnly: true,
    });
    expect(resolveSessionMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "demo-faculty@cloie.test",
    });
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("is unavailable when the dedicated demo configuration fails closed", async () => {
    getDemoConfigMock.mockReturnValue(null);

    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-faculty@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed request body without querying Prisma", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("rejects unknown catalog identifiers before querying Prisma", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-dean@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("rejects inactive seeded accounts without creating a session", async () => {
    findUniqueMock.mockResolvedValue({
      email: "demo-faculty@cloie.test",
      id: "user-1",
      is_active: false,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ email: "demo-faculty@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("does not issue a cookie when the resolved account is inactive", async () => {
    resolveSessionMock.mockResolvedValue({
      activeRole: "FACULTY",
      profileGate: { status: "INACTIVE" },
    });

    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo-faculty@cloie.test" }),
      })
    );

    expect(response.status).toBe(404);
    expect(setCookieMock).not.toHaveBeenCalled();
  });
});
