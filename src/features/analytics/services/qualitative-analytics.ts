import { buildReviewWordCloudTokens, tokenizeReviewText } from "./get-course-bound-review-detail";
import { qualitativeNlp } from "./qualitative-nlp";
import { DASHBOARD_SOURCE_ORDER } from "../program-head-dashboard-labels";
import type { QualitativeToneShape, WordCloudToken } from "../types";
import type { ProgramHeadStakeholderSourceKey } from "../program-head-analytics-types";

const EXPLICIT_PERSON_IDENTIFIER = /\b(?:maria|santos)\b/gi;

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

/**
 * Program Head aggregate feedback removes explicit name identifiers and handles.
 * The bounded name detector avoids treating ordinary lowercase vocabulary as PII.
 */
function redactProgramHeadFeedbackIdentifiers(text: string): string {
  return redactPotentialIdentifiers(text)
    .replace(/(^|\s)@[A-Za-z][A-Za-z_.-]*/g, "$1 ")
    .replace(EXPLICIT_PERSON_IDENTIFIER, " ")
    .replace(/\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)*\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Closed `{ text, value }` projection used by Faculty and Program Head tokens. */
function prepareWordCloudTokens(tokens: WordCloudToken[]): WordCloudToken[] {
  return tokens
    .filter(
      (token) =>
        /^[a-z][a-z-]*$/.test(token.text) && Number.isFinite(token.value) && token.value > 0
    )
    .map(({ text, value }) => ({ text, value }));
}

/**
 * Program Head browser-token pipeline. In addition to the established email
 * and digit rules, it removes title-cased names, explicit identifier tokens,
 * and `@` handles deterministically.
 */
export function buildRedactedWordCloudTokens(texts: string[]): WordCloudToken[] {
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

// ---------------------------------------------------------------------------
// Deterministic qualitative evidence (ADR 0023)
// ---------------------------------------------------------------------------

/**
 * One submitted qualitative answer for the deterministic analyzer. `responseId`
 * is used only to count distinct responses and never leaves the server.
 */
export type QualitativeCorpusItem = {
  text: string;
  responseId: string;
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
  promptLabel: string;
  /**
   * Instrument version the answer came from. `instrumentId` keeps two versions
   * that share a prompt label apart; `instrumentLabel` is what a reviewer or the
   * provider sees, so combined evidence never loses its instrument origin.
   */
  instrumentId: string;
  instrumentLabel: string;
};

/** Readable instrument-version provenance label, e.g. `Program Exit Survey v2`. */
export function instrumentVersionLabel(version: {
  version_number: number;
  template: { name: string };
}): string {
  return `${version.template.name} v${version.version_number}`;
}

/**
 * Visible provenance for each prompt group, keyed by instrument identity. Two
 * instrument versions can share a template name and version number — uniqueness
 * is per template — so a label two distinct instruments share is qualified with
 * the stable instrument identity. Instrument ids are catalog identity, never
 * respondent identity, so nothing about a respondent crosses with them.
 */
export function instrumentProvenanceLabels(
  prompts: ReadonlyArray<{ instrumentId: string; instrumentLabel: string }>
): Map<string, string> {
  const instrumentsByLabel = new Map<string, Set<string>>();
  for (const prompt of prompts) {
    const instruments = instrumentsByLabel.get(prompt.instrumentLabel) ?? new Set<string>();
    instruments.add(prompt.instrumentId);
    instrumentsByLabel.set(prompt.instrumentLabel, instruments);
  }

  return new Map(
    prompts.map((prompt) => [
      prompt.instrumentId,
      (instrumentsByLabel.get(prompt.instrumentLabel)?.size ?? 0) > 1
        ? `${prompt.instrumentLabel} (${prompt.instrumentId})`
        : prompt.instrumentLabel,
    ])
  );
}

/** Identifier-redacted term with both mention volume and respondent reach. */
type QualitativeTermEvidence = {
  text: string;
  mentions: number;
  responseCount: number;
};

/**
 * Closed `{ text, value, responseCount }` projection shared by the Program Head
 * DTO and the Faculty word-cloud contract, so the mention-to-value mapping
 * cannot drift between the two surfaces.
 */
export function toTermToken(term: QualitativeTermEvidence): {
  text: string;
  value: number;
  responseCount: number;
} {
  return { text: term.text, value: term.mentions, responseCount: term.responseCount };
}

type QualitativeToneBand = "positive" | "neutral" | "negative";

type QualitativeSourceEvidence = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
  itemCount: number;
  responseCount: number;
  tone: QualitativeToneShape;
};

type QualitativePromptEvidence = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  sourceLabel: string;
  promptLabel: string;
  /** Stable instrument identity; two versions can share a visible label. */
  instrumentId: string;
  instrumentLabel: string;
  itemCount: number;
  responseCount: number;
  tone: QualitativeToneShape;
  terms: QualitativeTermEvidence[];
};

export type QualitativeCorpusEvidence = {
  terms: QualitativeTermEvidence[];
  sources: QualitativeSourceEvidence[];
  tone: QualitativeToneShape;
  prompts: QualitativePromptEvidence[];
};

/** Inclusive band thresholds over the bundled winkNLP lexicon score. */
export const QUALITATIVE_TONE_POSITIVE_MIN = 0.2;
export const QUALITATIVE_TONE_NEGATIVE_MAX = -0.2;

/** Highest-mention terms retained per prompt in the structured evidence. */
export const QUALITATIVE_PROMPT_TERM_CAP = 8;

