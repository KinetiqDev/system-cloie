import { randomUUID } from "node:crypto";
import { Prisma, type SystemRole } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { prisma } from "@/lib/db/prisma";

import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
  CourseRosterMember,
  RosterServiceResult,
  RosterState,
} from "../types";

export const COURSE_ROSTER_DETAIL_PAGE_SIZE = 25;

type AssignmentReadRow = Prisma.CourseAssignmentGetPayload<{
  select: {
    id: true;
    faculty_id: true;
    course_id: true;
    program_id: true;
    year_level: true;
    section: true;
    is_active: true;
    course: { select: { code: true; title: true; course_scope: true } };
    program: { select: { code: true; name: true } };
    faculty: { select: { name: true; email: true } };
    term_instance: {
      select: {
        id: true;
        status: true;
        semester: true;
        term: true;
        school_year: { select: { code: true } };
      };
    };
    course_bound_evaluations: { select: { published_at: true } };
  };
}>;

type MembershipStudentRead = {
  name: string;
  email: string;
  is_active: boolean;
  roles: Array<{ role: SystemRole }>;
  student_profile: {
    program_id: string;
    major: { name: string } | null;
    program: { code: string; name: string };
    student_id_number: string | null;
  } | null;
  enrollments: Array<{
    term_instance_id: string;
    program_id: string;
    program: { code: string; name: string };
    major: { name: string } | null;
  }>;
};

type ReadMembershipRow = {
  course_assignment_id: string;
  id: string;
  student_user_id: string;
  is_active: boolean;
  created_at: Date;
  removed_at: Date | null;
  student: MembershipStudentRead;
  remover: { name: string } | null;
};

function projectMembershipEligibility(
  assignment: Pick<AssignmentReadRow, "course" | "program_id" | "term_instance">,
  student: {
    is_active: boolean;
    roles: Array<{ role: SystemRole }>;
    student_profile: { program_id: string; student_id_number: string | null } | null;
    enrollments: Array<{ term_instance_id?: string; program_id: string }>;
  }
): ReturnType<typeof projectRosterEligibility> {
  const studentForEligibility: RosterEligibilityStudent = {
    is_active: student.is_active,
    roles: student.roles,
    student_profile: student.student_profile
      ? {
          program_id: student.student_profile.program_id,
          student_id_number: student.student_profile.student_id_number,
        }
      : null,
    enrollments: student.enrollments
      .filter((enrollment) => enrollment.term_instance_id === assignment.term_instance.id)
      .map((enrollment) => ({ program_id: enrollment.program_id })),
  };
  return projectRosterEligibility(
    { courseScope: assignment.course.course_scope, programId: assignment.program_id },
    studentForEligibility
  );
}

function rosterState(
  assignment: Pick<AssignmentReadRow, "is_active" | "term_instance" | "course_bound_evaluations">
): RosterState {
  if (!assignment.is_active) return "INACTIVE_ASSIGNMENT";
  if (assignment.term_instance.status !== "ACTIVE") return "INACTIVE_ACADEMIC_PERIOD";
  if (assignment.course_bound_evaluations.some((evaluation) => evaluation.published_at !== null)) {
    return "PUBLISHED_EVALUATION_LOCK";
  }
  return "ACTIVE";
}

function unexpectedRosterReadFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string | undefined,
  error: unknown
) {
  const referenceId = randomUUID();
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          code:
            typeof error === "object" && error !== null && "code" in error
              ? String(error.code)
              : undefined,
        }
      : { type: typeof error };
  console.error("Course roster read failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId: assignmentId ?? null,
    referenceId,
    error: errorDetails,
  });
  return {
    success: false as const,
    error: "The roster request could not be completed.",
    referenceId,
  };
}

function assignmentSummary(
  assignment: AssignmentReadRow,
  counts: { activeRosterCount: number; evaluationEligibleCount: number }
): CourseRosterAssignmentSummary {
  const hasPublishedEvaluation = assignment.course_bound_evaluations.some(
    (evaluation) => evaluation.published_at !== null
  );
  const state = rosterState(assignment);

  return {
    assignmentId: assignment.id,
    courseCode: assignment.course.code,
    courseTitle: assignment.course.title,
    courseScope: assignment.course.course_scope,
    programCode: assignment.program.code,
    programName: assignment.program.name,
    facultyName: assignment.faculty.name,
    facultyEmail: assignment.faculty.email,
    yearLevel: assignment.year_level,
    section: assignment.section,
    termLabel: formatTermInstanceLabel(
      assignment.term_instance.school_year.code,
      assignment.term_instance.semester,
      assignment.term_instance.term
    ),
    periodStatus: assignment.term_instance.status,
    isActive: assignment.is_active,
    hasPublishedEvaluation,
    rosterState: state,
    ...counts,
  };
}

