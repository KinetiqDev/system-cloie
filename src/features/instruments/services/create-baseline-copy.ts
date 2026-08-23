"use server";

import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import {
  normalizePloQuestionBindings,
  syncTemplatePloBindings,
} from "./manage-program-head-templates";
import type { TemplateStructure } from "../types";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

interface CreateBaselineCopyInput {
  programId: string;
  baselineId: string;
  customName: string;
  structure: TemplateStructure;
  ploBindings: Array<{ ploId: string; itemKey: string; sectionKey: string }>;
}

function generateProgramTemplateCode(programCode: string, baseCode: string): string {
  // Generate code like "BSIT-CILO-EVAL" from program code + original code
  return `${programCode}-${baseCode}`;
}

export async function createBaselineCopy(
  input: CreateBaselineCopyInput
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await resolveProgramHeadContext(input.programId);

  if (!authResult.success) {
    return authResult;
  }

  const { userId, selectedProgram } = authResult.data;
  const programId = selectedProgram.id;

  // Fetch the baseline template
  const baseline = await prisma.instrumentTemplate.findUnique({
    where: { id: input.baselineId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      template_type: true,
      is_faculty_accessible: true,
      structure: true,
      faculty_owner_id: true,
      program_id: true,
    },
  });

  if (!baseline) {
    return { success: false, error: "Baseline template not found." };
  }

  // Verify this is an institutional baseline (admin-owned, program-unbound)
  if (baseline.faculty_owner_id !== null || baseline.program_id !== null) {
    return {
      success: false,
      error: "Only institutional baseline templates can be copied this way.",
    };
  }

  // Get program details for code generation
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { code: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const code = generateProgramTemplateCode(program.code, baseline.code);

  // Validate question–PLO bindings against the program's active PLO catalog.
  // Empty bindings are allowed: drafts copy without bindings, and full Likert
  // coverage is enforced at publication.
  const activePlos =
    input.ploBindings.length > 0
      ? await prisma.pLO.findMany({
          where: { program_id: programId, is_active: true },
          select: { id: true, code: true, description: true },
        })
      : [];

  const bindingValidation = normalizePloQuestionBindings({
    bindings: input.ploBindings,
    structure: input.structure,
    plos: activePlos,
  });

  if (!bindingValidation.success) {
    return bindingValidation;
  }

  try {
    const template = await prisma.$transaction(async (tx) => {
      const currentProgram = await revalidateProgramHeadAssignment(tx, { userId, programId });
      if (!currentProgram) return null;

      const createdTemplate = await tx.instrumentTemplate.create({
        data: {
          code,
          name: input.customName,
          description: baseline.description ?? null,
          is_active: true,
          is_faculty_accessible:
            baseline.template_type === EvaluationTemplateType.COURSE_BOUND &&
            baseline.is_faculty_accessible,
          program_id: programId,
          source_template_id: baseline.id,
          structure: input.structure as unknown as Prisma.InputJsonValue,
          template_type: baseline.template_type,
        },
      });

      // Create initial version
      await tx.instrumentVersion.create({
        data: {
          template_id: createdTemplate.id,
          version_number: 1,
          structure_snapshot: input.structure as unknown as Prisma.InputJsonValue,
          is_active: true,
        },
      });

      // The program-owned copy owns the PLO bindings made on the baseline.
      await syncTemplatePloBindings(tx, createdTemplate.id, bindingValidation.bindings);

      return createdTemplate;
    });

    if (!template) return { success: false, error: "Selected Program is no longer assigned." };
    return { success: true, data: { id: template.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A template with code "${code}" already exists. Try a different name.`,
      };
    }

    throw error;
  }
}
