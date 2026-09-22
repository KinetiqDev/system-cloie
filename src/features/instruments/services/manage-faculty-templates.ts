// fallow-ignore-file code-duplication
import { CourseScope, EvaluationTemplateType, Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyCourseContexts } from "@/features/evaluations/services/list-faculty-course-contexts";
import type { SaveFacultyTemplateDraftInput } from "../schemas/program-head-template";
import { listTemplateLikertQuestions, toTemplateStructure, type TemplateStructure } from "../types";

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

type FacultyTemplateGoBindingItem = {
  goId: string;
  goCodeSnapshot: string;
  goDescriptionSnapshot: string;
  itemKey: string;
  questionPromptSnapshot: string;
  sectionKey: string;
};

export type FacultyTemplatePublicationContext = {
  bindings: FacultyTemplateBindingItem[];
  cilos: Array<{ description: string; id: string }>;
  /** Direct question–GO bindings, frozen into snapshots at publication. */
  goBindings: FacultyTemplateGoBindingItem[];
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

  if (session?.activeRole !== ROLES.FACULTY) {
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
      template_go_question_bindings: true,
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
  if (!input.boundCourseId) {
    return null;
  }

  const course = await prisma.course.findUnique({
    where: { id: input.boundCourseId },
    select: { course_scope: true },
  });
  if (!course) {
    return null;
  }

  const isGeneralEducation = course.course_scope === CourseScope.GENERAL_EDUCATION;

  // General Education Courses have no owning Program; their contexts match on
  // Course alone so faculty can publish shared-Course evaluations. Program-specific
  // Courses must match the bound Program and major exactly.
  if (!isGeneralEducation && !input.boundProgramId) {
    return null;
  }

  const contexts = await listFacultyCourseContexts();
  if (!contexts.success) {
    return null;
  }
  return (
    contexts.data.find((context) =>
      isGeneralEducation
        ? context.courseId === input.boundCourseId
        : context.courseId === input.boundCourseId &&
          context.programId === input.boundProgramId &&
          context.majorId === (input.boundMajorId ?? null)
    ) ?? null
  );
}

/** Question identity as a structural tuple, never a separator join. */
function encodeQuestionKey(sectionKey: string, itemKey: string): string {
  return JSON.stringify([sectionKey, itemKey]);
}

/** Binding identity as a structural tuple, never a separator join. */
function encodeGoBindingKey(goId: string, sectionKey: string, itemKey: string): string {
  return JSON.stringify([goId, sectionKey, itemKey]);
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
    likertQuestions.map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question,
    ])
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
  const usedQuestionKeys = new Set<string>();
  const normalized = [];

  for (const binding of input.bindings) {
    const cilo = ciloMap.get(binding.ciloId);
    const questionKey = encodeQuestionKey(binding.sectionKey, binding.itemKey);
    const question = questionMap.get(questionKey);

    if (!cilo) {
      return { success: false, error: "One or more selected CILOs are invalid." };
    }

    if (!question) {
      return { success: false, error: "CILOs can only be assigned to Likert questions." };
    }

    if (usedQuestionKeys.has(questionKey)) {
      return { success: false, error: "A Likert question can only be assigned one CILO." };
    }

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

/**
 * Validates draft question–GO bindings for a Course-bound template. The GO
 * pool is the bound Course's owning Program, never the client payload, and
 * General Education Courses are rejected outright: they have no owning Program
 * and their CILOs align to Institutional Outcomes (ADR 0005).
 *
 * Coverage is not required. A Likert question without a GO binding saves and
 * publishes as a general evaluation item, mirroring the Program-wide rule.
 */
export async function validateCourseBoundGoBindings(input: {
  bindings: SaveFacultyTemplateDraftInput["go_question_bindings"];
  boundCourseId?: string | null;
  structure: TemplateStructure;
  db?: PublicationContextDb;
}): Promise<
  { success: true; bindings: FacultyTemplateGoBindingItem[] } | { success: false; error: string }
> {
  if (input.bindings.length === 0) {
    return { success: true, bindings: [] };
  }

  if (!input.boundCourseId) {
    return {
      success: false,
      error: "Select a course before assigning Graduate Outcomes to questions.",
    };
  }

  const db = input.db ?? prisma;
  const course = await db.course.findUnique({
    where: { id: input.boundCourseId },
    select: { course_scope: true, program_id: true },
  });

  if (!course) {
    return { success: false, error: "Selected course is unavailable." };
  }

  if (course.course_scope === CourseScope.GENERAL_EDUCATION) {
    return {
      success: false,
      error: "Graduate Outcomes can only be assigned to questions in program-specific courses.",
    };
  }

  if (!course.program_id) {
    return {
      success: false,
      error: "This course has no owning program, so Graduate Outcomes cannot be assigned.",
    };
  }

  const likertQuestions = listTemplateLikertQuestions(input.structure);
  const questionMap = new Map(
    likertQuestions.map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question,
    ])
  );
  const gos = await db.gO.findMany({
    where: {
      id: { in: input.bindings.map((binding) => binding.goId) },
      program_id: course.program_id,
      is_active: true,
    },
    select: { code: true, description: true, id: true },
  });
  const goMap = new Map(gos.map((go) => [go.id, go]));
  const usedPairs = new Set<string>();
  const normalized: FacultyTemplateGoBindingItem[] = [];

  for (const binding of input.bindings) {
    const go = goMap.get(binding.goId);
    const question = questionMap.get(encodeQuestionKey(binding.sectionKey, binding.itemKey));

    if (!go) {
      return {
        success: false,
        error: "One or more selected Graduate Outcomes are not available to this course.",
      };
    }

    if (!question) {
      return {
        success: false,
        error: "Graduate Outcomes can only be assigned to Likert questions.",
      };
    }

    const pairKey = encodeGoBindingKey(binding.goId, binding.sectionKey, binding.itemKey);
    if (usedPairs.has(pairKey)) {
      return {
        success: false,
        error: "A Graduate Outcome can only be assigned once to the same question.",
      };
    }
    usedPairs.add(pairKey);

    normalized.push({
      goCodeSnapshot: go.code,
      goDescriptionSnapshot: go.description,
      goId: go.id,
      itemKey: binding.itemKey,
      questionPromptSnapshot: question.prompt,
      sectionKey: binding.sectionKey,
    });
  }

  return { success: true, bindings: normalized };
}