async function getActivePeriodId() {
  const activePeriod = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
    orderBy: { start_date: "desc" },
  });
  return activePeriod?.id ?? null;
}

function assignmentWhere(
  session: NonNullable<Awaited<ReturnType<typeof resolveAuthSession>>>,
  options: { includeHistory: boolean; activePeriodId: string | null; search: string },
  programHeadProgramIds: string[]
): Prisma.CourseAssignmentWhereInput {
  const base: Prisma.CourseAssignmentWhereInput = {
    ...(session.activeRole === ROLES.FACULTY && { faculty_id: session.userId }),
    ...(session.activeRole === ROLES.PROGRAM_HEAD && {
      program_id: { in: programHeadProgramIds },
    }),
    ...(!options.includeHistory && {
      is_active: true,
      ...(options.activePeriodId
        ? { term_instance_id: options.activePeriodId }
        : { id: { in: [] } }),
    }),
  };
  const terms = options.search.trim().split(/\s+/).filter(Boolean);

  return {
    AND: [
      base,
      ...terms.map((term) => ({
        OR: [
          { course: { code: { contains: term, mode: "insensitive" as const } } },
          { course: { title: { contains: term, mode: "insensitive" as const } } },
          { program: { code: { contains: term, mode: "insensitive" as const } } },
          { program: { name: { contains: term, mode: "insensitive" as const } } },
          { faculty: { name: { contains: term, mode: "insensitive" as const } } },
        ],
      })),
    ],
  };
}

