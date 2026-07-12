/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCookieMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getCookieMock })),
}));

import { readDevAuthCookie } from "@/features/auth/services/dev-auth";

describe("readDevAuthCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    getCookieMock.mockReturnValue({
      value: JSON.stringify({ email: "demo@acd.edu.ph", userId: "demo-user" }),
    });
  });

  it("rejects a demo cookie outside development", async () => {
    await expect(readDevAuthCookie()).resolves.toBeNull();
    expect(getCookieMock).not.toHaveBeenCalled();
  });
});
