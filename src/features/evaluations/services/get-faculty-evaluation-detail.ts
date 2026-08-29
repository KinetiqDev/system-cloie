import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { canViewCourseRoster } from "@/features/course-assignments/policies";
import { CourseScope } from "@prisma/client";
import type { FacultyEvaluationDetail, GetFacultyEvaluationDetailResult } from "../types";
import { parsePublishedInstrument } from "@/features/instruments/services/parse-published-instrument";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";

export async function getFacultyEvaluationDetail(
  evaluationId: string
): Promise<GetFacultyEvaluationDetailResult> {
  const session = await resolveAuthSession();

  if (!session) {
    return { success: false, error: "Authentication required." };
  }

  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      id: evaluationId,
    },
    include: {
      course_assignment: {
        select: {
          faculty_id: true,
          is_active: true,
          program_id: true,
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              course_scope: true,
              major_id: true,
              major: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          program: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      targets: {
        include: {
          program: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      },
      cilo_question_bindings: {
        select: {
          cilo_id: true,
          cilo_description_snapshot: true,
          section_key: true,
          item_key: true,
          question_prompt_snapshot: true,
        },
      },
      instrument: {
        select: {
          structure_snapshot: true,
          version_number: true,
          template: { select: { name: true } },
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
      term_instance: {
        include: {
          school_year: true,
        },
      },
      assignments: {
        orderBy: [{ respondent: { name: "asc" } }, { assigned_at: "asc" }],
        select: {
          assigned_at: true,
          id: true,
          respondent_id: true,
          respondent: { select: { email: true, name: true } },
          response: { select: { status: true, submitted_at: true } },
        },
      },
      exclusions: {
        select: {
          category: true,
          course_assignment_membership_id: true,
          reversal_category: true,
          reversed_at: true,
          membership: {
            select: {
              is_active: true,
              student: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!evaluation) {
    return {
      success: false,
      error: "Evaluation not found or you do not have access.",
    };
  }

  const programHeadProgramIds =
    session.activeRole === ROLES.PROGRAM_HEAD
      ? (
          await prisma.programHeadAssignment.findMany({
            where: { program_head_id: session.userId, is_active: true },
            select: { program_id: true },
          })
        ).map((row) => row.program_id)
      : [];
  // Read authorization: published evaluations are historical records and must
  // stay readable even after the course assignment is deactivated.
  const authorization = canViewCourseRoster(
    session,
    {
      facultyId: evaluation.course_assignment.faculty_id,
      programId: evaluation.course_assignment.program_id,
      courseScope: evaluation.course_assignment.course.course_scope as CourseScope,
      isActive: evaluation.course_assignment.is_active,
    },
    programHeadProgramIds
  );
  if (!authorization.allowed) {
    return { success: false, error: "Evaluation not found or you do not have access." };
  }

  const courseInfoSnapshot = evaluation.course_info_snapshot as {
    courseCode?: string;
    courseTitle?: string;
    courseScope?: string;
    majorName?: string | null;
    programCode?: string;
    programName?: string;
  } | null;

  const cilosSnapshot = evaluation.cilos_snapshot as Array<{
    description: string;
    id: string;
    label: string;
  }> | null;

  const ti = evaluation.term_instance;
  const termInstanceLabel = formatTermInstanceLabel(
    ti.school_year.code,
    ti.semester,
    ti.term
  );

  const ca = evaluation.course_assignment;
  const parsedSections = parsePublishedInstrument(evaluation.instrument.structure_snapshot);
  const respondents = evaluation.assignments.map((assignment) => ({
    assignedAt: assignment.assigned_at,
    assignmentId: assignment.id,
    email: assignment.respondent.email,
    name: assignment.respondent.name,
    respondentId: assignment.respondent_id,
    status: assignment.response?.status ?? ("NOT_STARTED" as const),
    submittedAt: assignment.response?.submitted_at ?? null,
  }));
  const responseCount = respondents.filter(
    (respondent) => respondent.status === "SUBMITTED"
  ).length;
  const inProgressCount = respondents.filter(
    (respondent) => respondent.status === "IN_PROGRESS"
  ).length;

  const detail: FacultyEvaluationDetail = {
    termInstanceLabel,
    activationAt: evaluation.activation_at,
    cilos:
      cilosSnapshot?.map((cilo) => ({
        description: cilo.description,
        id: cilo.id,
        label: cilo.label,
      })) ?? [],
    courseInfo: {
      courseCode: courseInfoSnapshot?.courseCode ?? ca.course.code,
      courseScope:
        courseInfoSnapshot?.courseScope ?? ca.course.course_scope.replace(/_/g, " ").toLowerCase(),
      courseTitle: courseInfoSnapshot?.courseTitle ?? ca.course.title,
      majorName: courseInfoSnapshot?.majorName ?? ca.course.major?.name ?? null,
      programCode: courseInfoSnapshot?.programCode ?? ca.program.code,
      programName: courseInfoSnapshot?.programName ?? ca.program.name,
    },
    deadlineAt: evaluation.deadline_at,
    deploymentName: evaluation.deployment_name,
    evaluationId: evaluation.id,
    publishedAt: evaluation.published_at,
    responseCount,
    status: evaluation.status,
    targets: evaluation.targets.map((target) => ({
      programCode: target.program.code,
      programId: target.program.id,
      yearLevel: target.year_level,
    })),
    templateBindings: evaluation.cilo_question_bindings.map((binding) => ({
      ciloDescriptionSnapshot: binding.cilo_description_snapshot,
      ciloId: binding.cilo_id,
      itemKey: binding.item_key,
      questionPromptSnapshot: binding.question_prompt_snapshot,
      sectionKey: binding.section_key,
    })),
    totalAssignments: evaluation._count.assignments,
    inProgressCount,
    notStartedCount: respondents.length - responseCount - inProgressCount,
    respondents,
    instrument: {
      name: evaluation.instrument.template.name,
      versionNumber: evaluation.instrument.version_number,
      sections: parsedSections.map((section) => ({
        description: section.description,
        sectionKey: section.key,
        title: section.title,
        questions: section.questions.map((question) => ({
          itemKey: question.key,
          likertDescriptors: question.likertDescriptors,
          prompt: question.prompt,
          required: question.required,
          suggestedResponses: question.suggestedResponses,
          type: question.type,
        })),
      })),
    },
    exclusions: evaluation.exclusions.map((exclusion) => ({
      category: exclusion.category,
      membershipId: exclusion.course_assignment_membership_id,
      membershipActive: exclusion.membership.is_active,
      reversalCategory: exclusion.reversal_category,
      reversedAt: exclusion.reversed_at,
      studentName: exclusion.membership.student.name,
    })),
    lateInclusionOpen:
      (evaluation.status === "ACTIVE" || evaluation.status === "SCHEDULED") &&
      (!evaluation.deadline_at || evaluation.deadline_at.getTime() >= Date.now()),
  };

  return {
    success: true,
    data: detail,
  };
}
