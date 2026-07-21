import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyCourseContexts } from "@/features/evaluations/services/list-faculty-course-contexts";
import type { SaveFacultyTemplateDraftInput } from "../schemas/program-head-template";
import { listTemplateLikertQuestions, type TemplateStructure } from "../types";

import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

type PublicationContextDb = Prisma.TransactionClient | typeof prisma;

export type FacultyTemplateBindingItem = {
  ciloId: string;
  ciloDescriptionSnapshot: string;
  itemKey: string;
  questionPromptSnapshot: string;
  sectionKey: string;
};

export type FacultyTemplatePublicationContext = {
  bindings: FacultyTemplateBindingItem[];
  cilos: Array<{ description: string; id: string }>;
  course: {
    code: string;
    courseType: string;
    id: string;
    majorId: string | null;
    majorName: string | null;
    programCode: string;
    programId: string | null;
    programName: string;
    scopeLabel: string;
    title: string;
  };
  majorId: string | null;
  programId: string;
  template: {
    id: string;
    name: string;
    structure: TemplateStructure;
  };
};

function toTemplateStructure(structure: unknown): TemplateStructure {
  return Array.isArray(structure) ? (structure as TemplateStructure) : [];
}

function slugify(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 30);
}

function generateFacultyTemplateCode(sourceCode: string, userId: string) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${slugify(sourceCode)}_FAC_${userId.slice(0, 6).toUpperCase()}_${suffix}`.substring(
    0,
    50
  );
}

async function requireFacultySession(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session?.roles.includes(ROLES.FACULTY)) {
    return { success: false, error: "Faculty authentication is required." };
  }

  return { success: true, data: { userId: session.userId } };
}

async function getFacultyProgramIds(userId: string) {
  const affiliations = await prisma.facultyProgramAffiliation.findMany({
    where: {
      faculty_id: userId,
      is_active: true,
      program: { is_active: true },
    },
    select: { program_id: true },
  });

  return affiliations.map((affiliation) => affiliation.program_id);
}

async function canAccessSourceTemplate(templateId: string, userId: string) {
  const programIds = await getFacultyProgramIds(userId);

  return prisma.instrumentTemplate.findFirst({
    where: {
      id: templateId,
      is_active: true,
      template_type: EvaluationTemplateType.COURSE_BOUND,
      OR: [
        { faculty_owner_id: userId },
        {
          faculty_owner_id: null,
          is_faculty_accessible: true,
          OR: [{ program_id: { in: programIds } }, { program_id: null }],
        },
      ],
    },
    include: {
      template_cilo_question_bindings: true,
      versions: {
        orderBy: { version_number: "desc" },
        take: 1,
        select: { id: true, version_number: true },
      },
    },
  });
}

async function resolveFacultyCourseContext(input: {
  boundCourseId?: string | null;
  boundMajorId?: string | null;
  boundProgramId?: string | null;
}) {
  if (!input.boundCourseId || !input.boundProgramId) {
    return null;
  }

  const contexts = await listFacultyCourseContexts();
  if (!contexts.success) {
    return null;
  }
  return (
    contexts.data.find(
      (context) =>
        context.courseId === input.boundCourseId &&
        context.programId === input.boundProgramId &&
        context.majorId === (input.boundMajorId ?? null)
    ) ?? null
  );
}

async function validateDraftBindings(input: {
  bindings: SaveFacultyTemplateDraftInput["cilo_question_bindings"];
  boundCourseId?: string | null;
  structure: TemplateStructure;
  db?: PublicationContextDb;
}): Promise<
  | {
      success: true;
      bindings: Array<FacultyTemplateBindingItem & { ciloId: string }>;
    }
  | { success: false; error: string }
> {
  if (input.bindings.length === 0) {
    return { success: true, bindings: [] };
  }

  if (!input.boundCourseId) {
    return {
      success: false,
      error: "Select a course before assigning CILOs to questions.",
    };
  }

  const likertQuestions = listTemplateLikertQuestions(input.structure);
  const questionMap = new Map(
    likertQuestions.map((question) => [`${question.sectionKey}:${question.itemKey}`, question])
  );
  const cilos = await (input.db ?? prisma).cILO.findMany({
    where: {
      course_id: input.boundCourseId,
      id: { in: input.bindings.map((binding) => binding.ciloId) },
      is_active: true,
    },
    select: { description: true, id: true },
  });
  const ciloMap = new Map(cilos.map((cilo) => [cilo.id, cilo]));
  const usedCiloIds = new Set<string>();
  const usedQuestionKeys = new Set<string>();
  const normalized = [];

  for (const binding of input.bindings) {
    const cilo = ciloMap.get(binding.ciloId);
    const questionKey = `${binding.sectionKey}:${binding.itemKey}`;
    const question = questionMap.get(questionKey);

    if (!cilo) {
      return { success: false, error: "One or more selected CILOs are invalid." };
    }

    if (!question) {
      return { success: false, error: "CILOs can only be assigned to Likert questions." };
    }

    if (usedCiloIds.has(cilo.id)) {
      return { success: false, error: "Each CILO can only be assigned once." };
    }

    if (usedQuestionKeys.has(questionKey)) {
      return { success: false, error: "Each Likert question can only have one CILO." };
    }

    usedCiloIds.add(cilo.id);
    usedQuestionKeys.add(questionKey);
    normalized.push({
      ciloDescriptionSnapshot: cilo.description,
      ciloId: cilo.id,
      itemKey: binding.itemKey,
      questionPromptSnapshot: question.prompt,
      sectionKey: binding.sectionKey,
    });
  }

  return { success: true, bindings: normalized };
}

export async function saveFacultyTemplateDraft(
  input: SaveFacultyTemplateDraftInput
): Promise<ServiceResult<{ id: string }>> {
  const auth = await requireFacultySession();

  if (!auth.success) {
    return auth;
  }

  const template = await canAccessSourceTemplate(input.id, auth.data.userId);

  if (!template) {
    return { success: false, error: "Template not found or unavailable." };
  }

  const courseContext = await resolveFacultyCourseContext({
    boundCourseId: input.bound_course_id,
    boundMajorId: input.bound_major_id,
    boundProgramId: input.bound_program_id,
  });

  if ((input.bound_course_id || input.bound_program_id || input.bound_major_id) && !courseContext) {
    return {
      success: false,
      error: "Selected course context is unavailable for this faculty account.",
    };
  }

  const structure = input.structure;
  const bindingValidation = await validateDraftBindings({
    bindings: input.cilo_question_bindings,
    boundCourseId: input.bound_course_id,
    structure,
  });

  if (!bindingValidation.success) {
    return bindingValidation;
  }

  const isOwnedByFaculty = template.faculty_owner_id === auth.data.userId;

  try {
    const savedId = await prisma.$transaction(async (tx) => {
      let templateId = template.id;

      if (isOwnedByFaculty) {
        await tx.instrumentTemplate.update({
          where: { id: template.id },
          data: {
            bound_course_id: input.bound_course_id ?? null,
            bound_major_id: input.bound_major_id ?? null,
            bound_program_id: input.bound_program_id ?? null,
            description: input.description ?? null,
            name: input.name,
            structure: structure as unknown as Prisma.InputJsonValue,
          },
        });

        const latestVersion = await tx.instrumentVersion.findFirst({
          where: { template_id: template.id },
          orderBy: { version_number: "desc" },
          select: { id: true },
        });

        if (latestVersion) {
          await tx.instrumentVersion.update({
            where: { id: latestVersion.id },
            data: { structure_snapshot: structure as unknown as Prisma.InputJsonValue },
          });
        }
      } else {
        const created = await tx.instrumentTemplate.create({
          data: {
            bound_course_id: input.bound_course_id ?? null,
            bound_major_id: input.bound_major_id ?? null,
            bound_program_id: input.bound_program_id ?? null,
            code: generateFacultyTemplateCode(template.code, auth.data.userId),
            description: input.description ?? null,
            faculty_owner_id: auth.data.userId,
            is_active: true,
            is_faculty_accessible: false,
            name: input.name,
            program_id: template.program_id,
            source_template_id: template.source_template_id ?? template.id,
            structure: structure as unknown as Prisma.InputJsonValue,
            template_type: EvaluationTemplateType.COURSE_BOUND,
          },
        });

        await tx.instrumentVersion.create({
          data: {
            is_active: true,
            structure_snapshot: structure as unknown as Prisma.InputJsonValue,
            template_id: created.id,
            version_number: 1,
          },
        });

        templateId = created.id;
      }

      await tx.instrumentTemplateCiloQuestionBinding.deleteMany({
        where: { template_id: templateId },
      });

      if (bindingValidation.bindings.length > 0) {
        await tx.instrumentTemplateCiloQuestionBinding.createMany({
          data: bindingValidation.bindings.map((binding) => ({
            cilo_description_snapshot: binding.ciloDescriptionSnapshot,
            cilo_id: binding.ciloId,
            item_key: binding.itemKey,
            question_prompt_snapshot: binding.questionPromptSnapshot,
            section_key: binding.sectionKey,
            template_id: templateId,
          })),
        });
      }

      return templateId;
    });

    return { success: true, data: { id: savedId } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "A faculty template copy could not be created. Please try again.",
      };
    }

    throw error;
  }
}

export async function duplicateFacultyTemplate(
  templateId: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await requireFacultySession();

  if (!auth.success) {
    return auth;
  }

  const source = await canAccessSourceTemplate(templateId, auth.data.userId);

  if (!source) {
    return { success: false, error: "Template not found or unavailable." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.instrumentTemplate.create({
      data: {
        bound_course_id: source.bound_course_id,
        bound_major_id: source.bound_major_id,
        bound_program_id: source.bound_program_id,
        code: generateFacultyTemplateCode(source.code, auth.data.userId),
        description: source.description,
        faculty_owner_id: auth.data.userId,
        is_active: true,
        is_faculty_accessible: false,
        name: `${source.name} (Copy)`,
        program_id: source.program_id,
        source_template_id: source.source_template_id ?? source.id,
        structure: source.structure as Prisma.InputJsonValue,
        template_type: EvaluationTemplateType.COURSE_BOUND,
      },
    });

    await tx.instrumentVersion.create({
      data: {
        is_active: true,
        structure_snapshot: source.structure as Prisma.InputJsonValue,
        template_id: created.id,
        version_number: 1,
      },
    });

    if (source.template_cilo_question_bindings.length > 0) {
      await tx.instrumentTemplateCiloQuestionBinding.createMany({
        data: source.template_cilo_question_bindings.map((binding) => ({
          cilo_description_snapshot: binding.cilo_description_snapshot,
          cilo_id: binding.cilo_id,
          item_key: binding.item_key,
          question_prompt_snapshot: binding.question_prompt_snapshot,
          section_key: binding.section_key,
          template_id: created.id,
        })),
      });
    }

    return created;
  });

  return { success: true, data: { id: result.id } };
}

export async function getFacultyTemplatePublicationContext(
  templateId: string,
  options: {
    db?: PublicationContextDb;
    facultyId?: string;
    courseContext?: {
      courseType: string;
      majorName: string | null;
      programCode: string;
      programName: string;
      scopeLabel: string;
    };
  } = {}
): Promise<ServiceResult<FacultyTemplatePublicationContext>> {
  let facultyId = options.facultyId;
  if (!facultyId) {
    const auth = await requireFacultySession();
    if (!auth.success) return auth;
    facultyId = auth.data.userId;
  }
  const db = options.db ?? prisma;

  const template = await db.instrumentTemplate.findFirst({
    where: {
      faculty_owner_id: facultyId,
      id: templateId,
      is_active: true,
      template_type: EvaluationTemplateType.COURSE_BOUND,
    },
    include: {
      bound_course: true,
      template_cilo_question_bindings: true,
    },
  });

  if (!template) {
    return { success: false, error: "Faculty-owned template not found." };
  }

  if (!template.bound_course_id || !template.bound_program_id || !template.bound_course) {
    return { success: false, error: "Select a course before publishing this template." };
  }

  const courseContext =
    options.courseContext ??
    (await resolveFacultyCourseContext({
      boundCourseId: template.bound_course_id,
      boundMajorId: template.bound_major_id,
      boundProgramId: template.bound_program_id,
    }));

  if (!courseContext) {
    return { success: false, error: "The saved course context is no longer available." };
  }

  const cilos = await db.cILO.findMany({
    where: { course_id: template.bound_course_id, is_active: true },
    orderBy: { created_at: "asc" },
    select: { description: true, id: true },
  });

  if (cilos.length === 0) {
    return { success: false, error: "This course has no saved CILOs." };
  }

  const liveCiloIds = new Set(cilos.map((cilo) => cilo.id));
  const bindings = template.template_cilo_question_bindings;
  const structure = toTemplateStructure(template.structure);
  const bindingValidation = await validateDraftBindings({
    bindings: bindings
      .filter((binding) => binding.cilo_id)
      .map((binding) => ({
        ciloId: binding.cilo_id!,
        itemKey: binding.item_key,
        sectionKey: binding.section_key,
      })),
    boundCourseId: template.bound_course_id,
    structure,
    db,
  });

  if (!bindingValidation.success) {
    return bindingValidation;
  }

  const boundCiloIds = new Set(bindingValidation.bindings.map((binding) => binding.ciloId));

  if (
    bindings.length !== cilos.length ||
    cilos.some((cilo) => !boundCiloIds.has(cilo.id) || !liveCiloIds.has(cilo.id))
  ) {
    return {
      success: false,
      error: "Every saved CILO must be assigned to one Likert question before publishing.",
    };
  }

  return {
    success: true,
    data: {
      bindings: bindingValidation.bindings,
      cilos,
      course: {
        code: template.bound_course.code,
        courseType: courseContext.courseType,
        id: template.bound_course.id,
        majorId: template.bound_course.major_id,
        majorName: courseContext.majorName,
        programCode: courseContext.programCode,
        programId: template.bound_course.program_id,
        programName: courseContext.programName,
        scopeLabel: courseContext.scopeLabel,
        title: template.bound_course.title,
      },
      majorId: template.bound_major_id,
      programId: template.bound_program_id,
      template: {
        id: template.id,
        name: template.name,
        structure,
      },
    },
  };
}
