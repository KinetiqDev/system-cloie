import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDemoAuthConfigMock } = vi.hoisted(() => ({
  getDemoAuthConfigMock: vi.fn(),
}));

vi.mock("@/features/auth/services/demo-auth", () => ({
  getDemoAuthConfig: getDemoAuthConfigMock,
}));

import { resolveShowcaseAccess } from "@/features/design-system/services/resolve-showcase-access";

describe("resolveShowcaseAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  it("grants access in development regardless of demo configuration", () => {
    vi.stubEnv("NODE_ENV", "development");
    getDemoAuthConfigMock.mockReturnValue(null);

    expect(resolveShowcaseAccess()).toBe(true);
    expect(getDemoAuthConfigMock).not.toHaveBeenCalled();
  });

  it("grants access in production when demo configuration is valid", () => {
    getDemoAuthConfigMock.mockReturnValue({ enabled: true });

    expect(resolveShowcaseAccess()).toBe(true);
  });

  it("denies access when demo configuration is absent or malformed", () => {
    getDemoAuthConfigMock.mockReturnValue(null);

    expect(resolveShowcaseAccess()).toBe(false);
  });
});
