import { randomUUID } from "node:crypto";

/**
 * Course-assignment lifecycle outcome vocabulary.
 *
 * A lifecycle command runs inside one transaction and signals a refusal by
 * throwing, because a Prisma interactive transaction cannot carry a typed early
 * return without abandoning the transaction. Those codes cross the boundary as
 * `Error` messages, and this module owns both halves of that wire format:
 *
 * - **One code vocabulary.** The literal codes live here, so a throw site and its
 *   translation can never drift apart.
 * - **One exhaustive translation.** Every code maps to a fixed safe message. The
 *   mapping is a `Record` over the code union, so adding a code without a message
 *   fails at compile time rather than falling through to a generic failure.
 * - **Safe failures only.** Raw database errors, internal identifiers, and driver
 *   detail never reach a result. An unexpected failure is reported generically
 *   with a support reference id; its diagnostic detail stays in the server log.
 *
 * Deactivate, activate, and delete previously each repeated the same four-branch
 * translation, and drift between those copies was invisible.
 */

/** Refusal codes a lifecycle command may throw inside its transaction. */
export const LIFECYCLE_REFUSALS = {
  ASSIGNMENT_NOT_FOUND: "ASSIGNMENT_NOT_FOUND",
  COURSE_INACTIVE: "COURSE_INACTIVE",
  COURSE_NOT_FOUND: "COURSE_NOT_FOUND",
  COURSE_PROGRAM_MISMATCH: "COURSE_PROGRAM_MISMATCH",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  SELECTED_PROGRAM_INACTIVE: "SELECTED_PROGRAM_INACTIVE",
  SELECTED_PROGRAM_REQUIRED: "SELECTED_PROGRAM_REQUIRED",
} as const;

type LifecycleRefusal = (typeof LIFECYCLE_REFUSALS)[keyof typeof LIFECYCLE_REFUSALS];

/** The safe user-facing message for each refusal code. */
const REFUSAL_MESSAGES: Record<LifecycleRefusal, string> = {
  ASSIGNMENT_NOT_FOUND: "Assignment not found.",
  COURSE_INACTIVE: "Inactive courses cannot receive new assignments.",
  COURSE_NOT_FOUND: "Course not found.",
  COURSE_PROGRAM_MISMATCH: "Assignment program must match the Course's owning program.",
  OUT_OF_SCOPE: "Course assignment is outside the selected Program.",
  SELECTED_PROGRAM_INACTIVE: "Selected Program is no longer assigned.",
  SELECTED_PROGRAM_REQUIRED: "Selected Program is required.",
};

/**
 * A permission refusal carries its policy reason after this prefix. The policy
 * reason is already a safe string, so it passes through unchanged.
 */
export const PERMISSION_REFUSAL_PREFIX = "PERMISSION:";

/** True when the thrown message names one of the known refusal codes. */
function isLifecycleRefusal(message: string): message is LifecycleRefusal {
  return Object.prototype.hasOwnProperty.call(REFUSAL_MESSAGES, message);
}

/**
 * Translate a thrown lifecycle error into a safe message, or null when it is not
 * a refusal this module recognizes.
 */
export function lifecycleRefusalMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith(PERMISSION_REFUSAL_PREFIX)) {
    return error.message.slice(PERMISSION_REFUSAL_PREFIX.length);
  }
  return isLifecycleRefusal(error.message) ? REFUSAL_MESSAGES[error.message] : null;
}

/**
 * Report an unexpected failure: log the diagnostic detail server-side with a
 * reference id, and return only the safe message plus that id to the caller.
 */
export function unexpectedLifecycleFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string,
  error: unknown
): { success: false; error: string; referenceId: string } {
  const referenceId = randomUUID();
  console.error("Course assignment lifecycle request failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId,
    referenceId,
    error: error instanceof Error ? { name: error.name } : { type: typeof error },
  });
  return {
    success: false as const,
    error: "The course assignment request could not be completed.",
    referenceId,
  };
}
