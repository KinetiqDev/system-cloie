import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type {
  CreateProgramHeadTemplateInput,
  UpdateProgramHeadTemplateInput,
} from "../schemas/program-head-template";
import type { TemplateStructure } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

export type ProgramHeadTemplateItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  template_type: EvaluationTemplateType;
  structure: unknown;
  is_active: boolean;
  is_faculty_accessible: boolean;
  program_id: string | null;
  created_at: Date;
  updated_at: Date;
  _count: { versions: number };
  latestVersion: {
    id: string;
    version_number: number;
    is_active: boolean;
    created_at: Date;
  } | null;
  isReadOnly: boolean;
};

export type ListProgramHeadTemplatesResult = {
  templates: ProgramHeadTemplateItem[];
  program: { id: string; code: string; name: string };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────



async function resolveAndValidatePHScope(
  userId: string
): Promise<ServiceResult<{ programIds: string[] }>> {
  const assignments = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: userId, is_active: true },
    select: { program_id: true },
  });

  const programIds = [...new Set(assignments.map((a) => a.program_id))];

  if (programIds.length === 0) {
    return {
      success: false,
      error: "No active program assignment found for this Program Head.",
    };
  }

  return { success: true, data: { programIds } };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateTemplateCode(programCode: string, templateName: string): string {
  const slug = slugify(templateName).toUpperCase().replace(/-/g, "_");
  return `${programCode}_${slug}`.substring(0, 50);
}

// ─── Auth Guard ──────────────────────────────────────────────────────────────

async function requirePHSession(): Promise<
  ServiceResult<{
    userId: string;
    programIds: string[];
    programId: string;
  }>
> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
    return {
      success: false,
      error: "Program Head authentication is required.",
    };
  }

  const scopeResult = await resolveAndValidatePHScope(session.userId);

  if (!scopeResult.success) {
    return scopeResult;
  }

  const { programIds } = scopeResult.data;

  return {
    success: true,
    data: { userId: session.userId, programIds, programId: programIds[0] },
  };
}

// ─── List Templates ──────────────────────────────────────────────────────────

export async function listProgramHeadTemplates(): Promise<
  ServiceResult<ListProgramHeadTemplatesResult>
> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programId } = authResult.data;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, code: true, name: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const rawTemplates = await prisma.instrumentTemplate.findMany({
    where: {
      program_id: programId, // Only program-owned templates
    },
    include: {
      versions: {
        orderBy: { version_number: "desc" },
        take: 1,
        select: {
          id: true,
          version_number: true,
          is_active: true,
          created_at: true,
        },
      },
      _count: {
        select: { versions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const templates: ProgramHeadTemplateItem[] = rawTemplates.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    template_type: t.template_type,
    structure: t.structure,
    is_active: t.is_active,
    is_faculty_accessible: t.is_faculty_accessible,
    program_id: t.program_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
    _count: t._count,
    latestVersion: t.versions[0] ?? null,
    isReadOnly: false, // All returned templates are program-owned and editable
  }));

  return { success: true, data: { templates, program } };
}

// ─── Create Template ─────────────────────────────────────────────────────────

export async function createProgramHeadTemplate(
  input: CreateProgramHeadTemplateInput
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programId } = authResult.data;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { code: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const code = generateTemplateCode(program.code, input.name);

  try {
    const template = await prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.instrumentTemplate.create({
        data: {
          code,
          name: input.name,
          description: input.description ?? null,
          is_active: true,
          is_faculty_accessible:
            input.template_type === EvaluationTemplateType.COURSE_BOUND &&
            input.is_faculty_accessible,
          program_id: programId,
          structure: input.structure as unknown as Prisma.InputJsonValue,
          template_type: input.template_type,
        },
      });

      await tx.instrumentVersion.create({
        data: {
          template_id: createdTemplate.id,
          version_number: 1,
          structure_snapshot: input.structure as unknown as Prisma.InputJsonValue,
          is_active: true,
        },
      });

      return createdTemplate;
    });

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

// ─── Update Template ─────────────────────────────────────────────────────────

export async function updateProgramHeadTemplate(
  input: UpdateProgramHeadTemplateInput
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programIds } = authResult.data;

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      program_id: true,
      _count: { select: { versions: true } },
    },
  });

  if (!template) {
    return { success: false, error: "Template not found." };
  }

  // Cannot update institutional baselines
  if (template.program_id === null) {
    return {
      success: false,
      error: "Institutional baseline templates cannot be modified by Program Heads.",
    };
  }

  // Must own the template's program
  if (!programIds.includes(template.program_id)) {
    return {
      success: false,
      error: "You do not have permission to modify this template.",
    };
  }

  try {
    // Check if template has any deployments (course_bounds or central_insts)
    const hasDeployments = await prisma.instrumentVersion.findFirst({
      where: {
        template_id: input.id,
        OR: [{ course_bounds: { some: {} } }, { central_insts: { some: {} } }],
      },
      select: { id: true },
    });

    if (hasDeployments) {
      // Structure changed → create new version
      const latestVersion = await prisma.instrumentVersion.findFirst({
        where: { template_id: input.id },
        orderBy: { version_number: "desc" },
        select: { version_number: true },
      });

      const nextVersion = (latestVersion?.version_number ?? 0) + 1;

      await prisma.$transaction(async (tx) => {
        await tx.instrumentTemplate.update({
          where: { id: input.id },
          data: {
            name: input.name,
            description: input.description ?? null,
            is_faculty_accessible:
              input.template_type === EvaluationTemplateType.COURSE_BOUND &&
              input.is_faculty_accessible,
            structure: input.structure as unknown as Prisma.InputJsonValue,
            template_type: input.template_type,
          },
        });

        await tx.instrumentVersion.create({
          data: {
            template_id: input.id,
            version_number: nextVersion,
            structure_snapshot: input.structure as unknown as Prisma.InputJsonValue,
            is_active: true,
          },
        });
      });
    } else {
      // No deployments → update in place (including the existing version)
      await prisma.$transaction(async (tx) => {
        await tx.instrumentTemplate.update({
          where: { id: input.id },
          data: {
            name: input.name,
            description: input.description ?? null,
            is_faculty_accessible:
              input.template_type === EvaluationTemplateType.COURSE_BOUND &&
              input.is_faculty_accessible,
            structure: input.structure as unknown as Prisma.InputJsonValue,
            template_type: input.template_type,
          },
        });

        // Update the latest version's snapshot in place
        const latestVersion = await tx.instrumentVersion.findFirst({
          where: { template_id: input.id },
          orderBy: { version_number: "desc" },
          select: { id: true },
        });

        if (latestVersion) {
          await tx.instrumentVersion.update({
            where: { id: latestVersion.id },
            data: {
              structure_snapshot: input.structure as unknown as Prisma.InputJsonValue,
            },
          });
        }
      });
    }

    return { success: true, data: { id: input.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "A template with this code already exists.",
      };
    }

    throw error;
  }
}

// ─── Duplicate Template ──────────────────────────────────────────────────────

export async function duplicateTemplate(
  templateId: string
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programId } = authResult.data;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { code: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const source = await prisma.instrumentTemplate.findUnique({
    where: { id: templateId },
    select: {
      name: true,
      description: true,
      structure: true,
      template_type: true,
      is_faculty_accessible: true,
      program_id: true,
    },
  });

  if (!source) {
    return { success: false, error: "Source template not found." };
  }

  // Source must be in PH's program scope OR an institutional baseline
  if (source.program_id !== null && source.program_id !== programId) {
    return {
      success: false,
      error: "You do not have permission to duplicate this template.",
    };
  }

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const newName = `${source.name} (Copy)`;
  const newCode =
    `${generateTemplateCode(program.code, source.name)}-COPY-${randomSuffix}`.substring(0, 50);

  try {
    const template = await prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.instrumentTemplate.create({
        data: {
          code: newCode,
          name: newName,
          description: source.description,
          is_active: true,
          is_faculty_accessible:
            source.template_type === EvaluationTemplateType.COURSE_BOUND &&
            source.is_faculty_accessible,
          program_id: programId,
          structure: source.structure ?? ([] as Prisma.InputJsonValue),
          template_type: source.template_type,
        },
      });

      await tx.instrumentVersion.create({
        data: {
          template_id: createdTemplate.id,
          version_number: 1,
          structure_snapshot: source.structure ?? ([] as Prisma.InputJsonValue),
          is_active: true,
        },
      });

      return createdTemplate;
    });

    return { success: true, data: { id: template.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "Failed to generate a unique code for the duplicate. Try again.",
      };
    }

    throw error;
  }
}

