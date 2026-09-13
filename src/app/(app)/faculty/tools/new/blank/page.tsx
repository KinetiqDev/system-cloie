import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { listFacultyCourseContextsAction } from "@/lib/actions/course-bound-evaluation-actions";
import { listFacultyTemplates } from "@/features/instruments/services/list-faculty-templates";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Template", "Faculty") };

export default async function FacultyNewBlankTemplatePage() {
  const [templatesResult, courseContextsResult] = await Promise.all([
    listFacultyTemplates(),
    listFacultyCourseContextsAction(),
  ]);

  if (!templatesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-text-primary text-2xl font-black">New Template</h1>
        <p className="text-muted-foreground text-sm">{templatesResult.error}</p>
      </div>
    );
  }

  const { program } = templatesResult.data;
  const courseContexts = courseContextsResult.success ? courseContextsResult.data : [];

  return (
    <div className="space-y-6">
      <FacultyTemplateBuilder
        courseContexts={courseContexts}
        programLabel={`${program.code} — ${program.name}`}
        saveSuccessConfig={{
          toastMessage: "Instrument template saved.",
        }}
      />
    </div>
  );
}
