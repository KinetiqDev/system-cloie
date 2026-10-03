import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";

/**
 * Flatten a stored response's items back into the answer-key map the wizard
 * hydrates from, so a resumed draft shows exactly the values the respondent
 * stored. Every reader that resumes a response derives its answers here.
 */

type QuantitativeSavedAnswerItem = {
  item_key: string;
  rating_value: number;
  section_key: string;
};

type QualitativeSavedAnswerItem = {
  prompt_key: string;
  section_key: string;
  text_content: string;
};

export function mapSavedAnswerItems({
  qualitativeItems,
  quantitativeItems,
}: {
  qualitativeItems: QualitativeSavedAnswerItem[];
  quantitativeItems: QuantitativeSavedAnswerItem[];
}): Record<string, number | string> {
  const answers: Record<string, number | string> = {};

  for (const item of quantitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "quantitative", item.item_key)] =
      item.rating_value;
  }

  for (const item of qualitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "qualitative", item.prompt_key)] =
      item.text_content;
  }

  return answers;
}
