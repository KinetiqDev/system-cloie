"use server";

import { revalidatePath } from "next/cache";
import { createBaselineCopy } from "@/features/instruments/services/create-baseline-copy";
import type { TemplatePloQuestionBinding, TemplateStructure } from "@/features/instruments/types";
import { buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";

export async function createBaselineCopyAction(
  programId: string,
  baselineId: string,
  customName: string,
  structure: TemplateStructure,
  ploBindings: TemplatePloQuestionBinding[]
) {
  const result = await createBaselineCopy({ programId, baselineId, customName, structure, ploBindings });
  if (result.success) revalidatePath(buildProgramHeadToolsPath(programId));
  return result;
}
