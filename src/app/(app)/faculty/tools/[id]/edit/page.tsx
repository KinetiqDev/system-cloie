import { notFound, redirect } from "next/navigation";

import { FacultyCourseGate } from "@/features/instruments/components/faculty-course-gate";
import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { loadFacultyTemplateBuilderSeed } from "@/features/instruments/components/faculty-template-data";
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

  // A faculty template binds CILOs per Course, so an unbound one asks for the
  // Course before the builder opens instead of rendering an empty control. The
  // chosen Course arrives as `?course=` and seeds the draft; it is committed
  // when the author saves.
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
          `/faculty/tools/${encodeURIComponent(seed.template.id)}/edit?course=${encodeURIComponent(courseId)}`
        }
        eyebrow={seed.programLabel}
        heading="Choose a Course"
        intro="This template is not bound to a course yet. Pick the course it evaluates to load its CILOs and bind them to your questions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <FacultyTemplateBuilder
        courseContexts={seed.courseContexts}
        programLabel={seed.programLabel}
        initialData={{
          ...seed.initialData,
          id: seed.template.id,
          bound_course_id: boundCourseId,
          bound_program_id: seed.initialData.bound_program_id ?? chosenContext?.programId ?? null,
          bound_major_id: seed.initialData.bound_major_id ?? chosenContext?.majorId ?? null,
        }}
        initialBindings={seed.initialBindings}
        initialGoBindings={seed.initialGoBindings}
        saveSuccessConfig={{
          toastMessage: "Instrument template saved.",
        }}
      />
    </div>
  );
}
