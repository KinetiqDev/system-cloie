import { FacultyCourseGate } from "@/features/instruments/components/faculty-course-gate";
import { FacultyTemplateBuilder } from "@/features/instruments/components/faculty-template-builder";
import { listFacultyCourseContextsAction } from "@/lib/actions/course-bound-evaluation-actions";
import { listFacultyCoursesWithCilos } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import { listFacultyTemplates } from "@/features/instruments/services/list-faculty-templates";
import { buildPageTitle } from "@/lib/page-title";
import { z } from "zod";

export const metadata = { title: buildPageTitle("New Template", "Faculty") };

const courseIdSchema = z.string().uuid();

export default async function FacultyNewBlankTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const [templatesResult, courseContextsResult, coursesResult, requested] = await Promise.all([
    listFacultyTemplates(),
    listFacultyCourseContextsAction(),
    listFacultyCoursesWithCilos(),
    searchParams,
  ]);

  if (!templatesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-text-primary text-2xl font-black">New Template</h1>
        <p className="text-muted-foreground text-sm">{templatesResult.error}</p>
      </div>
    );
  }

  const { program } = templatesResult.data;
  const programLabel = `${program.code} — ${program.name}`;
  const courseContexts = courseContextsResult.success ? courseContextsResult.data : [];

  if (!coursesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-text-primary text-2xl font-black">New Template</h1>
        <p className="text-muted-foreground text-sm">{coursesResult.error}</p>
      </div>
    );
  }

  const requestedCourseId =
    requested.course && courseIdSchema.safeParse(requested.course).success
      ? requested.course
      : null;
  const selectedContext = requestedCourseId
    ? (courseContexts.find((context) => context.courseId === requestedCourseId) ?? null)
    : null;

  if (!selectedContext) {
    return (
      <FacultyCourseGate
        courses={coursesResult.data.courses}
        backHref="/faculty/tools"
        builderHrefFor={(courseId) =>
          `/faculty/tools/new/blank?course=${encodeURIComponent(courseId)}`
        }
        eyebrow={programLabel}
        heading="Choose a Course"
        intro="Pick the course this instrument evaluates. Its saved CILOs load into the builder for binding, and every CILO must be covered before the evaluation can publish."
      />
    );
  }

  return (
    <div className="space-y-6">
      <FacultyTemplateBuilder
        courseContexts={courseContexts}
        programLabel={programLabel}
        initialData={{
          name: "",
          description: "",
          template_type: "COURSE_BOUND",
          is_active: true,
          is_faculty_accessible: false,
          bound_course_id: selectedContext.courseId,
          bound_program_id: selectedContext.programId,
          bound_major_id: selectedContext.majorId,
          structure: [],
        }}
        saveSuccessConfig={{
          toastMessage: "Instrument template saved.",
        }}
      />
    </div>
  );
}
