import { buildReviewWordCloudTokens } from "@/features/analytics/services/get-course-bound-review-detail";
import type { QualitativeSummary } from "../types";

type SubmittedResponseWithQualitative = {
  respondent_id: string;
  qual_items: Array<{ section_key: string; prompt_key: string; text_content: string }>;
};

/**
 * Build the qualitative evidence summary (§25.3, §26) over submitted
 * responses: non-empty answer count, distinct respondent count, prompt
 * breakdown (count descending), and weighted top terms.
 */
export function buildQualitativeSummary(
  submittedResponses: SubmittedResponseWithQualitative[],
  promptByItemKey: Map<string, { prompt: string }>
): QualitativeSummary {
  const texts: string[] = [];
  const promptCounts = new Map<string, number>();
  const respondents = new Set<string>();

  for (const response of submittedResponses) {
    let hasText = false;
    for (const item of response.qual_items) {
      if (item.text_content.trim().length === 0) {
        continue;
      }
      hasText = true;
      texts.push(item.text_content);
      const prompt =
        promptByItemKey.get(`${item.section_key}|${item.prompt_key}`)?.prompt ?? item.prompt_key;
      promptCounts.set(prompt, (promptCounts.get(prompt) ?? 0) + 1);
    }
    if (hasText) {
      respondents.add(response.respondent_id);
    }
  }

  return {
    answerCount: texts.length,
    respondentCount: respondents.size,
    prompts: [...promptCounts.entries()]
      .map(([prompt, answerCount]) => ({ prompt, answerCount }))
      .sort((left, right) => right.answerCount - left.answerCount),
    topTerms: buildReviewWordCloudTokens(texts),
  };
}