// ─── Toggle Active ───────────────────────────────────────────────────────────

export async function toggleTemplateActive(id: string, is_active: boolean): Promise<ServiceResult> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programIds } = authResult.data;

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id },
    select: { id: true, program_id: true, template_type: true },
  });

  if (!template) {
    return { success: false, error: "Template not found." };
  }

  if (template.program_id === null) {
    return {
      success: false,
      error: "Institutional baseline templates cannot be modified.",
    };
  }

  if (!programIds.includes(template.program_id)) {
    return {
      success: false,
      error: "You do not have permission to modify this template.",
    };
  }

  await prisma.instrumentTemplate.update({
    where: { id },
    data: { is_active },
  });

  return { success: true, data: undefined };
}

// ─── Toggle Faculty Accessible ───────────────────────────────────────────────

export async function deleteProgramHeadTemplate(id: string): Promise<ServiceResult> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programIds } = authResult.data;

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      program_id: true,
      versions: {
        select: {
          _count: {
            select: {
              course_bounds: true,
              central_insts: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    return { success: false, error: "Template not found." };
  }

  if (template.program_id === null) {
    return {
      success: false,
      error: "Institutional baseline templates cannot be deleted by Program Heads.",
    };
  }

  if (!programIds.includes(template.program_id)) {
    return {
      success: false,
      error: "You do not have permission to delete this template.",
    };
  }

  const hasDeployments = template.versions.some(
    (version) => version._count.course_bounds > 0 || version._count.central_insts > 0
  );

  if (hasDeployments) {
    return {
      success: false,
      error: "Templates with published deployments cannot be deleted. Deactivate them instead.",
    };
  }

  await prisma.instrumentTemplate.delete({
    where: { id },
  });

  return { success: true, data: undefined };
}

export async function toggleFacultyAccessible(
  id: string,
  is_faculty_accessible: boolean
): Promise<ServiceResult> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programIds } = authResult.data;

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id },
    select: { id: true, program_id: true, template_type: true },
  });

  if (!template) {
    return { success: false, error: "Template not found." };
  }

  if (template.program_id === null) {
    return {
      success: false,
      error: "Institutional baseline templates cannot be modified.",
    };
  }

  if (!programIds.includes(template.program_id)) {
    return {
      success: false,
      error: "You do not have permission to modify this template.",
    };
  }

  if (template.template_type !== EvaluationTemplateType.COURSE_BOUND && is_faculty_accessible) {
    return {
      success: false,
      error: "Only course-bound templates can be faculty-accessible.",
    };
  }

  await prisma.instrumentTemplate.update({
    where: { id },
    data: {
      is_faculty_accessible,
    },
  });

  return { success: true, data: undefined };
}

// ─── Get Template by ID (for edit page) ──────────────────────────────────────

export async function getProgramHeadTemplate(id: string): Promise<
  ServiceResult<{
    template: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      structure: TemplateStructure;
      template_type: EvaluationTemplateType;
      is_active: boolean;
      is_faculty_accessible: boolean;
      program_id: string | null;
    };
    program: { id: string; code: string; name: string };
  }>
> {
  const authResult = await requirePHSession();

  if (!authResult.success) {
    return authResult;
  }

  const { programIds, programId } = authResult.data;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, code: true, name: true },
  });

  if (!program) {
    return { success: false, error: "Assigned program not found." };
  }

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      structure: true,
      template_type: true,
      is_active: true,
      is_faculty_accessible: true,
      program_id: true,
    },
  });

  if (!template) {
    return { success: false, error: "Template not found." };
  }

  // Must be in PH's program scope or an institutional baseline
  if (template.program_id !== null && !programIds.includes(template.program_id)) {
    return {
      success: false,
      error: "You do not have permission to view this template.",
    };
  }

  return {
    success: true,
    data: {
      template: {
        ...template,
        structure: (template.structure as unknown as TemplateStructure) ?? [],
      },
      program,
    },
  };
}
