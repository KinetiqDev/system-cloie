import { z } from "zod";
import { EvaluationTemplateType } from "@prisma/client";

// ─── Shared Preprocessors ────────────────────────────────────────────────────

const optionalTextField = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(1000).optional());

const checkboxBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean()
);

function hasDuplicateTrimmedValues(values?: string[]) {
  if (!values?.length) {
    return false;
  }

  const seen = new Set<string>();

  for (const value of values) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      continue;
    }

    if (seen.has(normalizedValue)) {
      return true;
    }

    seen.add(normalizedValue);
  }

  return false;
}

// ─── Template Structure Schemas ──────────────────────────────────────────────

const likertDescriptorSchema = z.object({
  value: z.number().int().min(1).max(10),
  label: z.string().trim().min(1, "Descriptor label is required.").max(100),
});

export const templateQuestionSchema = z
  .object({
    key: z.string().min(1, "Question key is required."),
    prompt: z
      .string()
      .trim()
      .min(1, "Question title is required.")
      .max(500, "Question prompt must be 500 characters or fewer."),
    type: z.enum(["likert", "guided_open_ended"]),
    order: z.number().int().min(0),
    required: z.boolean(),
    likertDescriptors: z.array(likertDescriptorSchema).optional(),
    suggestedResponses: z.array(z.string().trim().max(500)).optional(),
  })
  .superRefine((value, ctx) => {
    if (hasDuplicateTrimmedValues(value.suggestedResponses)) {
      ctx.addIssue({
        code: "custom",
        message: "Predefined responses must be unique within a question.",
        path: ["suggestedResponses"],
      });
    }
  });

const templateSectionSchema = z.object({
  key: z.string().min(1, "Section key is required."),
  title: z
    .string()
    .trim()
    .min(1, "Section title is required.")
    .max(200, "Section title must be 200 characters or fewer."),
  description: optionalTextField,
  order: z.number().int().min(0),
  questions: z
    .array(templateQuestionSchema)
    .min(1, "Each section must have at least one question."),
});

export const templateStructureSchema = z
  .array(templateSectionSchema)
  .min(1, "Template must have at least one section.");

// ─── Create / Update Schemas ─────────────────────────────────────────────────

const ploQuestionBindingSchema = z.object({
  ploId: z.string().uuid(),
  itemKey: z.string().min(1, "Question key is required."),
  sectionKey: z.string().min(1, "Section key is required."),
});

export const createProgramHeadTemplateSchema = z
  .object({
    programId: z.string().uuid(),
    name: z
      .string()
      .trim()
      .min(3, "Template name must be at least 3 characters.")
      .max(200, "Template name must be 200 characters or fewer."),
    description: optionalTextField,
    is_active: checkboxBoolean.default(true),
    template_type: z.nativeEnum(EvaluationTemplateType),
    is_faculty_accessible: checkboxBoolean,
    structure: templateStructureSchema,
    program_question_plo_bindings: z.array(ploQuestionBindingSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.template_type !== EvaluationTemplateType.COURSE_BOUND &&
      value.is_faculty_accessible
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Only course-bound templates can be faculty-accessible.",
        path: ["is_faculty_accessible"],
      });
    }
    if (
      value.template_type !== EvaluationTemplateType.PROGRAM_WIDE &&
      (value.program_question_plo_bindings?.length ?? 0) > 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "PLOs can only be assigned to questions in program-wide evaluations.",
        path: ["program_question_plo_bindings"],
      });
    }
  });

export const updateProgramHeadTemplateSchema = z
  .object({
    programId: z.string().uuid(),
    id: z.string().uuid(),
    name: z
      .string()
      .trim()
      .min(3, "Template name must be at least 3 characters.")
      .max(200, "Template name must be 200 characters or fewer."),
    description: optionalTextField,
    is_active: checkboxBoolean.default(true),
    template_type: z.nativeEnum(EvaluationTemplateType),
    is_faculty_accessible: checkboxBoolean,
    structure: templateStructureSchema,
    program_question_plo_bindings: z.array(ploQuestionBindingSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.template_type !== EvaluationTemplateType.COURSE_BOUND &&
      value.is_faculty_accessible
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Only course-bound templates can be faculty-accessible.",
        path: ["is_faculty_accessible"],
      });
    }
    if (
      value.template_type !== EvaluationTemplateType.PROGRAM_WIDE &&
      (value.program_question_plo_bindings?.length ?? 0) > 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "PLOs can only be assigned to questions in program-wide evaluations.",
        path: ["program_question_plo_bindings"],
      });
    }
  });

const ciloQuestionBindingSchema = z.object({
  ciloId: z.string().uuid(),
  itemKey: z.string().min(1, "Question key is required."),
  sectionKey: z.string().min(1, "Section key is required."),
});

export const saveFacultyTemplateDraftSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(3, "Template name must be at least 3 characters.")
    .max(200, "Template name must be 200 characters or fewer."),
  description: optionalTextField,
  is_active: checkboxBoolean.default(true),
  structure: templateStructureSchema,
  bound_course_id: z.string().uuid().optional().nullable(),
  bound_program_id: z.string().uuid().optional().nullable(),
  bound_major_id: z.string().uuid().optional().nullable(),
  cilo_question_bindings: z.array(ciloQuestionBindingSchema).default([]),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

type ProgramPloQuestionBindingInput = z.infer<typeof ploQuestionBindingSchema>;
export type CreateProgramHeadTemplateInput = {
  programId: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  template_type: EvaluationTemplateType;
  is_faculty_accessible: boolean;
  structure: z.infer<typeof templateStructureSchema>;
  program_question_plo_bindings?: ProgramPloQuestionBindingInput[];
};
export type UpdateProgramHeadTemplateInput = CreateProgramHeadTemplateInput & { id: string };
export type SaveFacultyTemplateDraftInput = z.infer<typeof saveFacultyTemplateDraftSchema>;
