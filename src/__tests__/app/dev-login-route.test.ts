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
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
  });

  it("rejects demo mode outside development", async () => {
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
