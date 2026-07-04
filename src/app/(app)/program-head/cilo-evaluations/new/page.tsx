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
import { listCourseAssignments } from "@/features/course-assignments/services/list-course-assignments";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { AssignmentOption } from "@/features/evaluations/components/assignment-picker";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

type SearchParams = {
  templateId?: string;
};

export default async function NewProgramHeadCiloEvaluationPage({
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
    allowedRoles: [ROLES.PROGRAM_HEAD],
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  const params = await searchParams;

  if (!params.templateId) {
    redirect("/program-head/tools");
  }

  const publicationContext = await getFacultyTemplatePublicationContext(params.templateId);

  if (!publicationContext.success) {
    redirect("/program-head/tools");
  }

  // Fetch active assignments scoped to the Program Head for the template's course
  const templateCourseId = publicationContext.data.course.id;
  const assignmentsResult = await listCourseAssignments(
    {
      courseId: templateCourseId,
      isActive: true,
    },
    { page: 0, pageSize: 100 }
  );

  if (!assignmentsResult.success) {
    redirect("/program-head/tools");
  }

  // Build AssignmentOption array from PH results
  const assignmentOptions: AssignmentOption[] = assignmentsResult.data.items
    .filter((item) => item.courseId === templateCourseId)
    .map((item) => ({
      id: item.id,
      courseId: item.courseId,
      courseCode: item.courseCode!,
      courseTitle: item.courseTitle!,
      programId: item.programId!,
      programCode: item.programCode!,
      yearLevel: item.yearLevel as YearLevel,
      section: item.section as import("@prisma/client").StudentSection | null,
      termInstanceId: item.termInstanceId,
      termInstanceLabel: item.termLabel,
      isActive: true,
      facultyId: item.facultyId,
      facultyName: item.facultyName,
    }));

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

  const termInstances: TermInstanceItem[] = termInstancesData.map((ti) => ({
    id: ti.id,
    schoolYearId: ti.school_year_id,
    schoolYearCode: ti.school_year.code,
    semester: ti.semester,
    term: ti.term ?? null,
    startDate: ti.start_date ?? null,
    endDate: ti.end_date ?? null,
    isActive: ti.is_active,
    createdAt: ti.created_at,
    updatedAt: ti.updated_at,
  }));

  // Add term instance labels to assignment options
  const termMap = new Map(termInstances.map((t) => [t.id, t]));
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { first_name: true, last_name: true },
  });

  const deployerName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : undefined;

  return (
    <PublishCourseBoundEvaluationFormV2
      assignments={assignmentOptions}
      previewAction={previewCourseBoundRespondentsAction}
      publicationContext={formPublicationContext}
      publishAction={publishCourseBoundEvaluationAction}
      deployerUserId={session.userId}
      deployerName={deployerName}
      successRedirectPath="/program-head/tools"
    />
  );
}
