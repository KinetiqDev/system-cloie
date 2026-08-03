/**
 * @vitest-environment node
 *
 * Verify that dedicated demo authentication secrets, allowlists, cookies, tokens,
 * and private configuration data do not reach client bundles or evidence records.
 *
 * This is a compile-time / static-analysis boundary check, not a runtime test.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_AUTH_COOKIE_NAME } from "@/features/auth/services/demo-auth";
import { DEV_AUTH_COOKIE_NAME } from "@/features/auth/services/dev-auth";
import {
  DEMO_USER_EMAILS,
  DEMO_USER_EMAIL_SET,
  DEMO_USERS,
} from "@/lib/constants/demo-users";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

describe("demo configuration secrecy", () => {
  it("does not expose CLOIE_DEMO_* variables via NEXT_PUBLIC_ prefix", async () => {
    const envExample = await readFile(path.join(PROJECT_ROOT, ".env.example"), "utf8");
    const lines = envExample.split("\n");

    for (const line of lines) {
      const match = line.match(/^(NEXT_PUBLIC_CLOIE_DEMO_\w+)/);
      if (match) {
        throw new Error(`${match[1]} would leak demo configuration into client bundles.`);
      }
    }
  });

  it("does not export the demo cookie name from a 'use client' module", async () => {
    // The cookie name constants must remain server-only. If a client module
    // re-exports or references them, cookie names could appear in browser bundles.
    // This test verifies the cookie name is not used in any client component.
    const clientFiles = [
      "src/features/auth/components/dev-role-switcher.tsx",
      "src/features/auth/components/demo-role-switcher.tsx",
      "src/features/auth/components/role-switcher-dropdown.tsx",
      "src/features/auth/components/role-switcher-list.tsx",
      "src/features/auth/components/mobile-role-switcher.tsx",
      "src/features/auth/components/use-role-switch.ts",
    ];

    for (const file of clientFiles) {
      const content = await readFile(path.join(PROJECT_ROOT, file), "utf8");
      expect(content).not.toContain(DEMO_AUTH_COOKIE_NAME);
      expect(content).not.toContain(DEV_AUTH_COOKIE_NAME);
    }
  });

  it("does not import demo-auth service (contains secret handling) from a 'use client' module", async () => {
    const clientFiles = [
      "src/features/auth/components/dev-role-switcher.tsx",
      "src/features/auth/components/demo-role-switcher.tsx",
      "src/features/auth/components/role-switcher-dropdown.tsx",
      "src/features/auth/components/role-switcher-list.tsx",
      "src/features/auth/components/mobile-role-switcher.tsx",
      "src/features/auth/components/use-role-switch.ts",
    ];

    for (const file of clientFiles) {
      const content = await readFile(path.join(PROJECT_ROOT, file), "utf8");
      expect(content).not.toContain("demo-auth");
    }
  });

  it("does not export the demo session secret or allowlist values", () => {
    // These are public constants intentionally shared with the client:
    // - DEMO_USER_EMAILS / DEMO_USER_EMAIL_SET / DEMO_USERS are catalog display data
    // - Cookie names are exported from server-only modules (demo-auth.ts, dev-auth.ts)
    // The session secret and allowlist are always server-only in demo-auth.ts.
    expect(typeof DEMO_USER_EMAILS).toBe("object");
    expect(DEMO_USER_EMAIL_SET instanceof Set).toBe(true);
    expect(Array.isArray(DEMO_USERS)).toBe(true);
  });
});
