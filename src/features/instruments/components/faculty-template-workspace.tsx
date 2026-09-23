import { FacultyCourseGate } from "./faculty-course-gate";
import { FacultyTemplateBuilder } from "./faculty-template-builder";
import type { FacultyTemplateBuilderSeed } from "./faculty-template-data";
import type { FacultyCourseWithCilosResult } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

type FacultyTemplateWorkspaceProps = {
  seed: FacultyTemplateBuilderSeed;
  coursesResult: FacultyCourseWithCilosResult;
  requestedCourseId?: string;
  mode: "edit" | "copy";
};

export function FacultyTemplateWorkspace({
  seed,
  coursesResult,
  requestedCourseId,
  mode,
}: FacultyTemplateWorkspaceProps) {
  const chosenContext = requestedCourseId
    ? (seed.courseContexts.find((context) => context.courseId === requestedCourseId) ?? null)
    : null;
  const boundCourseId = seed.initialData.bound_course_id ?? chosenContext?.courseId ?? null;

  if (!boundCourseId) {
    return (
      <FacultyCourseGate
        courses={coursesResult.success ? coursesResult.data.courses : []}
        backHref="/faculty/tools"
        builderHrefFor={(courseId) =>
          mode === "edit"
            ? `/faculty/tools/${encodeURIComponent(seed.template.id)}/edit?course=${encodeURIComponent(courseId)}`
            : `/faculty/tools/new/from/${encodeURIComponent(seed.template.id)}?course=${encodeURIComponent(courseId)}`
        }
        eyebrow={seed.programLabel}
        heading="Choose a Course"
        intro={
          mode === "edit"
            ? "This template is not bound to a course yet. Pick the course it evaluates to load its CILOs and bind them to your questions."
            : "Your copy of this template needs a course. Pick the course it evaluates to load its CILOs and bind them to your questions."
        }
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
          ...(mode === "edit" ? { id: seed.template.id } : {}),
          bound_course_id: boundCourseId,
          bound_program_id: seed.initialData.bound_program_id ?? chosenContext?.programId ?? null,
          bound_major_id: seed.initialData.bound_major_id ?? chosenContext?.majorId ?? null,
        }}
        initialBindings={seed.initialBindings}
        initialGoBindings={seed.initialGoBindings}
        {...(mode === "copy"
          ? {
              startingFrom: {
                id: seed.template.id,
                name: seed.template.name,
                origin: "shared-template" as const,
              },
            }
          : {})}
        saveSuccessConfig={{
          toastMessage:
            mode === "edit" ? "Instrument template saved." : "Your template copy was saved.",
        }}
      />
    </div>
  );
}
