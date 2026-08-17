import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import type { WordCloudToken } from "../types";
import type {
  ProgramHeadFeedbackTokenDTO,
  ProgramHeadStakeholderSourceKey,
} from "../program-head-analytics-types";

/**
 * Deterministic identifier redaction shared with Faculty analytics.
 * Emails and digit-bearing tokens are replaced with spaces before tokenization.
 */
export function redactPotentialIdentifiers(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b[A-Za-z]*\d[A-Za-z\d-]*\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Program Head aggregate feedback additionally excludes visible identifiers. */
function redactProgramHeadFeedbackIdentifiers(text: string): string {
  return redactPotentialIdentifiers(text)
    .replace(/(^|\s)@[A-Za-z][A-Za-z_.-]*/g, "$1 ")
    .replace(/\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)*\b/g, " ")
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
    .map(redactProgramHeadFeedbackIdentifiers)
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
