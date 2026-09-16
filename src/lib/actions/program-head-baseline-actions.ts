"use server";

import { revalidatePath } from "next/cache";
import { createBaselineCopy } from "@/features/instruments/services/create-baseline-copy";
import { baselineCopySettingsSchema } from "@/features/instruments/schemas/program-head-template";
import type {
  TemplatePloQuestionBinding,
  TemplateSettingsInput,
  TemplateStructure,
} from "@/features/instruments/types";
import { buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";

export async function createBaselineCopyAction(
  programId: string,
  baselineId: string,
  customName: string,
  structure: TemplateStructure,
  ploBindings: TemplatePloQuestionBinding[],
  settings?: TemplateSettingsInput
) {
  if (settings !== undefined) {
    const settingsResult = baselineCopySettingsSchema.safeParse(settings);
    if (!settingsResult.success) {
      return {
        success: false as const,
        error: settingsResult.error.issues[0]?.message ?? "Invalid template settings.",
      };
    }
  }
  const result = await createBaselineCopy({
    programId,
    baselineId,
    customName,
    structure,
    ploBindings,
    settings,
  });
  if (result.success) revalidatePath(buildProgramHeadToolsPath(programId));
  return result;
}
