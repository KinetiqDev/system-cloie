import { FacultyCourseGate } from "./faculty-course-gate";
import { FacultyTemplateBuilder } from "./faculty-template-builder";
import type { FacultyTemplateBuilderSeed } from "./faculty-template-data";
import type { FacultyCourseWithCilosResult } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import type { FacultyCourseContext } from "@/features/evaluations/types";

type FacultyTemplateWorkspaceProps = {
  seed: FacultyTemplateBuilderSeed;
  coursesResult: FacultyCourseWithCilosResult;
  requestedCourseId?: string;
  mode: "edit" | "copy";
};

type CourseSelection = {
  context: FacultyCourseContext | null;
  courseId: string | null;
  changed: boolean;
};

function resolveEditCourse(
  seed: FacultyTemplateBuilderSeed,
  requestedCourseId?: string
): CourseSelection {
  const storedCourseId = seed.initialData.bound_course_id;
  const context =
    seed.courseContexts.find((course) => course.courseId === storedCourseId) ??
    seed.courseContexts.find((course) => course.courseId === requestedCourseId) ??
    null;
  return { context, courseId: storedCourseId ?? context?.courseId ?? null, changed: false };
}

function resolveCopyCourse(
  seed: FacultyTemplateBuilderSeed,
  requestedCourseId?: string
): CourseSelection {
  const context =
    seed.courseContexts.find((course) => course.courseId === requestedCourseId) ??
    seed.courseContexts.find((course) => course.courseId === seed.initialData.bound_course_id) ??
    null;
  return {
    context,
    courseId: context?.courseId ?? null,
    changed: context?.courseId !== seed.initialData.bound_course_id,
  };
}

export function FacultyTemplateWorkspace({
  seed,
  coursesResult,
  requestedCourseId,
  mode,
}: FacultyTemplateWorkspaceProps) {
  const { context, courseId, changed } =
    mode === "copy"
      ? resolveCopyCourse(seed, requestedCourseId)
      : resolveEditCourse(seed, requestedCourseId);

  if (!courseId) {
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
          bound_course_id: courseId,
          bound_program_id:
            context?.programId ?? (mode === "edit" ? seed.initialData.bound_program_id : null),
          bound_major_id:
            context?.majorId ?? (mode === "edit" ? seed.initialData.bound_major_id : null),
        }}
        initialBindings={changed ? [] : seed.initialBindings}
        initialGoBindings={changed ? [] : seed.initialGoBindings}
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
