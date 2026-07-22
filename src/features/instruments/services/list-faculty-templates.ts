import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { EvaluationTemplateType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FacultyTemplateItem = {
  boundCourseId: string | null;
  boundMajorId: string | null;
  boundProgramId: string | null;
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_faculty_accessible: boolean;
  templateType: EvaluationTemplateType;
  programCode: string | null;
  programName: string | null;
  facultyOwnerId: string | null;
  sourceTemplateId: string | null;
  structure: unknown;
  templateCiloQuestionBindings: Array<{
    ciloId: string | null;
    ciloDescriptionSnapshot: string;
    itemKey: string;
    questionPromptSnapshot: string;
    sectionKey: string;
  }>;
  versionCount: number;
};

import { type ServiceResult } from "@/lib/utils/service-result";

export type ListFacultyTemplatesResult = ServiceResult<{
  templates: FacultyTemplateItem[];
  program: { id: string; code: string; name: string };
}>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listFacultyTemplates(): Promise<ListFacultyTemplatesResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Unauthorized. Faculty role required." };
  }

  // Resolve faculty's active program affiliations
  const affiliations = await prisma.facultyProgramAffiliation.findMany({
    where: {
      faculty_id: session.userId,
      is_active: true,
    },
    select: {
      program: { select: { id: true, code: true, name: true } },
    },
  });

  if (affiliations.length === 0) {
    return {
      success: false,
      error: "No active program affiliation found.",
    };
  }

  // Use first affiliation's program
  const program = affiliations[0].program;
  const programIds = affiliations.map((a) => a.program.id);

  // Fetch templates that are faculty-accessible and belong to the faculty's programs
  const rawTemplates = await prisma.instrumentTemplate.findMany({
    where: {
      template_type: EvaluationTemplateType.COURSE_BOUND,
      OR: [
        { faculty_owner_id: session.userId },
        {
          faculty_owner_id: null,
          is_faculty_accessible: true,
          is_active: true,
          OR: [
            { program_id: { in: programIds } },
            { program_id: null }, // institutional baselines with faculty access
          ],
        },
      ],
    },
    include: {
      program: { select: { code: true, name: true } },
      template_cilo_question_bindings: true,
      _count: { select: { versions: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  const templates: FacultyTemplateItem[] = rawTemplates.map((t) => ({
    boundCourseId: t.bound_course_id,
    boundMajorId: t.bound_major_id,
    boundProgramId: t.bound_program_id,
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    is_active: t.is_active,
    is_faculty_accessible: t.is_faculty_accessible,
    templateType: t.template_type,
    programCode: t.program?.code ?? null,
    programName: t.program?.name ?? null,
    facultyOwnerId: t.faculty_owner_id,
    sourceTemplateId: t.source_template_id,
    structure: t.structure,
    templateCiloQuestionBindings: t.template_cilo_question_bindings.map((binding) => ({
      ciloDescriptionSnapshot: binding.cilo_description_snapshot,
      ciloId: binding.cilo_id,
      itemKey: binding.item_key,
      questionPromptSnapshot: binding.question_prompt_snapshot,
      sectionKey: binding.section_key,
    })),
    versionCount: t._count.versions,
  }));

  return { success: true, data: { templates, program } };
}

export async function getFacultyTemplate(
  templateId: string
): Promise<ServiceResult<FacultyTemplateItem>> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty authentication is required." };
  }

  const programIds = await prisma.facultyProgramAffiliation.findMany({
    where: { faculty_id: session.userId, is_active: true },
    select: { program_id: true },
  });

  const template = await prisma.instrumentTemplate.findFirst({
    where: {
      id: templateId,
      template_type: EvaluationTemplateType.COURSE_BOUND,
      OR: [
        { faculty_owner_id: session.userId },
        {
          faculty_owner_id: null,
          is_active: true,
          is_faculty_accessible: true,
          OR: [
            { program_id: { in: programIds.map((item) => item.program_id) } },
            { program_id: null },
          ],
        },
      ],
    },
    select: {
      bound_course_id: true,
      bound_major_id: true,
      bound_program_id: true,
      faculty_owner_id: true,
      id: true,
      code: true,
      name: true,
      description: true,
      is_active: true,
      is_faculty_accessible: true,
      template_type: true,
      structure: true,
      source_template_id: true,
      program: { select: { id: true, code: true, name: true } },
      template_cilo_question_bindings: true,
    },
  });

  if (!template) {
    return { success: false, error: "Template not found or unavailable." };
  }

  const mappedTemplate: FacultyTemplateItem = {
    boundCourseId: template.bound_course_id,
    boundMajorId: template.bound_major_id,
    boundProgramId: template.bound_program_id,
    id: template.id,
    code: template.code,
    name: template.name,
    description: template.description,
    is_active: template.is_active,
    is_faculty_accessible: template.is_faculty_accessible,
    templateType: template.template_type,
    programCode: template.program?.code ?? null,
    programName: template.program?.name ?? null,
    facultyOwnerId: template.faculty_owner_id,
    sourceTemplateId: template.source_template_id,
    structure: template.structure,
    templateCiloQuestionBindings: template.template_cilo_question_bindings.map((binding) => ({
      ciloDescriptionSnapshot: binding.cilo_description_snapshot,
      ciloId: binding.cilo_id,
      itemKey: binding.item_key,
      questionPromptSnapshot: binding.question_prompt_snapshot,
      sectionKey: binding.section_key,
    })),
    versionCount: 0,
  };

  return { success: true, data: mappedTemplate };
}