export function bandQualitativeTone(score: number): QualitativeToneBand {
  if (score >= QUALITATIVE_TONE_POSITIVE_MIN) {
    return "positive";
  }
  if (score <= QUALITATIVE_TONE_NEGATIVE_MAX) {
    return "negative";
  }
  return "neutral";
}

/**
 * Deterministic tone score in `[-1, 1]` from the bundled winkNLP lexicon. It
 * scores the answer as submitted: the identifier redaction deletes title-cased
 * and digit-bearing tokens, which would bias tone toward neutral. Only band
 * counts derived from this score ever leave the server.
 */
export function scoreQualitativeTone(text: string): number {
  if (text.trim().length === 0) {
    return 0;
  }
  const score = qualitativeNlp.readDoc(text).out(qualitativeNlp.its.sentiment);
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
}

type PreparedQualitativeItem = {
  item: QualitativeCorpusItem;
  tokens: string[];
  toneBand: QualitativeToneBand;
};

type TermCount = { mentions: number; responseIds: Set<string> };

/**
 * Redact, tokenize, and tone-score each answer once. Answers that are blank are
 * ignored; an answer that redacts to nothing still counts in the corpus (it was
 * submitted) and is still tone-scored, but it contributes no term.
 */
function prepareQualitativeItems(items: QualitativeCorpusItem[]): PreparedQualitativeItem[] {
  const prepared: PreparedQualitativeItem[] = [];

  for (const item of items) {
    if (item.text.trim().length === 0) {
      continue;
    }
    prepared.push({
      item,
      tokens: tokenizeReviewText(redactProgramHeadFeedbackIdentifiers(item.text)),
      toneBand: bandQualitativeTone(scoreQualitativeTone(item.text)),
    });
  }

  return prepared;
}

function collectTermCounts(entries: PreparedQualitativeItem[]): Map<string, TermCount> {
  const counts = new Map<string, TermCount>();

  for (const { item, tokens } of entries) {
    for (const token of tokens) {
      const count = counts.get(token) ?? { mentions: 0, responseIds: new Set<string>() };
      count.mentions += 1;
      count.responseIds.add(item.responseId);
      counts.set(token, count);
    }
  }

  return counts;
}

/** Mentions descending, then respondent reach, then term for a stable packet. */
function orderTermEvidence(counts: Map<string, TermCount>): QualitativeTermEvidence[] {
  return [...counts.entries()]
    .map(([text, count]) => ({
      text,
      mentions: count.mentions,
      responseCount: count.responseIds.size,
    }))
    .sort(
      (left, right) =>
        right.mentions - left.mentions ||
        right.responseCount - left.responseCount ||
        left.text.localeCompare(right.text)
    );
}

function toneShapeFor(entries: PreparedQualitativeItem[]): QualitativeToneShape {
  const shape: QualitativeToneShape = {
    scoredItemCount: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  for (const { toneBand } of entries) {
    shape.scoredItemCount += 1;
    shape[toneBand] += 1;
  }

  return shape;
}

function groupQualitativeItems(
  entries: PreparedQualitativeItem[],
  keyOf: (item: QualitativeCorpusItem) => string
): Map<string, PreparedQualitativeItem[]> {
  const groups = new Map<string, PreparedQualitativeItem[]>();

  for (const entry of entries) {
    const key = keyOf(entry.item);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Server-only deterministic qualitative evidence: identifier-redacted term
 * prevalence, per-source and per-prompt structure, and the tone distribution.
 * Raw answers, sentences, and response identities stay inside this function.
 */
export function analyzeQualitativeCorpus(
  items: QualitativeCorpusItem[]
): QualitativeCorpusEvidence {
  const prepared = prepareQualitativeItems(items);

  const sources = [...groupQualitativeItems(prepared, (item) => item.sourceKey).values()]
    .map<QualitativeSourceEvidence>((group) => ({
      sourceKey: group[0]!.item.sourceKey,
      sourceLabel: group[0]!.item.sourceLabel,
      itemCount: group.length,
      responseCount: new Set(group.map(({ item }) => item.responseId)).size,
      tone: toneShapeFor(group),
    }))
    .sort(
      (left, right) =>
        DASHBOARD_SOURCE_ORDER.indexOf(left.sourceKey) -
        DASHBOARD_SOURCE_ORDER.indexOf(right.sourceKey)
    );

  const prompts = [
    ...groupQualitativeItems(
      prepared,
      (item) =>
        `${item.sourceKey}\u0000${item.sourceLabel}\u0000${item.instrumentId}\u0000${item.promptLabel}`
    ).values(),
  ]
    .map<QualitativePromptEvidence>((group) => ({
      sourceKey: group[0]!.item.sourceKey,
      sourceLabel: group[0]!.item.sourceLabel,
      promptLabel: group[0]!.item.promptLabel,
      instrumentId: group[0]!.item.instrumentId,
      instrumentLabel: group[0]!.item.instrumentLabel,
      itemCount: group.length,
      responseCount: new Set(group.map(({ item }) => item.responseId)).size,
      tone: toneShapeFor(group),
      terms: orderTermEvidence(collectTermCounts(group)).slice(0, QUALITATIVE_PROMPT_TERM_CAP),
    }))
    .sort(
      (left, right) =>
        right.itemCount - left.itemCount ||
        left.sourceLabel.localeCompare(right.sourceLabel) ||
        left.promptLabel.localeCompare(right.promptLabel) ||
        left.instrumentLabel.localeCompare(right.instrumentLabel)
    );

  return {
    terms: orderTermEvidence(collectTermCounts(prepared)),
    sources,
    tone: toneShapeFor(prepared),
    prompts,
  };
}
