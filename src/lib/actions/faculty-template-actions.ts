"use server";

import { revalidatePath } from "next/cache";
import { saveFacultyTemplateDraftSchema } from "@/features/instruments/schemas/program-head-template";
import {
  duplicateFacultyTemplate,
  getFacultyTemplatePublicationContext,
  saveFacultyTemplateDraft,
  deleteFacultyTemplate,
} from "@/features/instruments/services/manage-faculty-templates";

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export async function saveFacultyTemplateDraftAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  let structure: unknown = [];
  let ciloQuestionBindings: unknown = [];

  try {
    structure = parseJsonField(formData.get("structure"), []);
    ciloQuestionBindings = parseJsonField(formData.get("cilo_question_bindings"), []);
  } catch {
    return { success: false, error: "Invalid template structure." };
  }

  const parsed = saveFacultyTemplateDraftSchema.safeParse({
    bound_course_id: formData.get("bound_course_id") || null,
    bound_major_id: formData.get("bound_major_id") || null,
    bound_program_id: formData.get("bound_program_id") || null,
    cilo_question_bindings: ciloQuestionBindings,
    description: formData.get("description"),
    id: formData.get("id"),
    is_active: formData.get("is_active"),
    name: formData.get("name"),
    structure,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await saveFacultyTemplateDraft(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/faculty/tools");
  revalidatePath(`/faculty/tools/${result.data.id}/edit`);
  return { success: true, data: result.data };
}

export async function duplicateFacultyTemplateAction(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await duplicateFacultyTemplate(templateId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/faculty/tools");
  return { success: true, data: result.data };
}

export async function deleteFacultyTemplateAction(templateId: string): Promise<ActionResult> {
  const result = await deleteFacultyTemplate(templateId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/faculty/tools");
  return { success: true, data: undefined };
}

export async function validateFacultyTemplatePublishReadinessAction(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await getFacultyTemplatePublicationContext(templateId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: { id: result.data.template.id } };
}
