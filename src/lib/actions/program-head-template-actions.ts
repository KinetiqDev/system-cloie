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
} from "@/features/instruments/services/manage-program-head-templates";
import { buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";

type ActionResult = { success: true; data?: { id: string } } | { success: false; error: string };

function revalidateTools(programId: string) {
  revalidatePath(buildProgramHeadToolsPath(programId));
}

type TemplateFormJson =
  | { error: string }
  | { structure: unknown; programQuestionPoBindings: unknown };

/**
 * The builder submits the template structure and the program-wide PO
 * question bindings as JSON strings. Both are read here so create and update
 * report the same parse failure before the schema runs.
 */
function readTemplateFormJson(formData: FormData): TemplateFormJson {
  const rawStructure = formData.get("structure");
  const rawPoBindings = formData.get("program_question_go_bindings");
  let structure: unknown = [];
  let programQuestionPoBindings: unknown = [];

  try {
    structure = typeof rawStructure === "string" ? JSON.parse(rawStructure) : [];
  } catch {
    return { error: "Invalid template structure." } as const;
  }

  try {
    programQuestionPoBindings = typeof rawPoBindings === "string" ? JSON.parse(rawPoBindings) : [];
  } catch {
    return { error: "Invalid PO question bindings." } as const;
  }

  return { structure, programQuestionPoBindings } as const;
}

export async function createProgramHeadTemplateAction(formData: FormData): Promise<ActionResult> {
  const json = readTemplateFormJson(formData);

  if ("error" in json) return { success: false, error: json.error };

  const parsed = createProgramHeadTemplateSchema.safeParse({
    name: formData.get("name"),
    programId: formData.get("programId"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure: json.structure,
    __KEEP_program_question_go_bindings__: json.programQuestionPoBindings,
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
  return { success: true, data: result.data };
}

export async function updateProgramHeadTemplateAction(formData: FormData): Promise<ActionResult> {
  const json = readTemplateFormJson(formData);

  if ("error" in json) return { success: false, error: json.error };

  const parsed = updateProgramHeadTemplateSchema.safeParse({
    id: formData.get("id"),
    programId: formData.get("programId"),
    name: formData.get("name"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure: json.structure,
    __KEEP_program_question_go_bindings__: json.programQuestionPoBindings,
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
  return { success: true, data: result.data };
}

export async function duplicateTemplateAction(
  programId: string,
  templateId: string
): Promise<ActionResult> {
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
