import { describe, expect, it, vi } from "vitest";
import {
  LIFECYCLE_REFUSALS,
  lifecycleRefusalMessage,
  PERMISSION_REFUSAL_PREFIX,
  unexpectedLifecycleFailure,
} from "@/features/course-assignments/services/lifecycle-outcomes";

/**
 * The lifecycle outcome seam. The service reaches it through every refusal path,
 * and the tests here pin the two properties the service cannot observe for itself:
 * every code has a safe message, and an unrecognized failure never leaks detail.
 */
describe("course assignment lifecycle outcomes", () => {
  it("translates every refusal code into its own safe message", () => {
    const messages = new Map<string, string>();

    for (const code of Object.values(LIFECYCLE_REFUSALS)) {
      const message = lifecycleRefusalMessage(new Error(code));
      expect(message, `${code} must translate`).toBeTypeOf("string");
      expect(message).not.toBe(code);
      messages.set(code, message as string);
    }

    // A shared message would mean two different refusals are indistinguishable to
    // the roster manager, which is exactly the drift the seam exists to prevent.
    expect(new Set(messages.values()).size).toBe(messages.size);
    expect(lifecycleRefusalMessage(new Error(LIFECYCLE_REFUSALS.OUT_OF_SCOPE))).toBe(
      "Course assignment is outside the selected Program."
    );
  });

  it("passes a permission policy reason through unchanged", () => {
    expect(
      lifecycleRefusalMessage(new Error(`${PERMISSION_REFUSAL_PREFIX}Secretary cannot manage`))
    ).toBe("Secretary cannot manage");
  });

  it("returns null for anything that is not a refusal, so callers fall through to the generic failure", () => {
    expect(lifecycleRefusalMessage(new Error("P2002"))).toBeNull();
    expect(lifecycleRefusalMessage(new Error(""))).toBeNull();
    expect(lifecycleRefusalMessage("ASSIGNMENT_NOT_FOUND")).toBeNull();
    expect(lifecycleRefusalMessage(undefined)).toBeNull();
    // A message that merely contains a code is not a refusal.
    expect(lifecycleRefusalMessage(new Error("wrapped ASSIGNMENT_NOT_FOUND text"))).toBeNull();
  });

  it("reports an unexpected failure generically, logging detail only server-side", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const driverError = new Error('relation "course_assignments" does not exist');
      const result = unexpectedLifecycleFailure(
        "update_assignment",
        "actor-1",
        "assignment-1",
        driverError
      );

      // The caller gets a stable message and a reference id, never the driver text.
      expect(result).toEqual({
        success: false,
        error: "The course assignment request could not be completed.",
        referenceId: expect.any(String),
      });
      expect(JSON.stringify(result)).not.toContain("does not exist");

      // The diagnostic detail stays in the server log, tagged for correlation.
      expect(consoleError).toHaveBeenCalledWith(
        "Course assignment lifecycle request failed",
        expect.objectContaining({
          operation: "update_assignment",
          actorId: "actor-1",
          assignmentId: "assignment-1",
          referenceId: result.referenceId,
          error: { name: "Error" },
        })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("gives each unexpected failure its own reference id", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const first = unexpectedLifecycleFailure("op", undefined, "a1", new Error("boom"));
      const second = unexpectedLifecycleFailure("op", undefined, "a1", new Error("boom"));
      expect(first.referenceId).not.toBe(second.referenceId);
    } finally {
      consoleError.mockRestore();
    }
  });
});