type FacultyDraftSource = {
  id: string;
  code: string;
  program_id: string | null;
  source_template_id: string | null;
};

type FacultyDraftTarget = {
  /** Starting template, or null when the draft is created blank. */
  source: FacultyDraftSource | null;
  /** Template the caller already owns, which updates in place. */
  ownedTemplateId: string | null;
  owningProgramId: string | null;
};

const TEMPLATE_UNAVAILABLE = "Template not found or unavailable.";
const STARTING_TEMPLATE_UNAVAILABLE = "Starting template not found or unavailable.";

/**
 * Resolves the stored template a draft is based on. The id wins over
 * `source_template_id`: an id names a template the faculty member is editing or
 * copying from the tools list, while a source id names the starting point they
 * picked in the create flow.
 */
async function resolveFacultyDraftTarget(
  input: SaveFacultyTemplateDraftInput,
  facultyId: string
): Promise<ServiceResult<FacultyDraftTarget>> {
  const requestedId = input.id ?? input.source_template_id;
  const storedTemplate = requestedId ? await canAccessSourceTemplate(requestedId, facultyId) : null;

  if (requestedId && !storedTemplate) {
    return {
      success: false,
      error: input.id ? TEMPLATE_UNAVAILABLE : STARTING_TEMPLATE_UNAVAILABLE,
    };
  }

  const source: FacultyDraftSource | null = storedTemplate
    ? {
        code: storedTemplate.code,
        id: storedTemplate.id,
        program_id: storedTemplate.program_id,
        source_template_id: storedTemplate.source_template_id,
      }
    : null;

  // A copy belongs to its starting template's Program; a blank draft belongs to
  // the faculty's first active affiliation, which the tools catalog reads.
  const owningProgramId = source
    ? source.program_id
    : ((await getFacultyProgramIds(facultyId))[0] ?? null);

  if (!source && !owningProgramId) {
    return { success: false, error: "No active program affiliation found." };
  }

  return {
    success: true,
    data: {
      source,
      ownedTemplateId: storedTemplate?.faculty_owner_id === facultyId ? storedTemplate.id : null,
      owningProgramId,
    },
  };
}

async function updateOwnedFacultyDraft(
  tx: Prisma.TransactionClient,
  templateId: string,
  input: SaveFacultyTemplateDraftInput,
  structure: TemplateStructure
): Promise<void> {
  await tx.instrumentTemplate.update({
    where: { id: templateId },
    data: {
      bound_course_id: input.bound_course_id ?? null,
      bound_major_id: input.bound_major_id ?? null,
      bound_program_id: input.bound_program_id ?? null,
      description: input.description ?? null,
      name: input.name,
      is_active: input.is_active,
      structure: structure as unknown as Prisma.InputJsonValue,
    },
  });

  const latestVersion = await tx.instrumentVersion.findFirst({
    where: { template_id: templateId },
    orderBy: { version_number: "desc" },
    select: { id: true },
  });

  if (latestVersion) {
    await tx.instrumentVersion.update({
      where: { id: latestVersion.id },
      data: { structure_snapshot: structure as unknown as Prisma.InputJsonValue },
    });
  }
}

