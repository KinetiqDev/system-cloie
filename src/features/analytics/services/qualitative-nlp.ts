import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { eng } from "stopword";
import type { WordCloudToken } from "../types";

/**
 * One shared winkNLP instance for every qualitative derivation (token counts
 * and deterministic tone scoring). Loading the model is the expensive part, so
 * it happens once per process rather than once per service module.
 */
export const qualitativeNlp = winkNLP(model);

const qualitativeStopWords: ReadonlySet<string> = new Set(eng);

/** Normalized, stopword-filtered word tokens for one qualitative answer. */
export function tokenizeReviewText(text: string): string[] {
  const tokens = qualitativeNlp.readDoc(text).tokens().out(qualitativeNlp.its.normal) as string[];
  const normalized: string[] = [];

  for (const token of tokens) {
    const candidate = token.toLowerCase();

    if (!/^[a-z][a-z-]*$/.test(candidate)) {
      continue;
    }

    if (qualitativeStopWords.has(candidate)) {
      continue;
    }

    normalized.push(candidate);
  }

  return normalized;
}

export function buildReviewWordCloudTokens(texts: string[]): WordCloudToken[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const token of tokenizeReviewText(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }
      return left.text.localeCompare(right.text);
    });
}
