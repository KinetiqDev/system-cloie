import { notFound } from "next/navigation";
import { TemplateBuilder } from "@/features/instruments/components/template-builder";
import {
  listFacultyCourseContextsAction,
  loadFacultyManagedCilosAction,
} from "@/lib/actions/course-bound-evaluation-actions";
import {
  saveFacultyTemplateDraftAction,
  validateFacultyTemplatePublishReadinessAction,
} from "@/lib/actions/faculty-template-actions";
import { getFacultyTemplate } from "@/features/instruments/services/list-faculty-templates";
import type { TemplateStructure } from "@/features/instruments/types";

interface FacultyEditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function FacultyEditTemplatePage({ params }: FacultyEditTemplatePageProps) {
  const { id } = await params;

  const templateResult = await getFacultyTemplate(id);
  const courseContextsResult = await listFacultyCourseContextsAction();

  if (!templateResult.success) {
    notFound();
  }

  const template = templateResult.data;
  const courseContexts = courseContextsResult.success ? courseContextsResult.data : [];

  const programLabel =
    template.programCode && template.programName
      ? `${template.programCode} — ${template.programName}`
      : "Institutional Template";

  return (
    <div className="space-y-6">
      <TemplateBuilder
        initialData={{
          id: template.id,
          name: template.name,
          description: template.description ?? "",
          template_type: template.templateType,
          is_active: template.is_active,
          is_faculty_accessible: template.is_faculty_accessible,
          bound_course_id: template.boundCourseId,
          bound_major_id: template.boundMajorId,
          bound_program_id: template.boundProgramId,
          structure: template.structure as unknown as TemplateStructure,
        }}
        facultyConfig={{
          courseContexts,
          initialBindings: template.templateCiloQuestionBindings
            .filter((binding) => binding.ciloId)
            .map((binding) => ({
              ciloDescriptionSnapshot: binding.ciloDescriptionSnapshot,
              ciloId: binding.ciloId!,
              itemKey: binding.itemKey,
              questionPromptSnapshot: binding.questionPromptSnapshot,
              sectionKey: binding.sectionKey,
            })),
          loadManagedCilosAction: loadFacultyManagedCilosAction,
          validatePublishReadinessAction: validateFacultyTemplatePublishReadinessAction,
        }}
        onSave={saveFacultyTemplateDraftAction}
        programLabel={programLabel}
        saveSuccessConfig={{
          toastMessage: "Instrument template saved.",
        }}
        toolsHref="/faculty/tools"
      />
    </div>
  );
}