async function loadAssignmentRows(
  where: Prisma.CourseAssignmentWhereInput,
  page: number,
  pageSize: number
) {
  return Promise.all([
    prisma.courseAssignment.findMany({
      where,
      select: {
        id: true,
        faculty_id: true,
        course_id: true,
        program_id: true,
        year_level: true,
        section: true,
        is_active: true,
        course: { select: { code: true, title: true, course_scope: true } },
        program: { select: { code: true, name: true } },
        faculty: { select: { name: true, email: true } },
        term_instance: {
          select: {
            id: true,
            status: true,
            semester: true,
            term: true,
            school_year: { select: { code: true } },
          },
        },
        course_bound_evaluations: { select: { published_at: true } },
      },
      orderBy: [
        { course: { code: "asc" } },
        { program: { code: "asc" } },
        { year_level: "asc" },
        { section: "asc" },
        { id: "asc" },
      ],
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.courseAssignment.count({ where }),
  ]);
}

async function loadMembershipRows(assignmentIds: string[], termInstanceIds: string[]) {
  if (assignmentIds.length === 0) return [];
  return prisma.courseAssignmentMembership.findMany({
    where: {
      course_assignment_id: { in: assignmentIds },
      is_active: true,
    },
    select: {
      course_assignment_id: true,
      id: true,
      student_user_id: true,
      is_active: true,
      created_at: true,
      removed_at: true,
      student: {
        select: {
          name: true,
          email: true,
          is_active: true,
          roles: { select: { role: true } },
          student_profile: {
            select: {
              program_id: true,
              major: { select: { name: true } },
              program: { select: { code: true, name: true } },
              student_id_number: true,
            },
          },
          enrollments: {
            where: { term_instance_id: { in: termInstanceIds }, is_active: true },
            select: {
              term_instance_id: true,
              program_id: true,
              program: { select: { code: true, name: true } },
              major: { select: { name: true } },
            },
          },
        },
      },
      remover: { select: { name: true } },
    },
  });
}

async function addAssignmentCounts(assignments: AssignmentReadRow[]) {
  const membershipRows = await loadMembershipRows(
    assignments.map((assignment) => assignment.id),
    assignments.map((assignment) => assignment.term_instance.id)
  );
  const byAssignment = new Map<string, ReadMembershipRow[]>();

  // Counts are intentionally computed from active membership rows only.
  for (const membership of membershipRows) {
    const rows = byAssignment.get(membership.course_assignment_id) ?? [];
    rows.push(membership);
    byAssignment.set(membership.course_assignment_id, rows);
  }

  return assignments.map((assignment) => {
    const rows = byAssignment.get(assignment.id) ?? [];
    const eligible = rows.filter(
      (row) => projectMembershipEligibility(assignment, row.student).eligible
    ).length;
    return assignmentSummary(assignment, {
      activeRosterCount: rows.length,
      evaluationEligibleCount: eligible,
    });
  });
}

export async function listAuthorizedCourseRosterAssignments(
  options: {
    includeHistory?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    facultyOnly?: boolean;
    programId?: string;
  } = {}
): Promise<RosterServiceResult<CourseRosterDiscoveryResult>> {
  let actorId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    if (options.facultyOnly && session.activeRole !== ROLES.FACULTY) {
      return { success: false, error: "Course assignment not found." };
    }
    const rosterRoles = [ROLES.FACULTY, ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
    if (
      !rosterRoles.some((role) => role === session.activeRole) ||
      session.profileGate.status === "INACTIVE"
    ) {
      return { success: false, error: "Course assignment not found." };
    }

    const includeHistory = options.includeHistory ?? false;
    const search = options.search?.trim() ?? "";
    const page = Math.max(0, options.page ?? 0);
    const pageSize = options.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
    const activePeriodId = await getActivePeriodId();
    let programHeadProgramIds: string[] = [];
    if (session.activeRole === ROLES.PROGRAM_HEAD) {
      if (!options.programId) return { success: false, error: "Course assignment not found." };
      const context = await resolveProgramHeadContext(options.programId);
      if (!context.success) return { success: false, error: "Course assignment not found." };
      programHeadProgramIds = [context.data.selectedProgram.id];
    }
    const where = assignmentWhere(
      session,
      { includeHistory, activePeriodId, search },
      programHeadProgramIds
    );
    let [assignments, total] = await loadAssignmentRows(where, page, pageSize);
    const canonicalPage = total === 0 ? 0 : Math.min(page, Math.ceil(total / pageSize) - 1);
    if (canonicalPage !== page) {
      [assignments, total] = await loadAssignmentRows(where, canonicalPage, pageSize);
    }
    const items = await addAssignmentCounts(assignments);

    return {
      success: true,
      data: { items, total, page: canonicalPage, pageSize, includeHistory, search, activePeriodId },
    };
  } catch (error) {
    return unexpectedRosterReadFailure("list_authorized_assignments", actorId, undefined, error);
  }
}

type DetailMembershipRow = Omit<ReadMembershipRow, "course_assignment_id">;

function detailSearchWhere(search: string): Prisma.CourseAssignmentMembershipWhereInput {
  const terms = search.trim().split(/\s+/).filter(Boolean);
  return terms.length === 0
    ? {}
    : {
        AND: terms.map((term) => ({
          student: {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
            ],
          },
        })),
      };
}

function mapDetailMember(
  membership: DetailMembershipRow,
  assignment: AssignmentReadRow,
  eligibility: CourseRosterMember["eligibility"]
): CourseRosterMember {
  const currentEnrollment = membership.student.enrollments[0];
  const profile = membership.student.student_profile;
  return {
    membershipId: membership.id,
    studentName: membership.student.name,
    email: membership.student.email,
    programCode: currentEnrollment?.program.code ?? profile?.program.code ?? null,
    programName: currentEnrollment?.program.name ?? profile?.program.name ?? null,
    majorName: currentEnrollment?.major?.name ?? profile?.major?.name ?? null,
    yearLevel: assignment.year_level,
    section: assignment.section,
    membershipAddedAt: membership.created_at,
    isActive: membership.is_active,
    eligibility,
    removedAt: membership.removed_at,
    removedByName: membership.remover?.name ?? null,
  };
}

async function findDetailedAssignment(assignmentId: string) {
  return prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      faculty_id: true,
      course_id: true,
      program_id: true,
      year_level: true,
      section: true,
      is_active: true,
      course: { select: { code: true, title: true, course_scope: true } },
      program: { select: { code: true, name: true } },
      faculty: { select: { name: true, email: true } },
      term_instance: {
        select: {
          id: true,
          status: true,
          semester: true,
          term: true,
          school_year: { select: { code: true } },
        },
      },
      course_bound_evaluations: { select: { published_at: true } },
    },
  });
}

