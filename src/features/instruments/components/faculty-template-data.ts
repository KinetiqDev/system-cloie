import { listFacultyCourseContexts } from "@/features/evaluations/services/list-faculty-course-contexts";
import type { FacultyCourseContext } from "@/features/evaluations/types";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getFacultyTemplate, type FacultyTemplateItem } from "../services/list-faculty-templates";
import {
  toTemplateStructure,
  type EvaluationTemplateType,
  type TemplateCiloQuestionBinding,
  type TemplateGoQuestionBinding,
  type TemplateStructure,
} from "../types";

type FacultyTemplateBuilderData = {
  /** Seed values for the builder's template settings and structure. */
  initialData: {
    name: string;
    description: string;
    template_type: EvaluationTemplateType;
    is_active: boolean;
    is_faculty_accessible: boolean;
    bound_course_id: string | null;
    bound_major_id: string | null;
    bound_program_id: string | null;
    structure: TemplateStructure;
  };
  /** CILO and GO bindings already carried by the stored template. */
  initialBindings: TemplateCiloQuestionBinding[];
  /** Direct question–GO bindings already carried by the stored template. */
  initialGoBindings: TemplateGoQuestionBinding[];
};

/**
 * Projects a stored faculty-visible template into builder seed data, shared by
 * the edit route and the create-from-template route. The template id is omitted
 * on purpose: callers add it when the template is already the faculty member's
 * own, and leave it out when the save must create their copy.
 */
function toFacultyTemplateBuilderData(template: FacultyTemplateItem): FacultyTemplateBuilderData {
  return {
    initialData: {
      name: template.name,
      description: template.description ?? "",
      template_type: template.templateType,
      is_active: template.is_active,
      is_faculty_accessible: template.is_faculty_accessible,
      bound_course_id: template.boundCourseId,
      bound_major_id: template.boundMajorId,
      bound_program_id: template.boundProgramId,
      structure: toTemplateStructure(template.structure),
    },
    initialBindings: template.templateCiloQuestionBindings
      .filter((binding) => binding.ciloId)
      .map((binding) => ({
        ciloDescriptionSnapshot: binding.ciloDescriptionSnapshot,
        ciloId: binding.ciloId!,
        itemKey: binding.itemKey,
        questionPromptSnapshot: binding.questionPromptSnapshot,
        sectionKey: binding.sectionKey,
      })),
    initialGoBindings: template.templateGoQuestionBindings
      .filter((binding) => binding.goId)
      .map((binding) => ({
        goCodeSnapshot: binding.goCodeSnapshot,
        goDescriptionSnapshot: binding.goDescriptionSnapshot,
        goId: binding.goId!,
        itemKey: binding.itemKey,
        sectionKey: binding.sectionKey,
      })),
  };
}

export type FacultyTemplateBuilderSeed = FacultyTemplateBuilderData & {
  template: FacultyTemplateItem;
  /** Course contexts the faculty member may bind CILOs to. */
  courseContexts: FacultyCourseContext[];
  programLabel: string;
  /** True when the loaded template is already this faculty member's own. */
  ownedByViewer: boolean;
};

/**
 * Loads everything the faculty builder needs for one accessible template, or
 * `null` when the template is not available to this account.
 */
export async function loadFacultyTemplateBuilderSeed(
  templateId: string
): Promise<FacultyTemplateBuilderSeed | null> {
  const [templateResult, courseContextsResult, session] = await Promise.all([
    getFacultyTemplate(templateId),
    listFacultyCourseContexts(),
    resolveAuthSession(),
  ]);

  if (!templateResult.success) return null;

  const template = templateResult.data;

  return {
    ...toFacultyTemplateBuilderData(template),
    template,
    courseContexts: courseContextsResult.success ? courseContextsResult.data : [],
    programLabel:
      template.programCode && template.programName
        ? `${template.programCode} — ${template.programName}`
        : "Institutional Template",
    ownedByViewer: Boolean(template.facultyOwnerId) && template.facultyOwnerId === session?.userId,
  };
}
