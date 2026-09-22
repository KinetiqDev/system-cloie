import { notFound, redirect } from "next/navigation";

import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
import { buildPageTitle } from "@/lib/page-title";

interface FacultyEditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: buildPageTitle("Edit Tool", "Faculty") };

export default async function FacultyEditTemplatePage({ params }: FacultyEditTemplatePageProps) {
  const { id } = await params;
  const seed = await loadFacultyTemplateBuilderSeed(id);

  if (!seed) notFound();

  // A shared template is never edited in place, and this URL predates the
  // create-from-template route: send it to the flow that says so.
  if (!seed.ownedByViewer) {
    redirect(`/faculty/tools/new/from/${encodeURIComponent(seed.template.id)}`);
  }

  return (
    <div className="space-y-6">
      <FacultyTemplateBuilder
        courseContexts={seed.courseContexts}
        programLabel={seed.programLabel}
        initialData={{ ...seed.initialData, id: seed.template.id }}
        initialBindings={seed.initialBindings}
        initialGoBindings={seed.initialGoBindings}
        saveSuccessConfig={{
          toastMessage: "Instrument template saved.",
        }}
      />
    </div>
  );
}
