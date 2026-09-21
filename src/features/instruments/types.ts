/**
 * Template Structure Types
 *
 * Defines the TypeScript types for the JSON `structure` field
 * stored in `InstrumentTemplate.structure` and frozen in
 * `InstrumentVersion.structure_snapshot`.
 */

export type QuestionType = "likert" | "guided_open_ended";
export type EvaluationTemplateType = "PROGRAM_WIDE" | "COURSE_BOUND";

export interface LikertDescriptor {
  value: number;
  label: string;
}

export interface TemplateQuestion {
  /** UUID-like unique key */
  key: string;
  prompt: string;
  type: QuestionType;
  order: number;
  required: boolean;
  /** Descriptor labels for likert-type questions */
  likertDescriptors?: LikertDescriptor[];
  /** Predefined response options for guided_open_ended questions */
  suggestedResponses?: string[];
}

export type TemplateCiloQuestionBinding = {
  ciloDescriptionSnapshot?: string;
  ciloId: string;
  itemKey: string;
  questionPromptSnapshot?: string;
  sectionKey: string;
};

/**
 * An active Graduate Outcome offered to a Program-wide template editor.
 * The list is server-prepared in canonical GO order.
 */
export type ProgramGoOption = {
  id: string;
  code: string;
  description: string;
};

/**
 * A draft Program-wide question–GO binding. Serialized as
 * `program_question_go_bindings` in template FormData and persisted by the
 * Program Head template services.
 */
export type TemplateGoQuestionBinding = {
  goId: string;
  itemKey: string;
  sectionKey: string;
  goCodeSnapshot?: string;
  goDescriptionSnapshot?: string;
};

export type TemplateLikertQuestionOption = {
  itemKey: string;
  prompt: string;
  sectionKey: string;
  sectionTitle: string;
};

export function listTemplateLikertQuestions(
  structure: TemplateStructure
): TemplateLikertQuestionOption[] {
  return structure.flatMap((section) =>
    section.questions
      .filter((question) => question.type === "likert")
      .map((question) => ({
        itemKey: question.key,
        prompt: question.prompt,
        sectionKey: section.key,
        sectionTitle: section.title,
      }))
  );
}

export interface TemplateSection {
  /** UUID-like unique key */
  key: string;
  title: string;
  description?: string;
  order: number;
  questions: TemplateQuestion[];
}

export type TemplateStructure = TemplateSection[];

/**
 * Template settings a builder exposes and forwards when a save derives a new
 * template (a baseline copy or a faculty copy of a shared template).
 */
export type TemplateSettingsInput = {
  description: string;
  is_active: boolean;
  is_faculty_accessible: boolean;
  template_type: EvaluationTemplateType;
};

/**
 * Reads a stored `structure` column as template sections. Templates written
 * before the current shape, or rows whose JSON was never valid, degrade to an
 * empty structure instead of throwing.
 */
export function toTemplateStructure(structure: unknown): TemplateStructure {
  return Array.isArray(structure) ? (structure as TemplateStructure) : [];
}

// ─── Default Descriptors ──────────────────────────────────────────────────────

export const DEFAULT_LIKERT_5_DESCRIPTORS: LikertDescriptor[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];