async function createFacultyDraft(
  tx: Prisma.TransactionClient,
  input: SaveFacultyTemplateDraftInput,
  structure: TemplateStructure,
  target: FacultyDraftTarget,
  facultyId: string
): Promise<string> {
  const created = await tx.instrumentTemplate.create({
    data: {
      bound_course_id: input.bound_course_id ?? null,
      bound_major_id: input.bound_major_id ?? null,
      bound_program_id: input.bound_program_id ?? null,
      code: generateFacultyTemplateCode(target.source?.code ?? input.name, facultyId),
      description: input.description ?? null,
      faculty_owner_id: facultyId,
      is_active: input.is_active,
      is_faculty_accessible: false,
      name: input.name,
      program_id: target.owningProgramId,
      source_template_id: target.source
        ? (target.source.source_template_id ?? target.source.id)
        : null,
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

  return created.id;
}

async function replaceDraftBindings(
  tx: Prisma.TransactionClient,
  templateId: string,
  bindings: FacultyTemplateBindingItem[],
  goBindings: FacultyTemplateGoBindingItem[] = []
): Promise<void> {
  await tx.instrumentTemplateCiloQuestionBinding.deleteMany({
    where: { template_id: templateId },
  });
  await tx.instrumentTemplateGoQuestionBinding.deleteMany({
    where: { template_id: templateId },
  });

  if (bindings.length > 0) {
    await tx.instrumentTemplateCiloQuestionBinding.createMany({
      data: bindings.map((binding) => ({
        cilo_description_snapshot: binding.ciloDescriptionSnapshot,
        cilo_id: binding.ciloId,
        item_key: binding.itemKey,
        question_prompt_snapshot: binding.questionPromptSnapshot,
        section_key: binding.sectionKey,
        template_id: templateId,
      })),
    });
  }

  if (goBindings.length > 0) {
    await tx.instrumentTemplateGoQuestionBinding.createMany({
      data: goBindings.map((binding) => ({
        go_code_snapshot: binding.goCodeSnapshot,
        go_description_snapshot: binding.goDescriptionSnapshot,
        go_id: binding.goId,
        item_key: binding.itemKey,
        question_prompt_snapshot: binding.questionPromptSnapshot,
        section_key: binding.sectionKey,
        template_id: templateId,
      })),
    });
  }
}

/**
 * Saves a faculty draft. An owned template updates in place; a faculty-unowned
 * source becomes the caller's copy; with neither, the draft is created blank.
 */
export async function saveFacultyTemplateDraft(
  input: SaveFacultyTemplateDraftInput
): Promise<ServiceResult<{ id: string }>> {
  const auth = await requireFacultySession();

  if (!auth.success) {
    return auth;
  }

  const targetResult = await resolveFacultyDraftTarget(input, auth.data.userId);

  if (!targetResult.success) {
    return targetResult;
  }

  const target = targetResult.data;

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

  const goBindingValidation = await validateCourseBoundGoBindings({
    bindings: input.go_question_bindings,
    boundCourseId: input.bound_course_id,
    structure,
  });

  if (!goBindingValidation.success) {
    return goBindingValidation;
  }

  try {
    const savedId = await prisma.$transaction(async (tx) => {
      if (target.ownedTemplateId) {
        await updateOwnedFacultyDraft(tx, target.ownedTemplateId, input, structure);
        await replaceDraftBindings(
          tx,
          target.ownedTemplateId,
          bindingValidation.bindings,
          goBindingValidation.bindings
        );
        return target.ownedTemplateId;
      }

      const createdId = await createFacultyDraft(tx, input, structure, target, auth.data.userId);
      await replaceDraftBindings(
        tx,
        createdId,
        bindingValidation.bindings,
        goBindingValidation.bindings
      );
      return createdId;
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

    if (source.template_go_question_bindings.length > 0) {
      await tx.instrumentTemplateGoQuestionBinding.createMany({
        data: source.template_go_question_bindings.map((binding) => ({
          go_code_snapshot: binding.go_code_snapshot,
          go_description_snapshot: binding.go_description_snapshot,
          go_id: binding.go_id,
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

export async function deleteFacultyTemplate(templateId: string): Promise<ServiceResult> {
  const auth = await requireFacultySession();

  if (!auth.success) {
    return auth;
  }

  const template = await prisma.instrumentTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      faculty_owner_id: true,
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

  if (template.faculty_owner_id !== auth.data.userId) {
    return { success: false, error: "You can only delete templates you created." };
  }

  const hasDeployments = template.versions.some(
    (version) => version._count.course_bounds > 0 || version._count.central_insts > 0
  );

  if (hasDeployments) {
    return {
      success: false,
      error: "Templates with published evaluations cannot be deleted.",
    };
  }

  await prisma.instrumentTemplate.delete({ where: { id: templateId } });

  return { success: true, data: undefined };
}

type BoundCourseTemplate = {
  bound_course_id: string | null;
  bound_course: { course_scope: string } | null;
  bound_program_id: string | null;
  bound_major_id: string | null;
};

type CourseContextOverride = {
  courseType: string;
  majorName: string | null;
  programCode: string;
  programName: string;
  scopeLabel: string;
};

async function resolvePublicationCourseContext(
  template: BoundCourseTemplate,
  courseContext?: CourseContextOverride | null
): Promise<{ error: string } | { data: CourseContextOverride }> {
  if (!template.bound_course_id || !template.bound_course) {
    return { error: "Select a course before publishing this template." };
  }

  // General Education Courses have no owning Program; their contexts match on
  // Course alone. Program-specific Courses must resolve through the bound
  // Program and major.
  if (
    template.bound_course.course_scope !== CourseScope.GENERAL_EDUCATION &&
    !template.bound_program_id
  ) {
    return { error: "Select a course before publishing this template." };
  }

  const resolved =
    courseContext ??
    (await resolveFacultyCourseContext({
      boundCourseId: template.bound_course_id,
      boundMajorId: template.bound_major_id,
      boundProgramId: template.bound_program_id,
    }));

  if (!resolved) {
    return { error: "The saved course context is no longer available." };
  }

  return { data: resolved };
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
      template_go_question_bindings: true,
    },
  });

  if (!template) {
    return { success: false, error: "Faculty-owned template not found." };
  }

  const courseResolution = await resolvePublicationCourseContext(template, options.courseContext);
  if ("error" in courseResolution) {
    return { success: false, error: courseResolution.error };
  }
  if (!template.bound_course_id || !template.bound_course) {
    return { success: false, error: "Select a course before publishing this template." };
  }
  const courseContext = courseResolution.data;

  const cilos = await db.cILO.findMany({
    where: { course_id: template.bound_course_id, is_active: true },
    orderBy: { created_at: "asc" },
    select: { description: true, id: true },
  });

  if (cilos.length === 0) {
    return { success: false, error: "This course has no saved CILOs." };
  }

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

  // Coverage gate: every active CILO of the bound course must be evidenced by
  // at least one Likert question. A CILO may span several questions, so the
  // number of bindings is unrelated to the number of CILOs.
  const boundCiloIds = new Set(bindingValidation.bindings.map((binding) => binding.ciloId));

  if (cilos.some((cilo) => !boundCiloIds.has(cilo.id))) {
    return {
      success: false,
      error: "Every saved CILO must be assigned to at least one Likert question before publishing.",
    };
  }

  // Direct question-GO bindings stay optional: an unbound Likert question
  // publishes as a general item. A null go_id means its GO was deleted
  // after the draft was saved (FK SET NULL). Block like an archived or
  // foreign GO so the loss is explicit, matching the central publish
  // plan, instead of silently dropping the intended coverage. The next
  // draft save prunes the row.
  if (template.template_go_question_bindings.some((binding) => !binding.go_id)) {
    return {
      success: false,
      error: "One or more selected Graduate Outcomes are not available to this course.",
    };
  }
  const goBindingValidation = await validateCourseBoundGoBindings({
    bindings: template.template_go_question_bindings
      .filter((binding) => binding.go_id)
      .map((binding) => ({
        goId: binding.go_id!,
        itemKey: binding.item_key,
        sectionKey: binding.section_key,
      })),
    boundCourseId: template.bound_course_id,
    structure,
    db,
  });

  if (!goBindingValidation.success) {
    return goBindingValidation;
  }

  return {
    success: true,
    data: {
      bindings: bindingValidation.bindings,
      cilos,
      goBindings: goBindingValidation.bindings,
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
      programId: template.bound_program_id ?? "",
      template: {
        id: template.id,
        name: template.name,
        structure,
      },
    },
  };
}
