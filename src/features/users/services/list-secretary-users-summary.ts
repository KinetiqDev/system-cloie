import { Prisma, StudentSection, SystemRole, YearLevel } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import {
  SECRETARY_USERS_PAGE_SIZE,
  serializeSecretaryUsersListQuery,
  type SecretaryUsersListQuery,
} from "../schemas/secretary-users-list";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecretaryUserSummaryItem = {
  id: string;
  /** Opaque canonical account name (ADR 0014). No first/last aliases. */
  name: string;
  email: string;
  isActive: boolean;
  roles: SystemRole[];
  activeRole: SystemRole | null;
  programLabel: string;
  majorLabel: string;
  /**
   * The Student's placement in the active Academic Period — the enrollment row
   * the placement filters and the Secretary edit dialog both read. Null when
   * the account has no enrollment there.
   */
  placement: { yearLevel: YearLevel; section: StudentSection | null } | null;
};

export type SecretaryUsersKPI = {
  totalUsers: number;
  totalStudents: number;
  totalAlumni: number;
  totalIndustryPartners: number;
};

/** The ACTIVE Academic Period that Student placement filters and labels read. */
export type SecretaryUsersActivePeriod = { id: string; label: string };

export type SecretaryUsersSummaryResult = {
  users: SecretaryUserSummaryItem[];
  total: number;
  page: number;
  pageSize: number;
  kpi: SecretaryUsersKPI;
  programs: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    majors: Array<{ id: string; name: string; isActive: boolean }>;
  }>;
  yearLevels: YearLevel[];
  activePeriod: SecretaryUsersActivePeriod | null;
};

