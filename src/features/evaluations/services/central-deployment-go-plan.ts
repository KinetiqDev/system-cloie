import {
  listTemplateLikertQuestions,
  type TemplateLikertQuestionOption,
  type TemplateStructure,
} from "@/features/instruments/types";

type CentralGoBindingRow = {
  go_id: string | null;
  section_key: string;
  item_key: string;
};

type CentralGoOption = {
  id: string;
  code: string;
  description: string;
};

export type CentralGoSnapshotRow = {
  go_id: string;
  go_code: string;
  go_description: string;
  section_key: string;
  item_key: string;
  question_prompt: string;
};

type CentralGoBindingPlan = {
  /** First blocking binding problem, or null when the template can publish. */
  error: string | null;
  likertCount: number;
  snapshotRows: CentralGoSnapshotRow[];
  unboundQuestions: TemplateLikertQuestionOption[];
  coveredGos: CentralGoOption[];
};

/**
 * Template keys may contain any nonempty string, so the question identity
 * must be a structurally encoded tuple, never a separator join. Shared by the
 * binding plan and by list rendering that keys rows by question identity.
 */
export function encodeQuestionKey(sectionKey: string, itemKey: string): string {
  return JSON.stringify([sectionKey, itemKey]);
}

/**
 * Plans the publication-time GO snapshot rows for a PROGRAM_WIDE template.
 *
 * A Likert question does not need a GO question binding to publish: an
 * unbound question publishes as a general evaluation item and contributes no
 * GO evidence, so it is reported instead of rejected. Publication still
 * rejects bindings that no longer match the template structure and bindings
 * whose GO is archived or outside the publishing program.
 */
export function planCentralGoBindings(input: {
  bindings: CentralGoBindingRow[];
  structure: unknown;
  liveGos: CentralGoOption[];
}): CentralGoBindingPlan {
  if (!Array.isArray(input.structure)) {
    return {
      error: "Template structure is invalid.",
      likertCount: 0,
      snapshotRows: [],
      unboundQuestions: [],
      coveredGos: [],
    };
  }

  const questions = listTemplateLikertQuestions(input.structure as TemplateStructure);
  const questionMap = new Map(
    questions.map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question,
    ])
  );
  const goMap = new Map(input.liveGos.map((go) => [go.id, go]));
  const boundQuestionKeys = new Set<string>();
  const coveredGos = new Map<string, CentralGoOption>();
  const snapshotRows: CentralGoSnapshotRow[] = [];
  let error: string | null = null;

  for (const binding of input.bindings) {
    const questionKey = encodeQuestionKey(binding.section_key, binding.item_key);
    const question = questionMap.get(questionKey);
    const go = binding.go_id ? goMap.get(binding.go_id) : undefined;

    if (!question) {
      error ??= "One or more question–GO bindings no longer match the template structure.";
      continue;
    }

    if (!go) {
      error ??=
        "One or more bound GOs are archived or no longer available. Update the template before publishing.";
      continue;
    }

    boundQuestionKeys.add(questionKey);
    coveredGos.set(go.id, go);
    snapshotRows.push({
      go_id: go.id,
      go_code: go.code,
      go_description: go.description,
      section_key: binding.section_key,
      item_key: binding.item_key,
      question_prompt: question.prompt,
    });
  }

  const unboundQuestions = questions.filter(
    (question) => !boundQuestionKeys.has(encodeQuestionKey(question.sectionKey, question.itemKey))
  );

  return {
    error,
    likertCount: questions.length,
    snapshotRows,
    unboundQuestions,
    coveredGos: [...coveredGos.values()],
  };
}
