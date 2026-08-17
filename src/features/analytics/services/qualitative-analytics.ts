import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import type { WordCloudToken } from "../types";
import type {
  ProgramHeadFeedbackTokenDTO,
  ProgramHeadStakeholderSourceKey,
} from "../program-head-analytics-types";

/**
 * Deterministic identifier redaction applied before tokenization.
 * Emails and digit-bearing tokens are replaced with spaces so they never
 * become word-cloud evidence. Faculty dashboard output stays identical when
 * this helper is reused.
 */
export function redactPotentialIdentifiers(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b[A-Za-z]*\d[A-Za-z\d-]*\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
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
 * Redact identifiers, drop empty remnants, tokenize with the shared winkNLP
 * builder, then close the token shape. Sort remains value-desc, then localeCompare.
 */
export function buildRedactedWordCloudTokens(texts: string[]): ProgramHeadFeedbackTokenDTO[] {
  const redacted = texts.map(redactPotentialIdentifiers).filter((text) => text.trim().length > 0);
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
