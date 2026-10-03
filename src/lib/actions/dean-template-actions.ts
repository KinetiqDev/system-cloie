"use server";

import {
  runCreateBaselineTemplate,
  runDeleteBaselineTemplate,
  runDuplicateBaselineTemplate,
  runToggleBaselineTemplateActive,
  runUpdateBaselineTemplate,
  type BaselineTemplateActionResult as ActionResult,
} from "@/features/instruments/services/baseline-template-actions";

const DEAN_TOOLS_PATH = "/dean/academic-structure/instruments";

export async function createDeanTemplateAction(formData: FormData): Promise<ActionResult> {
  return runCreateBaselineTemplate(formData, DEAN_TOOLS_PATH);
}

export async function updateDeanTemplateAction(formData: FormData): Promise<ActionResult> {
  return runUpdateBaselineTemplate(formData, DEAN_TOOLS_PATH);
}

export async function toggleDeanTemplateActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  return runToggleBaselineTemplateActive(id, is_active, DEAN_TOOLS_PATH);
}

export async function duplicateDeanTemplateAction(id: string): Promise<ActionResult> {
  return runDuplicateBaselineTemplate(id, DEAN_TOOLS_PATH);
}

export async function deleteDeanTemplateAction(id: string): Promise<ActionResult> {
  return runDeleteBaselineTemplate(id, DEAN_TOOLS_PATH);
}
