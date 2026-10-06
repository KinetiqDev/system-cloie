import { z } from "zod";
import type { GeneralEducationAnalyticsTab } from "./general-education-analytics-state";

/** Section bounds the browser contract promises; provider output is normalized onto them. */
const OBSERVATION_MAX_CHARS = 400;
const EVIDENCE_MAX_ITEMS = 5;
const EVIDENCE_MAX_CHARS = 200;
const CONNECTION_MAX_CHARS = 400;
const LIMITATION_MAX_CHARS = 200;
const REVIEW_QUESTION_MAX_CHARS = 200;

/**
 * Shape only: presence, types, and nullability. Bounds are enforced by
 * `normalizeInsightSection` instead, because a structured-output provider that
 * validates its own generation rejects the entire request when the model writes
 * a sixth evidence line or a longer sentence — which the reader experiences as a
 * randomly unavailable insight.
 */
export const insightSectionSchema = z
  .object({
    observation: z.string(),
    evidence: z.array(z.string()),
    // Providers that honor a strict schema always emit the key, using null when
    // no supportable link exists; JSON-mode providers may omit it instead.
    connection: z.string().nullish(),
    limitation: z.string().nullable(),
    reviewQuestion: z.string().nullable(),
  })
  .nullable();
export type InsightSection = z.infer<typeof insightSectionSchema>;

/**
 * OpenAI-compatible providers do not uniformly honor `response_format`; free
 * tiers in particular may fence the JSON object in markdown. Extract the JSON
 * payload before parsing instead of trusting the raw content shape. Providers
 * that also wrap the object in prose fall back to the outermost braces.
 */
export function parseInsightJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : content).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in AI output");
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function clampInsightText(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars - 1)}…`;
}

/**
 * Bound validated provider prose onto the section contract. A section left with
 * no usable evidence becomes null: without evidence there is no grounded
 * insight to show.
 */
export function normalizeInsightSection(section: InsightSection): InsightSection {
  if (section === null) return null;

  const observation = section.observation.trim();
  if (observation.length === 0) return null;

  const evidence = section.evidence
    .map((item) => clampInsightText(item, EVIDENCE_MAX_CHARS))
    .filter((item) => item.trim().length > 0)
    .slice(0, EVIDENCE_MAX_ITEMS);
  if (evidence.length === 0) return null;

  return {
    observation: clampInsightText(observation, OBSERVATION_MAX_CHARS),
    evidence,
    connection: section.connection
      ? clampInsightText(section.connection, CONNECTION_MAX_CHARS)
      : null,
    limitation: section.limitation
      ? clampInsightText(section.limitation, LIMITATION_MAX_CHARS)
      : null,
    reviewQuestion: section.reviewQuestion
      ? clampInsightText(section.reviewQuestion, REVIEW_QUESTION_MAX_CHARS)
      : null,
  };
}

/**
 * Analytics views that carry an inline evidence-bound insight. Each view gets
 * its own bounded evidence packet and a single validated `InsightSection`,
 * rendered inline by the owning view instead of a dedicated AI tab.
 */
export const ANALYTICS_INSIGHT_VIEWS = [
  "outcomes",
  "courses",
  "stakeholders",
  "trends",
  "qualitative",
] as const;
export type AnalyticsInsightView = (typeof ANALYTICS_INSIGHT_VIEWS)[number];

/**
 * Highest-mention terms carried per prompt in a bounded AI packet. One shared
 * cap keeps the Program Head and Faculty qualitative evidence comparable.
 */
export const AI_PACKET_MAX_PROMPT_TERMS = 6;
/**
 * What the provider actually analyzed vs. what was available. Discloses that
 * interpretation covers bounded aggregate evidence only, never raw written
 * feedback, and names each tier the bound dropped.
 */
export type GeneralEducationViewEvidenceScope = {
  submittedResponseCount: number;
  qualitativeItemCount: number | null;
  /** Deterministic tiers left out of the packet, e.g. "CILO rows: carried 24 of 40 rows." */
  truncations: string[];
  /** Every disclosure that applies to this view, forwarded as model limitations. */
  limitations: string[];
};
/** Validated, bounded per-view interpretation returned to the browser. */
export type GeneralEducationAnalyticsViewInsight = {
  fingerprint: string;
  view: GeneralEducationAnalyticsTab;
  insight: InsightSection;
  evidenceScope: GeneralEducationViewEvidenceScope;
};

type GenerateAiInsightInsufficientDetail = {
  view: GeneralEducationAnalyticsTab;
  submittedResponseCount: number;
  minimumSubmittedResponses: number;
  qualitativeItemCount: number | null;
  minimumQualitativeItems: number;
};

export type GenerateGeneralEducationAiInsightResult =
  | { ok: true; data: GeneralEducationAnalyticsViewInsight }
  | { ok: false; state: "disabled" }
  | { ok: false; state: "unauthorized" }
  | { ok: false; state: "insufficient-evidence"; detail: GenerateAiInsightInsufficientDetail }
  | { ok: false; state: "timeout" }
  | { ok: false; state: "provider-error" }
  | { ok: false; state: "invalid-output" }
  | { ok: false; state: "invalid-request" }
  | { ok: false; state: "unexpected" };
