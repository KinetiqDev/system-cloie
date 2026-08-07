import { FacultyToolsPage } from "@/features/instruments/components/faculty-tools-page";
import { listFacultyTemplates } from "@/features/instruments/services/list-faculty-templates";
import { listFacultyPublishedEvaluations } from "@/features/evaluations/services/list-faculty-published-evaluations";

export default async function FacultyToolsRoute() {
  const [templatesResult, evaluationsResult] = await Promise.all([
    listFacultyTemplates(),
    listFacultyPublishedEvaluations(),
  ]);

  if (!templatesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-text-primary text-2xl font-black">Evaluation Tools</h1>
        <p className="text-muted-foreground text-sm">{templatesResult.error}</p>
      </div>
    );
  }

  // Evaluations may fail independently (e.g., no evaluations yet), so we handle gracefully
  const evaluations = evaluationsResult.success ? evaluationsResult.data.evaluations : [];

  return (
    <FacultyToolsPage
      program={templatesResult.data.program}
      templates={templatesResult.data.templates}
      evaluations={evaluations}
    />
  );
}
