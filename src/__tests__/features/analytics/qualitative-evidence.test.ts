import { describe, expect, it } from "vitest";
import {
  QUALITATIVE_PROMPT_TERM_CAP,
  QUALITATIVE_TONE_NEGATIVE_MAX,
  QUALITATIVE_TONE_POSITIVE_MIN,
  analyzeQualitativeCorpus,
  bandQualitativeTone,
  scoreQualitativeTone,
  type QualitativeCorpusItem,
} from "@/features/analytics/services/qualitative-analytics";

function item(overrides: Partial<QualitativeCorpusItem> = {}): QualitativeCorpusItem {
  return {
    text: "The instructor was excellent and very helpful.",
    responseId: "response-1",
    sourceKey: "COURSE_STUDENT",
    sourceLabel: "Course-bound student evidence",
    promptLabel: "What worked well?",
    ...overrides,
  };
}

describe("bandQualitativeTone", () => {
  it("bands scores at the documented inclusive thresholds", () => {
    expect(bandQualitativeTone(QUALITATIVE_TONE_POSITIVE_MIN)).toBe("positive");
    expect(bandQualitativeTone(QUALITATIVE_TONE_POSITIVE_MIN - 0.0001)).toBe("neutral");
    expect(bandQualitativeTone(QUALITATIVE_TONE_NEGATIVE_MAX)).toBe("negative");
    expect(bandQualitativeTone(QUALITATIVE_TONE_NEGATIVE_MAX + 0.0001)).toBe("neutral");
    expect(bandQualitativeTone(0)).toBe("neutral");
    expect(bandQualitativeTone(1)).toBe("positive");
    expect(bandQualitativeTone(-1)).toBe("negative");
  });
});

describe("scoreQualitativeTone", () => {
  it("scores praise, criticism, and neutral text with the bundled lexicon", () => {
    expect(scoreQualitativeTone("The instructor was excellent and very helpful.")).toBeGreaterThan(
      QUALITATIVE_TONE_POSITIVE_MIN
    );
    expect(
      scoreQualitativeTone("The lab equipment was broken and useless.")
    ).toBeLessThan(QUALITATIVE_TONE_NEGATIVE_MAX);
    expect(scoreQualitativeTone("The lecture was on Tuesday.")).toBe(0);
  });

  it("resolves negation and returns zero for text with no scored words", () => {
    expect(scoreQualitativeTone("The instructor was not helpful.")).toBeLessThan(0);
    expect(scoreQualitativeTone("   ")).toBe(0);
  });
});

