import { notFound, redirect } from "next/navigation";

import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
import { FacultyTemplateWorkspace } from "@/features/instruments/components/faculty-template-workspace";
import { listFacultyCoursesWithCilos } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New Template", "Faculty") };

interface FacultyNewFromTemplatePageProps {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<{ course?: string }>;
}

export default async function FacultyNewFromTemplatePage({
  params,
  searchParams,
}: FacultyNewFromTemplatePageProps) {
  const [{ templateId }, requested] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ course?: string }>({}),
  ]);
  const [seed, coursesResult] = await Promise.all([
    loadFacultyTemplateBuilderSeed(templateId),
    listFacultyCoursesWithCilos(),
  ]);

  if (!seed) notFound();

  // A template this account already owns is edited, never copied again.
  if (seed.ownedByViewer) {
    redirect(`/faculty/tools/${encodeURIComponent(seed.template.id)}/edit`);
  }

  return (
    <FacultyTemplateWorkspace
      seed={seed}
      coursesResult={coursesResult}
      requestedCourseId={requested.course}
      mode="copy"
    />
  );
}
