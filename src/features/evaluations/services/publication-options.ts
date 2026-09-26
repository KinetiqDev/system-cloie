import { CourseScope, type YearLevel } from "@prisma/client";
import type { AssignmentOption } from "@/features/evaluations/components/assignment-picker";
import type { PublicationContext } from "@/features/evaluations/components/publish-course-bound-evaluation-form-v2";
import type { FacultyTemplatePublicationContext } from "@/features/instruments/services/manage-faculty-templates";
import { prisma } from "@/lib/db/prisma";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { getOnBehalfTemplatePublicationContext } from "./publish-course-bound-evaluation";

/**
 * Publication choices and the form context they carry.
 *
 * Invariants:
 * - `readProgramHeadPublicationOptions` returns only assignments that are
 *   active, in the ACTIVE academic period, bound to a PROGRAM_SPECIFIC Course of
 *   the given Program, and unpublished, and only where the owning Faculty member
 *   has an active COURSE_BOUND template whose resolved context names that same
 *   Course and Program. A stale or template-less assignment is omitted, never
 *   fatal, so one bad row cannot hide the rest.
 * - Its argument is a Program the caller already authorized. This module does
 *   not authorize and cannot widen what a caller may write: publication
 *   re-resolves scope inside its own transaction.
 * - `toPublicationContext` is the only projection into the form's serializable
 *   shape, shared by both publication routes: the form reads a subset, while the
 *   resolved context also carries Course scope, major, and Program labels.
 *
 * Server-owned by import graph, not by a marker: only the Program Head and
 * Faculty publication Server Components import it, and the repository has no
 * `server-only` convention for feature Prisma services.
 *
 * The Faculty route does not call the read: it starts from one session-authorized
 * template and needs a term picker, so sharing the query would import on-behalf
 * authorization into a self-owned flow.
 */
export function toPublicationContext(
  context: FacultyTemplatePublicationContext
): PublicationContext {
  return {
    bindings: context.bindings,
    cilos: context.cilos,
    course: { code: context.course.code, id: context.course.id, title: context.course.title },
    template: {
      id: context.template.id,
      name: context.template.name,
      structure: context.template.structure,
    },
  };
}

type ProgramHeadPublicationOptions = {
  assignments: AssignmentOption[];
  publicationContextsByAssignmentId: Record<string, PublicationContext>;
};

/**
 * Read the publishable assignments of one already-authorized Program, each with
 * the publication context its Faculty owner's template resolves to. Assignments
 * with no template, with a template whose context fails to resolve, or whose
 * context names a different Course or Program are omitted rather than failing
 * the read: one stale assignment must not hide the rest of the Program.
 */
export async function readProgramHeadPublicationOptions(
  selectedProgramId: string
): Promise<ProgramHeadPublicationOptions> {
  const assignments = await prisma.courseAssignment.findMany({
    where: {
      is_active: true,
      program_id: selectedProgramId,
      course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: { none: { published_at: { not: null } } },
    },
    include: {
      course: { select: { code: true, id: true, title: true } },
      faculty: { select: { id: true, name: true } },
      program: { select: { code: true, id: true } },
      term_instance: { include: { school_year: true } },
    },
    orderBy: [{ course: { code: "asc" } }, { year_level: "asc" }, { section: "asc" }],
  });

  const resolved = await Promise.all(
    assignments.map(async (assignment) => {
      const template = await prisma.instrumentTemplate.findFirst({
        where: {
          bound_course_id: assignment.course_id,
          faculty_owner_id: assignment.faculty_id,
          is_active: true,
          template_type: "COURSE_BOUND",
        },
        orderBy: { created_at: "desc" },
        select: { id: true },
      });

      if (!template) return null;

      const publicationContext = await getOnBehalfTemplatePublicationContext(
        template.id,
        assignment.faculty_id
      );

      if (!publicationContext.success) return null;

      // The template resolves its own Course and Program; a context that names
      // anything else is stale, so the assignment is not publishable here.
      if (
        publicationContext.data.course.id !== assignment.course_id ||
        publicationContext.data.programId !== selectedProgramId
      ) {
        return null;
      }

      return { assignment, publicationContext };
    })
  );

  const options: ProgramHeadPublicationOptions = {
    assignments: [],
    publicationContextsByAssignmentId: {},
  };

  for (const entry of resolved) {
    if (!entry) continue;

    const { assignment, publicationContext } = entry;

    options.assignments.push({
      courseCode: assignment.course.code,
      courseId: assignment.course.id,
      courseTitle: assignment.course.title,
      facultyId: assignment.faculty.id,
      facultyName: assignment.faculty.name,
      id: assignment.id,
      isActive: assignment.is_active,
      programCode: assignment.program.code,
      programId: assignment.program.id,
      section: assignment.section,
      termInstanceId: assignment.term_instance_id,
      termInstanceLabel: formatTermInstanceLabel(
        assignment.term_instance.school_year.code,
        assignment.term_instance.semester,
        assignment.term_instance.term
      ),
      yearLevel: assignment.year_level as YearLevel,
    });

    options.publicationContextsByAssignmentId[assignment.id] = toPublicationContext(
      publicationContext.data
    );
  }

  return options;
}