describe("analyzeQualitativeCorpus", () => {
  it("counts distinct responses per term, not mentions alone", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "lab lab lab", responseId: "r1" }),
      item({ text: "lab equipment", responseId: "r2" }),
    ]);

    expect(result.terms).toContainEqual({ text: "lab", mentions: 4, responseCount: 2 });
    expect(result.terms).toContainEqual({ text: "equipment", mentions: 1, responseCount: 1 });
  });

  it("orders terms by mentions, then distinct responses, then term", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "alpha alpha beta", responseId: "r1" }),
      item({ text: "beta gamma", responseId: "r2" }),
    ]);

    // beta and alpha tie on mentions; beta reached two responses, alpha one.
    expect(result.terms.map((term) => term.text)).toEqual(["beta", "alpha", "gamma"]);
    expect(result.terms.map((term) => term.mentions)).toEqual([2, 2, 1]);
    expect(result.terms.map((term) => term.responseCount)).toEqual([2, 1, 1]);
  });

  it("redacts identifiers before counting and never emits source text", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "Maria Santos emailed maria@example.com about IT201 support.", responseId: "r1" }),
    ]);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/Maria|Santos|example\.com|IT201/);
    expect(result.terms.map((term) => term.text)).toEqual(["emailed", "support"]);
    expect(serialized).not.toContain("response-1");
  });

  it("ignores blank answers while counting answers that redact to nothing", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "   ", responseId: "r1" }),
      item({ text: "IT201 2026", responseId: "r2" }),
      item({ text: "helpful", responseId: "r3" }),
    ]);

    expect(result.terms.map((term) => term.text)).toEqual(["helpful"]);
    expect(result.tone.scoredItemCount).toBe(2);
    expect(result.sources).toEqual([
      expect.objectContaining({ itemCount: 2, responseCount: 2 }),
    ]);
    expect(result.prompts).toEqual([
      expect.objectContaining({ itemCount: 2, responseCount: 2 }),
    ]);
  });

  it("keeps an answer with no surviving term out of the term projection only", () => {
    const result = analyzeQualitativeCorpus([item({ text: "IT201 2026", responseId: "r1" })]);

    expect(result.terms).toEqual([]);
    expect(result.prompts[0]?.terms).toEqual([]);
    expect(result.prompts[0]?.itemCount).toBe(1);
    expect(result.tone).toEqual({ scoredItemCount: 1, positive: 0, neutral: 1, negative: 0 });
  });

  it("aggregates the tone shape over every scored answer", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "The instructor was excellent and very helpful.", responseId: "r1" }),
      item({ text: "The lab equipment was broken and useless.", responseId: "r2" }),
      item({ text: "The lecture was on Tuesday.", responseId: "r3" }),
    ]);

    expect(result.tone).toEqual({ scoredItemCount: 3, positive: 1, neutral: 1, negative: 1 });
  });

  it("keeps tone shape counts summing to the scored total", () => {
    const result = analyzeQualitativeCorpus([
      item({ text: "excellent", responseId: "r1" }),
      item({ text: "terrible and useless", responseId: "r2" }),
    ]);
    const { scoredItemCount, positive, neutral, negative } = result.tone;

    expect(scoredItemCount).toBe(2);
    expect(positive + neutral + negative).toBe(scoredItemCount);
  });

  it("groups prompt evidence by source and prompt with per-prompt tone", () => {
    const result = analyzeQualitativeCorpus([
      item({
        text: "The instructor was excellent and very helpful.",
        responseId: "r1",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Strengths of the program:",
      }),
      item({
        text: "The lab equipment was broken and useless.",
        responseId: "r2",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Strengths of the program:",
      }),
      item({
        text: "Career services could be better.",
        responseId: "r3",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Areas for improvement:",
      }),
    ]);

    expect(result.prompts).toEqual([
      expect.objectContaining({
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Strengths of the program:",
        itemCount: 2,
        responseCount: 2,
        tone: { scoredItemCount: 2, positive: 1, neutral: 0, negative: 1 },
      }),
      expect.objectContaining({
        promptLabel: "Areas for improvement:",
        itemCount: 1,
        responseCount: 1,
      }),
    ]);
  });

  it("caps prompt terms deterministically at the highest mentions", () => {
    const longAnswer = Array.from({ length: QUALITATIVE_PROMPT_TERM_CAP + 4 }, (_, index) =>
      Array.from({ length: index + 1 }, () => `term${String.fromCharCode(97 + index)}`).join(" ")
    ).join(" ");

    const result = analyzeQualitativeCorpus([item({ text: longAnswer, responseId: "r1" })]);

    expect(result.prompts[0]?.terms).toHaveLength(QUALITATIVE_PROMPT_TERM_CAP);
    expect(result.prompts[0]?.terms[0]?.mentions).toBe(QUALITATIVE_PROMPT_TERM_CAP + 4);
  });

  it("is order-independent for the same corpus", () => {
    const corpus = [
      item({ text: "support clarity", responseId: "r1" }),
      item({ text: "support banana", responseId: "r2" }),
      item({
        text: "clarity matters",
        responseId: "r3",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Areas for improvement:",
      }),
    ];

    expect(analyzeQualitativeCorpus(corpus)).toEqual(analyzeQualitativeCorpus([...corpus].reverse()));
  });

  it("groups source evidence by source with counts and tone", () => {
    const result = analyzeQualitativeCorpus([
      item({
        text: "The instructor was excellent and very helpful.",
        responseId: "r1",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Strengths of the program:",
      }),
      item({
        text: "The lab equipment was broken and useless.",
        responseId: "r2",
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        promptLabel: "Areas for improvement:",
      }),
      item({
        text: "The instructor was excellent.",
        responseId: "r3",
        sourceKey: "COURSE_STUDENT",
        sourceLabel: "Course-bound student evidence",
        promptLabel: "What worked well?",
      }),
    ]);

    expect(result.sources).toEqual([
      {
        sourceKey: "COURSE_STUDENT",
        sourceLabel: "Course-bound student evidence",
        itemCount: 1,
        responseCount: 1,
        tone: { scoredItemCount: 1, positive: 1, neutral: 0, negative: 0 },
      },
      {
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        itemCount: 2,
        responseCount: 2,
        tone: { scoredItemCount: 2, positive: 1, neutral: 0, negative: 1 },
      },
    ]);
  });

  it("returns empty structures for an empty corpus", () => {
    expect(analyzeQualitativeCorpus([])).toEqual({
      terms: [],
      sources: [],
      tone: { scoredItemCount: 0, positive: 0, neutral: 0, negative: 0 },
      prompts: [],
    });
  });
});
