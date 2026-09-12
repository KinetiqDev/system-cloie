import {
  listTemplateLikertQuestions,
  type TemplateLikertQuestionOption,
  type TemplateStructure,
} from "@/features/instruments/types";

export type CentralPloBindingRow = {
  plo_id: string | null;
  section_key: string;
  item_key: string;
};

export type CentralPloOption = {
  id: string;
  code: string;
  description: string;
};

export type CentralPloSnapshotRow = {
  plo_id: string;
  plo_code: string;
  plo_description: string;
  section_key: string;
  item_key: string;
  question_prompt: string;
};

export type CentralPloBindingPlan = {
  /** First blocking binding problem, or null when the template can publish. */
  error: string | null;
  likertCount: number;
  snapshotRows: CentralPloSnapshotRow[];
  unboundQuestions: TemplateLikertQuestionOption[];
  coveredPlos: CentralPloOption[];
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
 * Plans the publication-time PLO snapshot rows for a PROGRAM_WIDE template.
 *
 * A Likert question does not need a PLO question binding to publish: an
 * unbound question publishes as a general evaluation item and contributes no
 * PLO evidence, so it is reported instead of rejected. Publication still
 * rejects bindings that no longer match the template structure and bindings
 * whose PLO is archived or outside the publishing program.
 */
export function planCentralPloBindings(input: {
  bindings: CentralPloBindingRow[];
  structure: unknown;
  livePlos: CentralPloOption[];
}): CentralPloBindingPlan {
  if (!Array.isArray(input.structure)) {
    return {
      error: "Template structure is invalid.",
      likertCount: 0,
      snapshotRows: [],
      unboundQuestions: [],
      coveredPlos: [],
    };
  }

  const questions = listTemplateLikertQuestions(input.structure as TemplateStructure);
  const questionMap = new Map(
    questions.map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question,
    ])
  );
  const ploMap = new Map(input.livePlos.map((plo) => [plo.id, plo]));
  const boundQuestionKeys = new Set<string>();
  const coveredPlos = new Map<string, CentralPloOption>();
  const snapshotRows: CentralPloSnapshotRow[] = [];
  let error: string | null = null;

  for (const binding of input.bindings) {
    const questionKey = encodeQuestionKey(binding.section_key, binding.item_key);
    const question = questionMap.get(questionKey);
    const plo = binding.plo_id ? ploMap.get(binding.plo_id) : undefined;

    if (!question) {
      error ??= "One or more question–PLO bindings no longer match the template structure.";
      continue;
    }

    if (!plo) {
      error ??=
        "One or more bound PLOs are archived or no longer available. Update the template before publishing.";
      continue;
    }

    boundQuestionKeys.add(questionKey);
    coveredPlos.set(plo.id, plo);
    snapshotRows.push({
      plo_id: plo.id,
      plo_code: plo.code,
      plo_description: plo.description,
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
    coveredPlos: [...coveredPlos.values()],
  };
}