export async function getCourseRosterDetail(
  assignmentId: string,
  options: {
    includeRemoved?: boolean;
    search?: string;
    page?: number;
    sortDirection?: "asc" | "desc";
    programId?: string;
  } = {}
): Promise<RosterServiceResult<CourseRosterDetail>> {
  let actorId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    const authorization = await resolveAuthorizedCourseAssignmentRoster(assignmentId, {
      programId: options.programId,
    });
    if (!authorization.success) return authorization;

    const assignment = await findDetailedAssignment(assignmentId);
    if (!assignment) return { success: false, error: "Course assignment not found." };

    const includeRemoved = options.includeRemoved ?? false;
    const search = options.search?.trim() ?? "";
    const page = Math.max(1, options.page ?? 1);
    const sortDirection = options.sortDirection ?? "asc";
    const membershipWhere: Prisma.CourseAssignmentMembershipWhereInput = {
      course_assignment_id: assignmentId,
      ...(includeRemoved ? {} : { is_active: true }),
      ...detailSearchWhere(search),
    };
    const [memberships, totalMembers, activeRosterCount, allActiveMemberships] = await Promise.all([
      prisma.courseAssignmentMembership.findMany({
        where: membershipWhere,
        select: {
          id: true,
          student_user_id: true,
          is_active: true,
          created_at: true,
          removed_at: true,
          student: {
            select: {
              name: true,
              email: true,
              is_active: true,
              roles: { select: { role: true } },
              student_profile: {
                select: {
                  program_id: true,
                  major: { select: { name: true } },
                  program: { select: { code: true, name: true } },
                  student_id_number: true,
                },
              },
              enrollments: {
                where: { term_instance_id: assignment.term_instance.id, is_active: true },
                select: {
                  term_instance_id: true,
                  program_id: true,
                  program: { select: { code: true, name: true } },
                  major: { select: { name: true } },
                },
              },
            },
          },
          remover: { select: { name: true } },
        },
        orderBy: [
          { student: { name: sortDirection } },
          { student_user_id: sortDirection },
        ],
        skip: (page - 1) * COURSE_ROSTER_DETAIL_PAGE_SIZE,
        take: COURSE_ROSTER_DETAIL_PAGE_SIZE,
      }),
      prisma.courseAssignmentMembership.count({ where: membershipWhere }),
      prisma.courseAssignmentMembership.count({
        where: { course_assignment_id: assignmentId, is_active: true },
      }),
      prisma.courseAssignmentMembership.findMany({
        where: { course_assignment_id: assignmentId, is_active: true },
        select: {
          student: {
            select: {
              is_active: true,
              roles: { select: { role: true } },
              student_profile: { select: { program_id: true, student_id_number: true } },
              enrollments: {
                where: { term_instance_id: assignment.term_instance.id, is_active: true },
                select: { term_instance_id: true, program_id: true },
              },
            },
          },
        },
      }),
    ]);
    const evaluationEligibleCount = allActiveMemberships.filter(
      (membership) => projectMembershipEligibility(assignment, membership.student).eligible
    ).length;
    const totalPages = Math.max(1, Math.ceil(totalMembers / COURSE_ROSTER_DETAIL_PAGE_SIZE));
    const members = memberships.map((membership) => {
      const projection = projectMembershipEligibility(assignment, membership.student);
      return mapDetailMember(membership, assignment, projection);
    });
    const summary = assignmentSummary(assignment, { activeRosterCount, evaluationEligibleCount });

    return {
      success: true,
      data: {
        assignment: summary,
        canManage: authorization.data.canManage,
        canMutate: authorization.data.canMutate,
        members,
        totalMembers,
        activeRosterCount,
        evaluationEligibleCount,
        page: Math.min(page, totalPages),
        pageSize: COURSE_ROSTER_DETAIL_PAGE_SIZE,
        totalPages,
        search,
        includeRemoved,
        sortDirection,
      },
    };
  } catch (error) {
    return unexpectedRosterReadFailure("read_assignment_roster", actorId, assignmentId, error);
  }
}
