"use server";

import {
  runCreateBaselineTemplate,
  runDeleteBaselineTemplate,
  runDuplicateBaselineTemplate,
  runToggleBaselineTemplateActive,
  runUpdateBaselineTemplate,
  type BaselineTemplateActionResult as ActionResult,
} from "@/features/instruments/services/baseline-template-actions";

const SECRETARY_TOOLS_PATH = "/secretary/instruments";

export async function createAdminTemplateAction(formData: FormData): Promise<ActionResult> {
  return runCreateBaselineTemplate(formData, SECRETARY_TOOLS_PATH);
}

export async function updateAdminTemplateAction(formData: FormData): Promise<ActionResult> {
  return runUpdateBaselineTemplate(formData, SECRETARY_TOOLS_PATH);
}

export async function toggleAdminTemplateActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  return runToggleBaselineTemplateActive(id, is_active, SECRETARY_TOOLS_PATH);
}

export async function duplicateAdminTemplateAction(id: string): Promise<ActionResult> {
  return runDuplicateBaselineTemplate(id, SECRETARY_TOOLS_PATH);
}

export async function deleteAdminTemplateAction(id: string): Promise<ActionResult> {
  return runDeleteBaselineTemplate(id, SECRETARY_TOOLS_PATH);
}