type SecretaryUsersSummaryServiceResult =
  | ServiceResult<SecretaryUsersSummaryResult>
  | { success: false; error: string; canonicalQuery: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the program label for a user from their various affiliations.
 * Priority: student_profile > faculty affiliations > PH assignments > IP profile.
 */
function resolveProgramLabel(user: PrismaUserPageRow): string {
  // Student profile program
  if (user.student_profile?.program) {
    return user.student_profile.program.code;
  }

  // Faculty affiliations (may have multiple active programs)
  const facultyCodes = user.faculty_program_affiliations.map((a) => a.program.code);
  if (facultyCodes.length > 0) {
    return facultyCodes.join(", ");
  }

  // Program head assignments
  const phCodes = user.program_head_assignments.map((a) => a.program.code);
  if (phCodes.length > 0) {
    return phCodes.join(", ");
  }

  const ipAffCodes = user.industry_partner_program_affiliations.map((a) => a.program.code);
  const legacyIpCode = user.industry_partner_profile?.program?.code;
  // The program filter matches the legacy profile field too, so a partner whose
  // canonical affiliations changed can match a filter their label would hide.
  if (legacyIpCode && !ipAffCodes.includes(legacyIpCode)) {
    ipAffCodes.push(legacyIpCode);
  }
  if (ipAffCodes.length > 0) {
    return ipAffCodes.join(", ");
  }

  return "—";
}

/**
 * Derives the major label from the student profile, if any.
 */
function resolveMajorLabel(user: PrismaUserPageRow): string {
  return user.student_profile?.major?.name ?? "N/A";
}

/**
 * Resolves the Student's placement in the active Academic Period. The
 * projection already scopes enrollments to that period (and to active rows),
 * so the first row is the Student's current placement.
 */
function resolvePlacement(
  user: PrismaUserPageRow
): { yearLevel: YearLevel; section: StudentSection | null } | null {
  const enrollment = user.enrollments[0];
  if (!enrollment) {
    return null;
  }
  return { yearLevel: enrollment.year_level, section: enrollment.section };
}

// ---------------------------------------------------------------------------
// Prisma user shape (internal type for the raw query result)
// ---------------------------------------------------------------------------

/**
 * Student placement is projected only for the active Academic Period; with no
 * active period there is no placement to read, so the relation matches nothing.
 */
function buildPageSelect(activePeriodId: string | null) {
  return {
    id: true,
    name: true,
    email: true,
    is_active: true,
    roles: { select: { role: true } },
    student_profile: {
      select: {
        program: { select: { code: true } },
        major: { select: { name: true } },
      },
    },
    enrollments: {
      where: { is_active: true, term_instance_id: activePeriodId ?? { in: [] } },
      take: 1,
      select: { year_level: true, section: true },
    },
    faculty_program_affiliations: {
      where: { is_active: true },
      select: { program: { select: { code: true } } },
    },
    program_head_assignments: {
      where: { is_active: true },
      select: { program: { select: { code: true } } },
    },
    industry_partner_profile: {
      select: { program: { select: { code: true } } },
    },
    industry_partner_program_affiliations: {
      select: { program: { select: { code: true } } },
    },
  } satisfies Prisma.UserSelect;
}

type PrismaUserPageRow = Prisma.UserGetPayload<{
  select: ReturnType<typeof buildPageSelect>;
}>;

function buildWhere(
  query: SecretaryUsersListQuery,
  activePeriodId: string | null
): Prisma.UserWhereInput {
  const programFilter = query.program
    ? {
        OR: [
          { student_profile: { program: { code: query.program } } },
          {
            faculty_program_affiliations: {
              some: { is_active: true, program: { code: query.program } },
            },
          },
          {
            program_head_assignments: {
              some: { is_active: true, program: { code: query.program } },
            },
          },
          { industry_partner_profile: { program: { code: query.program } } },
          {
            industry_partner_program_affiliations: {
              some: { program: { code: query.program } },
            },
          },
        ],
      }
    : {};

  const conditions: Prisma.UserWhereInput[] = [];
  if (query.role) conditions.push({ roles: { some: { role: query.role } } });
  if (query.major) conditions.push({ student_profile: { major: { name: query.major } } });
  if (query.program) conditions.push(programFilter);
  if (query.yearLevel || query.section) {
    // Year level and section describe one placement — the Student's enrollment
    // row in the active Academic Period — so they resolve together into a
    // single `some` clause. The service drops them when no period is active,
    // which keeps this branch reachable only with a period id.
    conditions.push(
      activePeriodId
        ? {
            enrollments: {
              some: {
                is_active: true,
                term_instance_id: activePeriodId,
                ...(query.yearLevel ? { year_level: query.yearLevel } : {}),
                ...(query.section ? { section: query.section } : {}),
              },
            },
          }
        : { id: { in: [] } }
    );
  }
  if (query.state === "awaiting-term-placement") {
    conditions.push(
      { is_active: true },
      { roles: { some: { role: SystemRole.STUDENT } } },
      { student_profile: { isNot: null } },
      activePeriodId
        ? { enrollments: { none: { term_instance_id: activePeriodId, is_active: true } } }
        : { id: { in: [] } }
    );
  }
  if (query.verification === "pending") {
    conditions.push({
      OR: [
        { alumni_profile: { verification_status: "PENDING" } },
        { industry_partner_profile: { verification_status: "PENDING" } },
      ],
    });
  }
  if (query.q) {
    conditions.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  return conditions.length > 0 ? { AND: conditions } : {};
}

function buildOrderBy(query: SecretaryUsersListQuery): Prisma.UserOrderByWithRelationInput[] {
  const direction = query.direction;
  // Complete-name primary with stable id tie-breaker. Non-name sorts use name
  // as a secondary deterministic key before id.
  if (query.sort === "email") {
    return [{ email: direction }, { name: "asc" }, { id: "asc" }];
  }
  if (query.sort === "isActive") {
    return [{ is_active: direction }, { name: "asc" }, { id: "asc" }];
  }
  // Default and explicit complete-name sort (includes canonicalized legacy values).
  return [{ name: direction }, { id: "asc" }];
}

// ---------------------------------------------------------------------------
// Filter canonicalization
// ---------------------------------------------------------------------------

/**
 * Filters whose value can be dropped by the read, because only the read knows
 * whether the Programs, Majors, and period placement they name still exist.
 */
const CANONICALIZED_FILTER_KEYS = [
  "program",
  "major",
  "yearLevel",
  "section",
  "state",
  "verification",
] as const;

type CanonicalizedFilterKey = (typeof CANONICALIZED_FILTER_KEYS)[number];

/**
 * Resolves every filter against the records it names and against the role
 * context the Secretary Users list can present. A filter that survives only
 * here is a filter the list can show; everything else is dropped so the
 * redirect surfaces the removal instead of honoring an invisible filter.
 */
function canonicalizeListFilters(
  query: SecretaryUsersListQuery,
  programs: Array<{ code: string; majors: Array<{ name: string }> }>,
  activePeriodId: string | null
): SecretaryUsersListQuery {
  const { role } = query;
  const studentContext = role === SystemRole.STUDENT;
  const allRolesContext = role === undefined;
  const externalContext = role === SystemRole.ALUMNI || role === SystemRole.INDUSTRY_PARTNER;

  const selectedProgram = query.program
    ? programs.find((program) => program.code === query.program)
    : undefined;
  const program = !query.program || selectedProgram ? query.program : undefined;
  const major =
    studentContext &&
    query.major &&
    selectedProgram?.majors.some((entry) => entry.name === query.major)
      ? query.major
      : undefined;
  // Year level and section name the Student's placement in the active Academic
  // Period, so they need both the Student context and an ACTIVE period — and
  // awaiting placement means there is no placement to name.
  const placementContext =
    studentContext && activePeriodId !== null && query.state !== "awaiting-term-placement";
  const yearLevel = placementContext ? query.yearLevel : undefined;
  const section = placementContext ? query.section : undefined;
  const state = studentContext || allRolesContext ? query.state : undefined;
  const verification = allRolesContext || externalContext ? query.verification : undefined;

  return { ...query, program, major, yearLevel, section, state, verification };
}

function hasCanonicalizedFilters(
  query: SecretaryUsersListQuery,
  canonical: SecretaryUsersListQuery
): boolean {
  return CANONICALIZED_FILTER_KEYS.some(
    (key: CanonicalizedFilterKey) => query[key] !== canonical[key]
  );
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function listSecretaryUsersSummary(
  query: SecretaryUsersListQuery
): Promise<SecretaryUsersSummaryServiceResult> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }

  const pageSize = SECRETARY_USERS_PAGE_SIZE;
  const [programs, activePeriod] = await Promise.all([
    prisma.program.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        is_active: true,
        majors: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, is_active: true },
        },
      },
    }),
    prisma.academicTermInstance.findFirst({
      where: { status: "ACTIVE", school_year: { is_active: true } },
      select: {
        id: true,
        semester: true,
        term: true,
        school_year: { select: { code: true } },
      },
    }),
  ]);

  const canonicalQuery = canonicalizeListFilters(query, programs, activePeriod?.id ?? null);
  if (hasCanonicalizedFilters(query, canonicalQuery)) {
    return {
      success: false,
      error: "Invalid Secretary Users filters.",
      canonicalQuery: serializeSecretaryUsersListQuery({ ...canonicalQuery, page: 1 }),
    };
  }

  const where = buildWhere(query, activePeriod?.id ?? null);
  const [total, totalUsers, totalStudents, totalAlumni, totalIndustryPartners] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { roles: { some: { role: SystemRole.STUDENT } } } }),
    prisma.user.count({ where: { roles: { some: { role: SystemRole.ALUMNI } } } }),
    prisma.user.count({ where: { roles: { some: { role: SystemRole.INDUSTRY_PARTNER } } } }),
  ]);

  const page = total === 0 ? 1 : Math.min(query.page, Math.ceil(total / pageSize));
  const rawUsers = await prisma.user.findMany({
    where,
    select: buildPageSelect(activePeriod?.id ?? null),
    orderBy: buildOrderBy(query),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const yearLevels = Object.values(YearLevel);

  const users: SecretaryUserSummaryItem[] = rawUsers.map((u) => {
    const roleEnums = u.roles.map((r) => r.role);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.is_active,
      roles: roleEnums,
      activeRole: roleEnums[0] ?? null,
      programLabel: resolveProgramLabel(u),
      majorLabel: resolveMajorLabel(u),
      placement: resolvePlacement(u),
    };
  });

  return {
    success: true,
    data: {
      users,
      total,
      page,
      pageSize,
      kpi: { totalUsers, totalStudents, totalAlumni, totalIndustryPartners },
      yearLevels,
      activePeriod: activePeriod
        ? {
            id: activePeriod.id,
            label: formatTermInstanceLabel(
              activePeriod.school_year.code,
              activePeriod.semester,
              activePeriod.term
            ),
          }
        : null,
      programs: programs.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        isActive: p.is_active,
        majors: p.majors.map((major) => ({
          id: major.id,
          name: major.name,
          isActive: major.is_active,
        })),
      })),
    },
  };
}
