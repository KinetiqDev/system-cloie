import {
  parseStudentEvaluationAnswerKey,
  type StudentEvaluationAnswerKind,
} from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";

/**
 * Section-scoped draft item builders.
 *
 * A draft save replaces one section's stored items with the submitted answers and
 * leaves every other section untouched, so each builder filters the answer map
 * down to the requested section before projecting it onto a persistence row.
 * Course-bound and Central drafts share these projections.
 */

type QuantitativeDraftUpsert = {
  item_key: string;
  rating_value: number;
  response_id: string;
  section_key: string;
  updated_at: string;
};

type QualitativeDraftUpsert = {
  prompt_key: string;
  response_id: string;
  section_key: string;
  text_content: string;
  updated_at: string;
};

type BuildDraftUpsertsInput = {
  answers: Record<string, unknown>;
  responseId: string;
  section: StudentEvaluationSection;
  updatedAt: string;
};

type SectionAnswerEntry = {
  itemKey: string;
  kind: StudentEvaluationAnswerKind;
  value: unknown;
};

function getSectionAnswerEntries({
  answers,
  section,
}: Pick<BuildDraftUpsertsInput, "answers" | "section">): SectionAnswerEntry[] {
  return Object.entries(answers)
    .map(([answerKey, value]) => {
      const parsedAnswerKey = parseStudentEvaluationAnswerKey(answerKey);

      if (!parsedAnswerKey || parsedAnswerKey.sectionKey !== section.id) {
        return null;
      }

      return {
        itemKey: parsedAnswerKey.itemKey,
        kind: parsedAnswerKey.kind,
        value,
      };
    })
    .filter((entry): entry is SectionAnswerEntry => entry !== null);
}

export function buildQuantitativeUpserts({
  answers,
  responseId,
  section,
  updatedAt,
}: BuildDraftUpsertsInput): QuantitativeDraftUpsert[] {
  return getSectionAnswerEntries({ answers, section })
    .filter(
      (entry): entry is SectionAnswerEntry & { kind: "quantitative"; value: number } =>
        entry.kind === "quantitative" &&
        typeof entry.value === "number" &&
        Number.isFinite(entry.value)
    )
    .map(({ itemKey, value }) => ({
      item_key: itemKey,
      rating_value: value,
      response_id: responseId,
      section_key: section.id,
      updated_at: updatedAt,
    }));
}

export function buildQualitativeUpserts({
  answers,
  responseId,
  section,
  updatedAt,
}: BuildDraftUpsertsInput): QualitativeDraftUpsert[] {
  return getSectionAnswerEntries({ answers, section })
    .filter(
      (entry): entry is SectionAnswerEntry & { kind: "qualitative"; value: string } =>
        entry.kind === "qualitative" && typeof entry.value === "string"
    )
    .map(({ itemKey, value }) => ({
      prompt_key: itemKey,
      response_id: responseId,
      section_key: section.id,
      text_content: value,
      updated_at: updatedAt,
    }));
}
