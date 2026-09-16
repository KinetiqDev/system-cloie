import { notFound, redirect } from "next/navigation";

import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Template", "Faculty") };

interface FacultyNewFromTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function FacultyNewFromTemplatePage({
  params,
}: FacultyNewFromTemplatePageProps) {
  const { templateId } = await params;
  const seed = await loadFacultyTemplateBuilderSeed(templateId);

  if (!seed) notFound();

  // A template this account already owns is edited, never copied again.
  if (seed.ownedByViewer) {
    redirect(`/faculty/tools/${encodeURIComponent(seed.template.id)}/edit`);
  }

  return (
    <div className="space-y-6">
      <FacultyTemplateBuilder
        courseContexts={seed.courseContexts}
        programLabel={seed.programLabel}
        startingFrom={{
          id: seed.template.id,
          name: seed.template.name,
          origin: "shared-template",
        }}
        initialData={seed.initialData}
        initialBindings={seed.initialBindings}
        saveSuccessConfig={{
          toastMessage: "Your template copy was saved.",
        }}
      />
    </div>
  );
}
