"use server";

import { revalidatePath } from "next/cache";
import {
  createProgramHeadTemplateSchema,
  updateProgramHeadTemplateSchema,
} from "@/features/instruments/schemas/program-head-template";
import {
  createProgramHeadTemplate,
  updateProgramHeadTemplate,
  duplicateTemplate,
  toggleTemplateActive,
  deleteProgramHeadTemplate,
  toggleFacultyAccessible,
} from "@/features/instruments/services/manage-program-head-templates";
import {
  buildProgramHeadToolsPath,
} from "@/lib/constants/program-head-routes";

type ActionResult = { success: true } | { success: false; error: string };

function revalidateTools(programId: string) {
  revalidatePath(buildProgramHeadToolsPath(programId));
}

export async function createProgramHeadTemplateAction(formData: FormData): Promise<ActionResult> {
  const rawStructure = formData.get("structure");
  let structure: unknown = [];

  try {
    structure = typeof rawStructure === "string" ? JSON.parse(rawStructure) : [];
  } catch {
    return { success: false, error: "Invalid template structure." };
  }

  const rawPloBindings = formData.get("program_question_plo_bindings");
  let programQuestionPloBindings: unknown = [];

  try {
    programQuestionPloBindings =
      typeof rawPloBindings === "string" ? JSON.parse(rawPloBindings) : [];
  } catch {
    return { success: false, error: "Invalid PLO question bindings." };
  }

  const parsed = createProgramHeadTemplateSchema.safeParse({
    name: formData.get("name"),
    programId: formData.get("programId"),
    description: formData.get("description"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure,
    program_question_plo_bindings: programQuestionPloBindings,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await createProgramHeadTemplate(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(parsed.data.programId);
  return { success: true };
}

export async function updateProgramHeadTemplateAction(formData: FormData): Promise<ActionResult> {
  const rawStructure = formData.get("structure");
  let structure: unknown = [];

  try {
    structure = typeof rawStructure === "string" ? JSON.parse(rawStructure) : [];
  } catch {
    return { success: false, error: "Invalid template structure." };
  }

  const rawPloBindings = formData.get("program_question_plo_bindings");
  let programQuestionPloBindings: unknown = [];

  try {
    programQuestionPloBindings =
      typeof rawPloBindings === "string" ? JSON.parse(rawPloBindings) : [];
  } catch {
    return { success: false, error: "Invalid PLO question bindings." };
  }

  const parsed = updateProgramHeadTemplateSchema.safeParse({
    id: formData.get("id"),
    programId: formData.get("programId"),
    name: formData.get("name"),
    description: formData.get("description"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure,
    program_question_plo_bindings: programQuestionPloBindings,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await updateProgramHeadTemplate(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(parsed.data.programId);
  return { success: true };
}

export async function duplicateTemplateAction(programId: string, templateId: string): Promise<ActionResult> {
  const result = await duplicateTemplate(programId, templateId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(programId);
  return { success: true };
}

export async function toggleTemplateActiveAction(
  programId: string,
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const result = await toggleTemplateActive(programId, id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(programId);
  return { success: true };
}

export async function deleteTemplateAction(programId: string, id: string): Promise<ActionResult> {
  const result = await deleteProgramHeadTemplate(programId, id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(programId);
  return { success: true };
}

export async function toggleFacultyAccessibleAction(
  programId: string,
  id: string,
  is_faculty_accessible: boolean
): Promise<ActionResult> {
  const result = await toggleFacultyAccessible(programId, id, is_faculty_accessible);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTools(programId);
  return { success: true };
}
