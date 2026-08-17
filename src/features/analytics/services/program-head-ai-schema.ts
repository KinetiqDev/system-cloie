import { AcademicSemester } from "@prisma/client";
import { z } from "zod";
import { ANALYTICS_TABS } from "./program-head-analytics-state";

/**
 * Server-only CLOIE_AI_* configuration and Zod contracts for bounded AI
 * Insights. This module must never be imported from client components: it
 * reads process.env and pins the provider output contract.
 */

const AI_ENABLED_FIELD = "CLOIE_AI_ENABLED";
const AI_API_KEY_FIELD = "CLOIE_AI_API_KEY";
const AI_BASE_URL_FIELD = "CLOIE_AI_BASE_URL";
const AI_MODEL_FIELD = "CLOIE_AI_MODEL";
const AI_MIN_SUBMITTED_RESPONSES_FIELD = "CLOIE_AI_MIN_SUBMITTED_RESPONSES";
const AI_MIN_QUALITATIVE_ITEMS_FIELD = "CLOIE_AI_MIN_QUALITATIVE_ITEMS";
const AI_MAX_TOKENS_FIELD = "CLOIE_AI_MAX_TOKENS";
const AI_MAX_PACKET_CHARS_FIELD = "CLOIE_AI_MAX_PACKET_CHARS";

/** Default caps applied when the optional limits are unset. */
const AI_DEFAULT_MAX_TOKENS = 50;
const AI_DEFAULT_MAX_PACKET_CHARS = 16_000;

/** Provider call timeout; a timeout surfaces as a recoverable AI state. */
export const AI_PROVIDER_TIMEOUT_MS = 60_000;

/** Hard cap on validated output characters before Zod parsing. */
export const AI_MAX_OUTPUT_CHARS = 12_000;

/** Validated server-only AI configuration. */
export type AiConfiguration = {
  apiKey: string;
  baseUrl: string;
  model: string;
  minimumSubmittedResponses: number;
  minimumQualitativeItems: number;
  maxPacketChars: number;
  maxTokens: number;
};

function positiveIntegerEnv(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Load and validate the server-only AI configuration. Returns null whenever
 * the feature is not explicitly enabled or any required configuration is
 * missing or malformed; callers treat null as "disabled" and never invoke a
 * provider.
 */
export function loadAiConfiguration(): AiConfiguration | null {
  if (process.env[AI_ENABLED_FIELD] !== "true") {
    return null;
  }

  const apiKey = process.env[AI_API_KEY_FIELD]?.trim();
  const baseUrl = process.env[AI_BASE_URL_FIELD]?.trim();
  const model = process.env[AI_MODEL_FIELD]?.trim();
  const minimumSubmittedResponses = positiveIntegerEnv(
    process.env[AI_MIN_SUBMITTED_RESPONSES_FIELD]
  );
  const minimumQualitativeItems = positiveIntegerEnv(
    process.env[AI_MIN_QUALITATIVE_ITEMS_FIELD]
  );

  if (!apiKey || !baseUrl || !model || minimumSubmittedResponses === null || minimumQualitativeItems === null) {
    return null;
  }

  return {
    apiKey,
    baseUrl,
    model,
    minimumSubmittedResponses,
    minimumQualitativeItems,
    maxPacketChars: positiveIntegerEnv(process.env[AI_MAX_PACKET_CHARS_FIELD]) ?? AI_DEFAULT_MAX_PACKET_CHARS,
    maxTokens: positiveIntegerEnv(process.env[AI_MAX_TOKENS_FIELD]) ?? AI_DEFAULT_MAX_TOKENS,
  };
}

/**
 * Fixed sentiment vocabulary the provider may assign to bounded evidence
 * categories. The union is intentionally narrow so System CLOIE can compute
 * deterministic counts and percentages.
 */
export const AI_SENTIMENT_STATUSES = ["positive", "negative", "neutral", "mixed"] as const;

const boundedText = (max: number) => z.string().trim().min(1).max(max);

const aiThemeSchema = z.object({
  name: boundedText(80),
  summary: boundedText(300),
});

const aiSentimentClassificationSchema = z.object({
  evidenceCategory: boundedText(80),
  sentiment: z.enum(AI_SENTIMENT_STATUSES),
  rationale: boundedText(200),
});

/**
 * Structured provider output contract. Every field is bounded; oversized,
 * malformed, or schema-invalid output is rejected before serialization and
 * never reaches the browser.
 */
export const aiInsightOutputSchema = z.object({
  summary: boundedText(400),
  strengths: z.array(boundedText(300)).max(5),
  areasForReview: z.array(boundedText(300)).max(5),
  themes: z.array(aiThemeSchema).max(5),
  sentimentClassifications: z.array(aiSentimentClassificationSchema).max(8),
  questionsForHumanReview: z.array(boundedText(300)).max(5),
  limitations: z.array(boundedText(300)).max(5),
});

/** Parsed, validated provider output type. */
type AiInsightOutput = z.infer<typeof aiInsightOutputSchema>;

/**
 * The AI Server Action accepts only the selected `programId` and validated
 * tab/filter state. Unknown keys (client-supplied aggregates, comments, or
 * identities) are rejected outright; evidence is never read from the client.
 */
export const aiActionInputSchema = z
  .object({
    programId: z.string().uuid(),
    filters: z.object({
      tab: z.enum(ANALYTICS_TABS),
      schoolYearId: z.string().uuid().optional(),
      semester: z.nativeEnum(AcademicSemester).optional(),
      termInstanceId: z.string().uuid().optional(),
    }),
  })
  .strict();

/** Validated Server Action input. */
type AiActionInput = z.infer<typeof aiActionInputSchema>;

/**
 * Fixed instruction boundary markers. Qualitative token text is embedded as
 * data between these markers; the surrounding user instruction tells the
 * provider to treat anything inside as evidence data, never instructions.
 */
export const AI_EVIDENCE_START = "<system-cloie-evidence>";
export const AI_EVIDENCE_END = "</system-cloie-evidence>";