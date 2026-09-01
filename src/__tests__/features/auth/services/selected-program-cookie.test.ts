import { beforeEach, describe, expect, it, vi } from "vitest";

const getCookieMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getCookieMock })),
}));

import {
  readSelectedProgramCookie,
  SELECTED_PROGRAM_COOKIE_NAME,
} from "@/features/auth/services/selected-program-cookie";

describe("selected-program-cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the cookie is not present", async () => {
    getCookieMock.mockReturnValue(undefined);
    await expect(readSelectedProgramCookie()).resolves.toBeNull();
    expect(getCookieMock).toHaveBeenCalledWith(SELECTED_PROGRAM_COOKIE_NAME);
  });

  it("returns the stored program id when the cookie is present", async () => {
    getCookieMock.mockReturnValue({ value: "program-123" });
    await expect(readSelectedProgramCookie()).resolves.toBe("program-123");
    expect(getCookieMock).toHaveBeenCalledWith(SELECTED_PROGRAM_COOKIE_NAME);
  });
});
