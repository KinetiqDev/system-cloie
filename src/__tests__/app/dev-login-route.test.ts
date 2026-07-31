/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSessionFromDevUser: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: vi.fn(),
}));

import { POST } from "@/app/api/auth/dev-login/route";

describe("dev login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  it("rejects demo mode outside development", async () => {
    vi.stubEnv("CLOIE_DEMO_ENABLED", "true");
    vi.stubEnv("CLOIE_DEPLOYMENT_KIND", "dedicated-demo");
    vi.stubEnv("CLOIE_DEMO_SESSION_SECRET", "a".repeat(32));
    vi.stubEnv("CLOIE_DEMO_ALLOWED_USERS", "demo-faculty@cloie.test");

    const response = await POST(
      new Request("http://localhost/api/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email: "demo@acd.edu.ph" }),
      })
    );

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
