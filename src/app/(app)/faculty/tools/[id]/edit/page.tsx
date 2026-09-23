import { notFound, redirect } from "next/navigation";

import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
import { FacultyTemplateWorkspace } from "@/features/instruments/components/faculty-template-workspace";
import { listFacultyCoursesWithCilos } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import { buildPageTitle } from "@/lib/page-title";

interface FacultyEditTemplatePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ course?: string }>;
}

export const metadata = { title: buildPageTitle("Edit Tool", "Faculty") };

export default async function FacultyEditTemplatePage({
  params,
  searchParams,
}: FacultyEditTemplatePageProps) {
  const [{ id }, requested] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ course?: string }>({}),
  ]);
  const [seed, coursesResult] = await Promise.all([
    loadFacultyTemplateBuilderSeed(id),
    listFacultyCoursesWithCilos(),
  ]);

  if (!seed) notFound();

  // A shared template is never edited in place, and this URL predates the
  // create-from-template route: send it to the flow that says so.
  if (!seed.ownedByViewer) {
    redirect(`/faculty/tools/new/from/${encodeURIComponent(seed.template.id)}`);
  }

  return (
    <FacultyTemplateWorkspace
      seed={seed}
      coursesResult={coursesResult}
      requestedCourseId={requested.course}
      mode="edit"
    />
  );
}
