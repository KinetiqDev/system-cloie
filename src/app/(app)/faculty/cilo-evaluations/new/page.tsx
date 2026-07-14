import { redirect } from "next/navigation";
import { YearLevel } from "@prisma/client";
import { ensureRoleAccess } from "@/features/auth/policies/ensure-role-access";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { PublishCourseBoundEvaluationFormV2 } from "@/features/evaluations/components/publish-course-bound-evaluation-form-v2";
import { getFacultyTemplatePublicationContext } from "@/features/instruments/services/manage-faculty-templates";
import {
  previewCourseBoundRespondentsAction,
  publishCourseBoundEvaluationAction,
} from "@/lib/actions/course-bound-evaluation-actions";
import { listCourseAssignmentsForFaculty } from "@/features/course-assignments/services/list-course-assignments-for-faculty";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { AssignmentOption } from "@/features/evaluations/components/assignment-picker";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

type SearchParams = {
  templateId?: string;
};

export default async function NewFacultyCiloEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const redirectPath = ensureRoleAccess({
    activeRole: session.activeRole,
    allowedRoles: [ROLES.FACULTY],
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const params = await searchParams;

  if (!params.templateId) {
    redirect("/faculty/tools");
  }

  const publicationContext = await getFacultyTemplatePublicationContext(params.templateId);

  if (!publicationContext.success) {
    redirect("/faculty/tools");
  }

  // Fetch faculty's course assignments
  const assignmentsResult = await listCourseAssignmentsForFaculty();
  
  if (!assignmentsResult.success) {
    redirect("/faculty/tools");
  }

  // Flatten grouped assignments into AssignmentOption array
  // Only include assignments for the template's course
  const templateCourseId = publicationContext.data.course.id;
  const assignmentOptions: AssignmentOption[] = [];
  
  for (const group of assignmentsResult.data) {
    if (group.courseId !== templateCourseId) continue;
    
    for (const assignment of group.assignments) {
      assignmentOptions.push({
        id: assignment.id,
        courseId: group.courseId,
        courseCode: group.courseCode,
        courseTitle: group.courseTitle,
        programId: "", // Will be fetched below
        programCode: assignment.programCode,
        yearLevel: assignment.yearLevel as YearLevel,
        section: assignment.section as import("@prisma/client").StudentSection | null,
        termInstanceId: "", // Will be fetched below
        termInstanceLabel: assignment.termLabel,
        isActive: true,
      });
    }
  }

  // Fetch full assignment details to get term_instance_id, program_id, and faculty info
  if (assignmentOptions.length > 0) {
    const assignmentIds = assignmentOptions.map(a => a.id);
    const fullAssignments = await prisma.courseAssignment.findMany({
      where: { id: { in: assignmentIds } },
      select: {
        id: true,
        term_instance_id: true,
        program_id: true,
        faculty_id: true,
        faculty: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
    
    const assignmentMap = new Map(fullAssignments.map(a => [a.id, a]));
    
    for (const option of assignmentOptions) {
      const full = assignmentMap.get(option.id);
      if (full) {
        option.termInstanceId = full.term_instance_id;
        option.programId = full.program_id;
        option.facultyId = full.faculty_id;
        option.facultyName = full.faculty
          ? `${full.faculty.first_name} ${full.faculty.last_name}`.trim()
          : undefined;
      }
    }
  }

  // Fetch term instances for the picker
  const termInstancesData = await prisma.academicTermInstance.findMany({
    include: {
      school_year: true,
    },
    orderBy: [
      { school_year: { start_date: "desc" } },
      { semester: "asc" },
    ],
  });

  const termInstances: TermInstanceItem[] = termInstancesData.map(ti => ({
    id: ti.id,
    schoolYearId: ti.school_year_id,
    schoolYearCode: ti.school_year.code,
    semester: ti.semester,
    term: ti.term ?? null,
    startDate: ti.start_date ?? null,
    endDate: ti.end_date ?? null,
    status: ti.status,
    createdAt: ti.created_at,
    updatedAt: ti.updated_at,
  }));

  // Add term instance labels to assignment options
  const termMap = new Map(termInstances.map(t => [t.id, t]));
  for (const option of assignmentOptions) {
    const term = termMap.get(option.termInstanceId);
    if (term) {
      option.termInstanceLabel = formatTermInstanceLabel(
        term.schoolYearCode,
        term.semester,
        term.term ?? null
      );
    }
  }

  // Simplified publication context for V2 form
  const formPublicationContext = {
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

  return (
    <PublishCourseBoundEvaluationFormV2
      assignments={assignmentOptions}
      previewAction={previewCourseBoundRespondentsAction}
      publicationContext={formPublicationContext}
      publishAction={publishCourseBoundEvaluationAction}
    />
  );
}
