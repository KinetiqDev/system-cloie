import {
  TemplateStartChooser,
  type TemplateStartSource,
} from "@/features/instruments/components/template-start-chooser";
import { listFacultyTemplates } from "@/features/instruments/services/list-faculty-templates";
import { toTemplateStructure } from "@/features/instruments/types";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Evaluation Template", "Faculty") };

export default async function FacultyNewTemplateRoute() {
  const templatesResult = await listFacultyTemplates();

  if (!templatesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-text-primary text-2xl font-black">
          New Evaluation Template
        </h1>
        <p className="text-muted-foreground text-sm">{templatesResult.error}</p>
      </div>
    );
  }

  const { program, templates } = templatesResult.data;

  // Only shared templates seed a new copy: the faculty member's own templates
  // are duplicated from the tools list instead.
  const sources: TemplateStartSource[] = templates
    .filter((template) => !template.facultyOwnerId)
    .map((template) => {
      const structure = toTemplateStructure(template.structure);

      return {
        actionLabel: "Use this template",
        boundCourseCode: template.boundCourseCode,
        description: template.description,
        facultyAccessible: template.is_faculty_accessible,
        href: `/faculty/tools/new/from/${encodeURIComponent(template.id)}`,
        id: template.id,
        name: template.name,
        origin: template.programCode ? "program-owned" : "institutional",
        originMeta: template.programCode ?? undefined,
        questionCount: structure.reduce((total, section) => total + section.questions.length, 0),
        sectionCount: structure.length,
        templateType: template.templateType,
      };
    });

  return (
    <TemplateStartChooser
      backHref="/faculty/tools"
      blankDescription="Build every section and question yourself, starting from one empty section. You choose the course when you are ready to add its CILOs."
      blankHref="/faculty/tools/new/blank"
      emptySourcesDescription="Your Program Head has not shared a template with faculty yet. You can still start blank."
      emptySourcesTitle="No shared templates available"
      eyebrow={`${program.code} — ${program.name}`}
      heading="New Evaluation Template"
      intro="Choose a starting point. Everything stays editable, so you can adjust it as you go."
      sources={sources}
      sourcesDescription="Course-bound templates your Program Head shared with faculty. Using one gives you your own copy; the shared template is never changed."
      sourcesHeading="Start from a shared template"
    />
  );
}
