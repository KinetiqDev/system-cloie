import {
  listTemplateLikertQuestions,
  type TemplateLikertQuestionOption,
  type TemplateStructure,
} from "@/features/instruments/types";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";

type CentralPoBindingRow = {
  po_id: string | null;
  section_key: string;
  item_key: string;
};

type CentralGoOption = {
  id: string;
  code: string;
  description: string;
};

export type CentralPoSnapshotRow = {
  po_id: string;
  po_code: string;
  go_description: string;
  section_key: string;
  item_key: string;
  question_prompt: string;
};

type CentralPoBindingPlan = {
  /** First blocking binding problem, or null when the template can publish. */
  error: string | null;
  likertCount: number;
  snapshotRows: CentralPoSnapshotRow[];
  unboundQuestions: TemplateLikertQuestionOption[];
  coveredGos: CentralGoOption[];
};

/**
 * Plans the publication-time PO snapshot rows for a PROGRAM_WIDE template.
 *
 * A Likert question does not need a PO question binding to publish: an
 * unbound question publishes as a general evaluation item and contributes no
 * PO evidence, so it is reported instead of rejected. Publication still
 * rejects bindings that no longer match the template structure and bindings
 * whose PO is archived or outside the publishing program.
 */
export function planCentralPoBindings(input: {
  bindings: CentralPoBindingRow[];
  structure: unknown;
  liveGos: CentralGoOption[];
}): CentralPoBindingPlan {
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
  const poMap = new Map(input.liveGos.map((po) => [po.id, po]));
  const boundQuestionKeys = new Set<string>();
  const coveredGos = new Map<string, CentralGoOption>();
  const snapshotRows: CentralPoSnapshotRow[] = [];
  let error: string | null = null;

  for (const binding of input.bindings) {
    const questionKey = encodeQuestionKey(binding.section_key, binding.item_key);
    const question = questionMap.get(questionKey);
    const po = binding.po_id ? poMap.get(binding.po_id) : undefined;

    if (!question) {
      error ??= "One or more question–PO bindings no longer match the template structure.";
      continue;
    }

    if (!po) {
      error ??=
        "One or more bound POs are archived or no longer available. Update the template before publishing.";
      continue;
    }

    boundQuestionKeys.add(questionKey);
    coveredGos.set(po.id, po);
    snapshotRows.push({
      po_id: po.id,
      po_code: po.code,
      go_description: po.description,
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
