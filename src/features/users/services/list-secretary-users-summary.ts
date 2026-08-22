import { Prisma, SystemRole, YearLevel } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
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
  sectionLabel: string;
};

export type SecretaryUsersKPI = {
  totalUsers: number;
  totalStudents: number;
  totalAlumni: number;
  totalIndustryPartners: number;
};

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

  if (user.industry_partner_profile?.program) {
    return user.industry_partner_profile.program.code;
  }
  const ipAffCodes = user.industry_partner_program_affiliations.map((a) => a.program.code);
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
 * Capitalizes a StudentSection enum value into a display label (e.g., "MORNING" → "Morning").
 *
 * Section is stored on StudentEnrollment, not StudentAcademicProfile, so
 * the resolution requires an enrollment join which is deferred.
 */
function resolveSectionLabel(): string {
  return "—";
}

// ---------------------------------------------------------------------------
// Prisma user shape (internal type for the raw query result)
// ---------------------------------------------------------------------------

const pageSelect = {
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

type PrismaUserPageRow = Prisma.UserGetPayload<{ select: typeof pageSelect }>;

function buildWhere(query: SecretaryUsersListQuery): Prisma.UserWhereInput {
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
  const programs = await prisma.program.findMany({
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
  });

  const selectedProgram = query.program
    ? programs.find((program) => program.code === query.program)
    : undefined;
  const hasValidProgram = !query.program || !!selectedProgram;
  const hasValidMajor =
    !query.major ||
    (!!selectedProgram && selectedProgram.majors.some((major) => major.name === query.major));

  if (!hasValidProgram || !hasValidMajor) {
    const canonicalQuery = serializeSecretaryUsersListQuery({
      ...query,
      page: 1,
      program: hasValidProgram ? query.program : undefined,
      major: hasValidProgram && hasValidMajor ? query.major : undefined,
    });
    return {
      success: false,
      error: "Invalid Secretary Users filters.",
      canonicalQuery,
    };
  }

  const where = buildWhere(query);
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
    select: pageSelect,
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
      sectionLabel: resolveSectionLabel(),
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
