"use server";

import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  generateTemplateCode,
  normalizePloQuestionBindings,
  syncTemplatePloBindings,
  withProgramHeadAssignment,
} from "./manage-program-head-templates";
import type { TemplateSettingsInput, TemplateStructure } from "../types";
import { baselineCopySettingsSchema } from "../schemas/program-head-template";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

export interface CreateBaselineCopyInput {
  programId: string;
  baselineId: string;
  customName: string;
  structure: TemplateStructure;
  ploBindings: Array<{ ploId: string; itemKey: string; sectionKey: string }>;
  /**
   * Template settings the author edited before saving. Absent callers inherit
   * the baseline's own description, type, active state, and faculty access.
   */
  settings?: TemplateSettingsInput;
}

/**
 * Mirrors createProgramHeadTemplateSchema's name rules for the builder entry
 * points that reach this service without that schema.
 */
function templateNameError(name: string): string | null {
  if (name.length < 3) return "Template name must be at least 3 characters.";
  if (name.length > 200) return "Template name must be 200 characters or fewer.";
  return null;
}

type BaselineCopySettings = {
  description: string | null;
  isActive: boolean;
  isFacultyAccessible: boolean;
  templateType: EvaluationTemplateType;
};

type CopyBaseline = {
  id: string;
  description: string | null;
  template_type: EvaluationTemplateType;
  is_active: boolean;
  is_faculty_accessible: boolean;
};

/**
 * Rejects a malformed builder-forwarded settings object with a usable message
 * instead of a database failure at save time.
 */
function copySettingsError(settings: TemplateSettingsInput): string | null {
  const parsed = baselineCopySettingsSchema.safeParse(settings);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues[0]?.message ?? "Invalid template settings.";
}

/**
 * Loads the institutional baseline a copy derives from: the row must exist
 * and must be admin-owned and program-unbound.
 */
async function loadCopyBaseline(baselineId: string): Promise<ServiceResult<CopyBaseline>> {
  const baseline = await prisma.instrumentTemplate.findUnique({
    where: { id: baselineId },
    select: {
      id: true,
      description: true,
      template_type: true,
      is_active: true,
      is_faculty_accessible: true,
      faculty_owner_id: true,
      program_id: true,
    },
  });

  if (!baseline) {
    return { success: false, error: "Baseline template not found." };
  }
  if (baseline.faculty_owner_id !== null || baseline.program_id !== null) {
    return {
      success: false,
      error: "Only institutional baseline templates can be copied this way.",
    };
  }
  return { success: true, data: baseline };
}

/**
 * Resolves the copy's settings: the author's edits when the builder sent them,
 * otherwise the baseline's own values. Faculty access stays limited to
 * course-bound templates.
 */
function resolveCopySettings(
  baseline: CopyBaseline,
  settings?: TemplateSettingsInput
): BaselineCopySettings {
  if (!settings) {
    return {
      description: baseline.description,
      isActive: baseline.is_active,
      isFacultyAccessible:
        baseline.template_type === EvaluationTemplateType.COURSE_BOUND &&
        baseline.is_faculty_accessible,
      templateType: baseline.template_type,
    };
  }

  return {
    description: settings.description || null,
    isActive: settings.is_active,
    isFacultyAccessible:
      settings.template_type === EvaluationTemplateType.COURSE_BOUND &&
      settings.is_faculty_accessible,
    templateType: settings.template_type,
  };
}

/**
 * Resolves a globally-unique template code derived from the copy's name. The
 * bare name-derived code is preferred; when it is already taken (two different
 * names can slugify to the same code), a numeric suffix is appended.
 */
async function resolveAvailableTemplateCode(
  programCode: string,
  templateName: string
): Promise<string> {
  const baseCode = generateTemplateCode(programCode, templateName);
  let candidate = baseCode;
  for (let attempt = 2; ; attempt++) {
    const existing = await prisma.instrumentTemplate.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    const suffix = `_${attempt}`;
    candidate = `${baseCode.slice(0, 50 - suffix.length)}${suffix}`;
  }
}

export async function createBaselineCopy(
  input: CreateBaselineCopyInput
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await resolveProgramHeadContext(input.programId);

  if (!authResult.success) {
    return authResult;
  }

  const customName = input.customName.trim();
  const nameError = templateNameError(customName);

  if (nameError) {
    return { success: false, error: nameError };
  }

  if (input.settings !== undefined) {
    const settingsError = copySettingsError(input.settings);
    if (settingsError) {
      return { success: false, error: settingsError };
    }
  }
  const { userId, selectedProgram } = authResult.data;
  const programId = selectedProgram.id;

  const baselineResult = await loadCopyBaseline(input.baselineId);
  if (!baselineResult.success) {
    return baselineResult;
  }
  const baseline = baselineResult.data;

  // Get program details for code generation
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { code: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }
  const copySettings = resolveCopySettings(baseline, input.settings);
  // Only PROGRAM_WIDE templates bind Program Learning Outcomes, so a copy the
  // author retyped as course-bound carries none.
  const ploBindings =
    copySettings.templateType === EvaluationTemplateType.PROGRAM_WIDE ? input.ploBindings : [];

  // Reject a same-name copy before generating a code: code uniqueness was
  // previously derived from the source baseline (program code + baseline code),
  // so a second copy of the same baseline always collided regardless of the
  // name the user entered. The code now derives from the user's name, and a
  // duplicate name within the program is reported plainly.
  const nameConflict = await prisma.instrumentTemplate.findFirst({
    where: { program_id: programId, name: customName },
    select: { id: true },
  });

  if (nameConflict) {
    return {
      success: false,
      error: `A template named "${customName}" already exists for this program. Try a different name.`,
    };
  }

  const code = await resolveAvailableTemplateCode(program.code, customName);

  // Validate question–PLO bindings against the program's active PLO catalog.
  // Empty bindings are allowed: drafts copy without bindings, and full Likert
  // coverage is enforced at publication.
  const activePlos =
    ploBindings.length > 0
      ? await prisma.pLO.findMany({
          where: { program_id: programId, is_active: true },
          select: { id: true, code: true, description: true },
        })
      : [];

  const bindingValidation = normalizePloQuestionBindings({
    bindings: ploBindings,
    structure: input.structure,
    plos: activePlos,
  });

  if (!bindingValidation.success) {
    return bindingValidation;
  }

  try {
    const created = await withProgramHeadAssignment({ userId, programId }, async (tx) => {
      const createdTemplate = await tx.instrumentTemplate.create({
        data: {
          code,
          name: customName,
          description: copySettings.description,
          is_active: copySettings.isActive,
          is_faculty_accessible: copySettings.isFacultyAccessible,
          program_id: programId,
          source_template_id: baseline.id,
          structure: input.structure as unknown as Prisma.InputJsonValue,
          template_type: copySettings.templateType,
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

    if (!created.success) return created;

    return { success: true, data: { id: created.data.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A template named "${customName}" already exists for this program. Try a different name.`,
      };
    }

    throw error;
  }
}
