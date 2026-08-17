import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import type { WordCloudToken } from "../types";
import type {
  ProgramHeadFeedbackTokenDTO,
  ProgramHeadStakeholderSourceKey,
} from "../program-head-analytics-types";

/**
 * Deterministic pre-tokenization identifier policy. The existing Faculty
 * contract removes emails and digit-bearing identifiers only. Program Head
 * Feedback additionally removes visible names and `@` handles before its
 * aggregate browser DTO is built.
 */
export function redactPotentialIdentifiers(text: string, redactAlphabeticIdentifiers = false): string {
  const redacted = text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b[A-Za-z]*\d[A-Za-z\d-]*\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ");

  return (redactAlphabeticIdentifiers
    ? redacted
        .replace(/(^|\s)@[A-Za-z][A-Za-z-]*/g, "$1 ")
        .replace(/\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)*\b/g, " ")
    : redacted
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Closed `{ text, value }` projection used by Faculty and Program Head tokens. */
export function prepareWordCloudTokens(tokens: WordCloudToken[]): WordCloudToken[] {
  return tokens
    .filter(
      (token) =>
        /^[a-z][a-z-]*$/.test(token.text) && Number.isFinite(token.value) && token.value > 0
    )
    .map(({ text, value }) => ({ text, value }));
}

/**
 * Program Head browser-token pipeline. In addition to the established email
 * and digit rules, it removes title-cased names and `@` handles deterministically.
 */
export function buildRedactedWordCloudTokens(texts: string[]): ProgramHeadFeedbackTokenDTO[] {
  const redacted = texts
    .map((text) => redactPotentialIdentifiers(text, true))
    .filter((text) => text.trim().length > 0);
  return prepareWordCloudTokens(buildReviewWordCloudTokens(redacted));
}

export const FEEDBACK_SOURCE_LABELS: Record<ProgramHeadStakeholderSourceKey, string> = {
  COURSE_STUDENT: "Course-bound student evidence",
  CENTRAL_STUDENT: "Central student-respondent evidence",
  ALUMNI: "Alumni evidence",
  INDUSTRY_PARTNER: "Industry Partner evidence",
};

export function feedbackSourceKey(input: {
  courseBound: unknown;
  targetStakeholder?: string | null;
}): ProgramHeadStakeholderSourceKey {
  if (input.courseBound) {
    return "COURSE_STUDENT";
  }
  if (input.targetStakeholder === "ALUMNI") {
    return "ALUMNI";
  }
  if (input.targetStakeholder === "INDUSTRY_PARTNER") {
    return "INDUSTRY_PARTNER";
  }
  return "CENTRAL_STUDENT";
}
