import { notFound } from "next/navigation";
import { CourseScope, YearLevel } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  PublishCourseBoundEvaluationFormV2,
  type PublicationContext,
} from "@/features/evaluations/components/publish-course-bound-evaluation-form-v2";
import { getOnBehalfTemplatePublicationContext } from "@/features/evaluations/services/publish-course-bound-evaluation";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import {
  previewCourseBoundRespondentsAction,
  publishCourseBoundEvaluationAction,
} from "@/lib/actions/course-bound-evaluation-actions";
import { prisma } from "@/lib/db/prisma";
import { buildProgramHeadToolsPath } from "@/lib/constants/program-head-routes";
import type { AssignmentOption } from "@/features/evaluations/components/assignment-picker";

export default async function NewProgramHeadCiloEvaluationPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    notFound();
  }

  const assignments = await prisma.courseAssignment.findMany({
    where: {
      is_active: true,
      program_id: contextResult.data.selectedProgram.id,
      course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
      term_instance: { status: "ACTIVE" },
      course_bound_evaluations: { none: { published_at: { not: null } } },
    },
    include: {
      course: { select: { code: true, id: true, title: true } },
      faculty: { select: { first_name: true, id: true, last_name: true } },
      program: { select: { code: true, id: true } },
      term_instance: { include: { school_year: true } },
    },
    orderBy: [{ course: { code: "asc" } }, { year_level: "asc" }, { section: "asc" }],
  });

  const eligibleAssignments = await Promise.all(
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

      if (
        publicationContext.data.course.id !== assignment.course_id ||
        publicationContext.data.programId !== contextResult.data.selectedProgram.id
      ) {
        return null;
      }

      return { assignment, publicationContext };
    })
  );

  const assignmentOptions: AssignmentOption[] = [];
  const publicationContextsByAssignmentId: Record<string, PublicationContext> = {};

  for (const eligible of eligibleAssignments) {
    if (!eligible) continue;

    const { assignment, publicationContext } = eligible;

    const termInstanceLabel = formatTermInstanceLabel(
      assignment.term_instance.school_year.code,
      assignment.term_instance.semester,
      assignment.term_instance.term
    );

    assignmentOptions.push({
      courseCode: assignment.course.code,
      courseId: assignment.course.id,
      courseTitle: assignment.course.title,
      facultyId: assignment.faculty.id,
      facultyName: `${assignment.faculty.first_name} ${assignment.faculty.last_name}`.trim(),
      id: assignment.id,
      isActive: assignment.is_active,
      programCode: assignment.program.code,
      programId: assignment.program.id,
      section: assignment.section,
      termInstanceId: assignment.term_instance_id,
      termInstanceLabel,
      yearLevel: assignment.year_level as YearLevel,
    });

    publicationContextsByAssignmentId[assignment.id] = {
      bindings: publicationContext.data.bindings,
      cilos: publicationContext.data.cilos,
      course: {
        code: publicationContext.data.course.code,
        id: publicationContext.data.course.id,
        title: publicationContext.data.course.title,
      },
      template: {
        id: publicationContext.data.template.id,
        name: publicationContext.data.template.name,
        structure: publicationContext.data.template.structure,
      },
    };
  }

  const firstAssignment = assignmentOptions[0];
  const firstContext = firstAssignment
    ? publicationContextsByAssignmentId[firstAssignment.id]
    : undefined;

  if (!firstContext) {
    notFound();
  }

  return (
    <PublishCourseBoundEvaluationFormV2
      assignments={assignmentOptions}
      isOnBehalf
      previewAction={previewCourseBoundRespondentsAction}
      publicationContext={firstContext}
      publicationContextsByAssignmentId={publicationContextsByAssignmentId}
      programId={programId}
      publishAction={publishCourseBoundEvaluationAction}
      successRedirectPath={buildProgramHeadToolsPath(programId)}
    />
  );
}
