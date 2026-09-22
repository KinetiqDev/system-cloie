import { notFound, redirect } from "next/navigation";

import { FacultyCourseGate } from "@/features/instruments/components/faculty-course-gate";
import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
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

  // A copy binds CILOs per Course. When the shared source carries no bound
  // Course, ask for it before opening the builder; an already-bound source
  // keeps its Course and skips the gate.
  const chosenContext = requested.course
    ? (seed.courseContexts.find((context) => context.courseId === requested.course) ?? null)
    : null;
  const boundCourseId = seed.initialData.bound_course_id ?? chosenContext?.courseId ?? null;

  if (!boundCourseId) {
    const courses = coursesResult.success ? coursesResult.data.courses : [];
    return (
      <FacultyCourseGate
        courses={courses}
        backHref="/faculty/tools"
        builderHrefFor={(courseId) =>
          `/faculty/tools/new/from/${encodeURIComponent(seed.template.id)}?course=${encodeURIComponent(courseId)}`
        }
        eyebrow={seed.programLabel}
        heading="Choose a Course"
        intro="Your copy of this template needs a course. Pick the course it evaluates to load its CILOs and bind them to your questions."
      />
    );
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
        initialData={{
          ...seed.initialData,
          bound_course_id: boundCourseId,
          bound_program_id: seed.initialData.bound_program_id ?? chosenContext?.programId ?? null,
          bound_major_id: seed.initialData.bound_major_id ?? chosenContext?.majorId ?? null,
        }}
        initialBindings={seed.initialBindings}
        initialGoBindings={seed.initialGoBindings}
        saveSuccessConfig={{
          toastMessage: "Your template copy was saved.",
        }}
      />
    </div>
  );
}
