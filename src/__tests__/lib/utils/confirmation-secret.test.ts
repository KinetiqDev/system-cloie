import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getConfirmationSecret", () => {
  it("rejects missing and empty secrets in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONFIRMATION_SECRET", "");
    expect(getConfirmationSecret).toThrow("CONFIRMATION_SECRET must be set in production.");

    vi.stubEnv("CONFIRMATION_SECRET", "  ");
    expect(getConfirmationSecret).toThrow("CONFIRMATION_SECRET must be set in production.");
  });

  it("uses configured secrets and development fallback", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CONFIRMATION_SECRET", "configured-secret");
    expect(getConfirmationSecret()).toBe("configured-secret");

    vi.stubEnv("CONFIRMATION_SECRET", "");
    expect(getConfirmationSecret()).toBe("dev-secret-only");
  });
});
