import { z } from "zod";
import { EvaluationTemplateType } from "@prisma/client";
import { templateStructureSchema } from "./program-head-template";

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

const templateFields = {
  code: z
    .string()
    .trim()
    .min(3, "Template code must be at least 3 characters.")
    .max(50, "Template code must be 50 characters or fewer.")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(3, "Template name must be at least 3 characters.")
    .max(200, "Template name must be 200 characters or fewer."),
  description: optionalTextField,
  template_type: z.nativeEnum(EvaluationTemplateType),
  is_faculty_accessible: checkboxBoolean,
  // The template builder persists the Active toggle with every save.
  is_active: checkboxBoolean.default(true),
};

// Schema without structure (for legacy/simple metadata updates)
export const createBaselineTemplateSchema = z.object(templateFields).superRefine((value, ctx) => {
  if (value.template_type !== EvaluationTemplateType.COURSE_BOUND && value.is_faculty_accessible) {
    ctx.addIssue({
      code: "custom",
      message: "Only course-bound templates can be faculty-accessible.",
      path: ["is_faculty_accessible"],
    });
  }
});

export const updateBaselineTemplateSchema = z
  .object({
    id: z.string().uuid(),
    ...templateFields,
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
  });

// Schema with structure (for template builder create/update)
export const createBaselineTemplateWithStructureSchema = z
  .object({
    ...templateFields,
    structure: templateStructureSchema,
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
  });

export const updateBaselineTemplateWithStructureSchema = z
  .object({
    id: z.string().uuid(),
    ...templateFields,
    structure: templateStructureSchema,
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
  });

export type CreateBaselineTemplateInput = z.infer<typeof createBaselineTemplateSchema>;
export type UpdateBaselineTemplateInput = z.infer<typeof updateBaselineTemplateSchema>;
export type CreateBaselineTemplateWithStructureInput = z.infer<
  typeof createBaselineTemplateWithStructureSchema
>;
export type UpdateBaselineTemplateWithStructureInput = z.infer<
  typeof updateBaselineTemplateWithStructureSchema
>;
