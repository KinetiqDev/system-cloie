import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";

/**
 * Submission completeness for every answering surface.
 *
 * A response may only be finalized once every required quantitative item holds a
 * finite numeric value and every required qualitative item is non-empty, checked
 * against the frozen structure snapshot the assignment was published with. Items
 * flagged `required: false` may stay blank in any snapshot format; an absent flag
 * keeps the legacy behaviour of requiring every answer.
 */

type StructureSnapshotItem = {
  key: string;
  kind?: "quantitative" | "qualitative";
  required?: boolean;
};

type StructureSnapshotQuestion = {
  key: string;
  type?: "likert" | "guided_open_ended";
  required?: boolean;
};

type StructureSnapshotSection = {
  items?: StructureSnapshotItem[];
  questions?: StructureSnapshotQuestion[];
  key: string;
  qualitative_prompts?: unknown;
  quantitative_items?: unknown;
};

type SubmissionAnswers = Record<string, unknown>;

type RequiredAnswer = { kind: "quantitative" | "qualitative"; key: string };

function isSnapshotItem(value: unknown): value is StructureSnapshotItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return typeof (value as StructureSnapshotItem).key === "string";
}

function isSnapshotSection(value: unknown): value is StructureSnapshotSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return typeof (value as StructureSnapshotSection).key === "string";
}

function hasAnswerValue(kind: "quantitative" | "qualitative", value: unknown) {
  if (kind === "quantitative") {
    return typeof value === "number" && Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getSnapshotItems(items: unknown): StructureSnapshotItem[] {
  return Array.isArray(items) ? items.filter(isSnapshotItem) : [];
}

function collectRequiredAnswers(section: StructureSnapshotSection): RequiredAnswer[] {
  // Phase 3 format: questions[] with an explicit type and required flag.
  if (Array.isArray(section.questions)) {
    return section.questions.flatMap((question) => {
      const kind =
        question.type === "likert"
          ? "quantitative"
          : question.type === "guided_open_ended"
            ? "qualitative"
            : null;

      if (!kind || question.required === false) {
        return [];
      }

      return [{ kind, key: question.key }];
    });
  }

  // Intermediate format: unified items[] with a kind discriminator.
  if (Array.isArray(section.items)) {
    return section.items.flatMap((item) => {
      const kind =
        item.kind === "quantitative"
          ? "quantitative"
          : item.kind === "qualitative"
            ? "qualitative"
            : null;

      if (!kind || item.required === false) {
        return [];
      }

      return [{ kind, key: item.key }];
    });
  }

  // Legacy format: separate quantitative_items and qualitative_prompts arrays.
  const quantitative = getSnapshotItems(section.quantitative_items).map((item) => ({
    key: item.key,
    kind: "quantitative" as const,
  }));
  const qualitative = getSnapshotItems(section.qualitative_prompts).map((item) => ({
    key: item.key,
    kind: "qualitative" as const,
  }));

  return [...quantitative, ...qualitative];
}

export function assertSubmissionIsAllowed({
  answers,
  structureSnapshot,
}: {
  answers: SubmissionAnswers;
  structureSnapshot: unknown;
}): void {
  const missingAnswerKeys = Array.isArray(structureSnapshot)
    ? structureSnapshot.filter(isSnapshotSection).flatMap((section) =>
        collectRequiredAnswers(section)
          .filter(
            ({ kind, key }) =>
              !hasAnswerValue(
                kind,
                answers[buildStudentEvaluationAnswerKey(section.key, kind, key)]
              )
          )
          .map(({ kind, key }) => buildStudentEvaluationAnswerKey(section.key, kind, key))
      )
    : [];

  if (missingAnswerKeys.length > 0) {
    throw new Error(`Missing required answers: ${missingAnswerKeys.join(", ")}`);
  }
}
