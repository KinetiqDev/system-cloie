// fallow-ignore-file complexity
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FacultyApprovalStatus } from "@prisma/client";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  addRoleToExistingUser,
  removeRoleFromUser,
  toggleUserActive,
} from "@/features/users/services/manage-users";
import { createUserBySecretaryAction } from "@/lib/actions/secretary-user-crud-actions";
import { addRoleToExistingUserAction } from "@/lib/actions/management-foundation-actions";

/**
 * The internal role-only bypass (issue #649, ADR 0031).
 *
 * Authorization across the app reads `session.activeRole`; the profile gate is
 * what turns an internal Google-only session into something else. These cases
 * drive the *real* session resolver against mocked Supabase Auth and Prisma —
 * no mocked session object — and then call the *real* privileged services and
 * Server Actions. That is the exploit path: a password, one-time-code,
 * recovery, or deactivated session for a Secretary or Dean invoking a
 * privileged action directly, outside any page or layout guard.
 *
 * The invariant under test: a session whose profile gate denies access holds no
 * active role, so every role-only guard fails closed. A ready Google session
 * for the same account still reaches the write.
 */

const {
  getUserMock,
  getClaimsMock,
  sessionUserFindUniqueMock,
  userRoleCreateMock,
  transactionMock,
  facultyAffiliationUpdateManyMock,
  facultyAffiliationUpsertMock,
  studentProfileUpsertMock,
  studentEnrollmentUpsertMock,
  activeTermFindFirstMock,
  readActiveRoleCookieMock,
  readDemoAuthCookieMock,
  readDevAuthCookieMock,
  readCiTestAuthCookieMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getClaimsMock: vi.fn(),
  sessionUserFindUniqueMock: vi.fn(),
  userRoleCreateMock: vi.fn(),
  transactionMock: vi.fn(),
  facultyAffiliationUpdateManyMock: vi.fn(),
  facultyAffiliationUpsertMock: vi.fn(),
  studentProfileUpsertMock: vi.fn(),
  studentEnrollmentUpsertMock: vi.fn(),
  activeTermFindFirstMock: vi.fn(),
  readActiveRoleCookieMock: vi.fn(),
  readDemoAuthCookieMock: vi.fn(),
  readDevAuthCookieMock: vi.fn(),
  readCiTestAuthCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("@/features/auth/services/dev-auth", () => ({
  readDevAuthCookie: readDevAuthCookieMock,
}));

vi.mock("@/features/auth/services/demo-auth", () => ({
  getDemoAuthConfig: vi.fn(() => null),
  readDemoAuthCookie: readDemoAuthCookieMock,
}));

vi.mock("@/features/auth/services/ci-test-auth", () => ({
  getCiTestAuthConfig: vi.fn(() => null),
  readCiTestAuthCookie: readCiTestAuthCookieMock,
}));

vi.mock("@/features/auth/services/active-role-cookie", () => ({
  readActiveRoleCookie: readActiveRoleCookieMock,
  setActiveRoleCookie: vi.fn(),
  clearActiveRoleCookie: vi.fn(),
  ACTIVE_ROLE_COOKIE_NAME: "cloie_active_role",
  ACTIVE_ROLE_COOKIE_MAX_AGE_SECONDS: 60,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock, getClaims: getClaimsMock },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: sessionUserFindUniqueMock },
    academicTermInstance: { findFirst: vi.fn(async () => null) },
    studentEnrollment: { findUnique: vi.fn(async () => null) },
    // The role-entry gate validates the selected Program before the grant.
    program: {
      findUnique: vi.fn(async () => ({ id: "program-1", is_active: true, majors: [] })),
    },
    facultyProgramAffiliation: { findFirst: vi.fn(async () => ({ id: "affiliation-1" })) },
    userRole: { create: userRoleCreateMock },
    $transaction: transactionMock,
  },
}));

describe("internal role authorization boundary (issue #649)", () => {
  const AUTH_USER_ID = "auth-user-1";
  const OFFICER_USER_ID = "11111111-1111-4111-a111-111111111111";
  const TARGET_USER_ID = "44444444-4444-4444-b444-444444444444";
  const TARGET_EMAIL = "person@acd.edu.ph";

  /** The verified claim a real Supabase session carries for each method. */
  function claimsFor(method: "oauth" | "password" | "otp" | "recovery", proved: boolean) {
    if (!proved) return {};
    if (method === "oauth") {
      return {
        amr: [{ method: "oauth" }],
        app_metadata: { provider: "google", providers: ["google"] },
      };
    }
    if (method === "recovery") {
      return { amr: [{ method: "recovery" }, { method: "password" }] };
    }
    return { amr: [{ method }] };
  }

  function arrangeSession(options?: {
    method?: "oauth" | "password" | "otp" | "recovery";
    proved?: boolean;
    role?: SystemRole;
    isActive?: boolean;
    facultyApprovalStatus?: FacultyApprovalStatus | null;
  }) {
    const {
      method = "oauth",
      proved = true,
      role = SystemRole.SECRETARY,
      isActive = true,
      facultyApprovalStatus = null,
    } = options ?? {};

    getUserMock.mockResolvedValue({
      data: { user: { id: AUTH_USER_ID, email: "officer@acd.edu.ph" } },
      error: null,
    });
    getClaimsMock.mockResolvedValue({ data: { claims: claimsFor(method, proved) }, error: null });

    // One `prisma.user.findUnique` serves both the session lookup (by linked
    // auth id) and the target-account lookup (by domain id) in the services
    // under test, so it answers per requested key rather than per call order.
    sessionUserFindUniqueMock.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => {
        if (typeof where.auth_user_id === "string") {
          return {
            id: OFFICER_USER_ID,
            email: "officer@acd.edu.ph",
            name: "Officer",
            auth_user_id: AUTH_USER_ID,
            is_active: isActive,
            roles: [{ role }],
            student_profile: null,
            alumni_profile: null,
            industry_partner_profile: null,
            faculty_access_request_owned: facultyApprovalStatus
              ? { status: facultyApprovalStatus }
              : null,
          };
        }
        return { id: TARGET_USER_ID, email: TARGET_EMAIL };
      }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    readDevAuthCookieMock.mockResolvedValue(null);
    readDemoAuthCookieMock.mockResolvedValue(null);
    readCiTestAuthCookieMock.mockResolvedValue(null);
    // The acting officer deliberately selected this role context.
    readActiveRoleCookieMock.mockResolvedValue("SECRETARY");
    activeTermFindFirstMock.mockResolvedValue({ id: "term-active" });
    userRoleCreateMock.mockResolvedValue({ id: "role-1" });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        userRole: { create: userRoleCreateMock },
        facultyProgramAffiliation: {
          updateMany: facultyAffiliationUpdateManyMock,
          upsert: facultyAffiliationUpsertMock,
        },
        studentAcademicProfile: { upsert: studentProfileUpsertMock },
        studentEnrollment: { upsert: studentEnrollmentUpsertMock },
        academicTermInstance: { findFirst: activeTermFindFirstMock },
      })
    );
  });

  describe("session snapshot", () => {
    it("withholds the active role for a password session on a Google-only role", async () => {
      arrangeSession({ method: "password" });

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({
        status: "AUTH_METHOD_MISMATCH",
        role: ROLES.SECRETARY,
      });
      expect(session?.activeRole).toBeNull();
      // Withheld, not erased: the role stays assigned and the switcher can still
      // deliberately move to a role this session may actually use.
      expect(session?.roles).toEqual([ROLES.SECRETARY]);
    });

    it.each(["otp", "recovery"] as const)(
      "withholds the active role for a %s session on a Google-only role",
      async (method) => {
        arrangeSession({ method });

        const session = await resolveAuthSession();

        expect(session?.profileGate).toEqual({
          status: "AUTH_METHOD_MISMATCH",
          role: ROLES.SECRETARY,
        });
        expect(session?.activeRole).toBeNull();
      }
    );

    it("withholds the active role when the method cannot be proved", async () => {
      arrangeSession({ proved: false });

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({
        status: "AUTH_METHOD_MISMATCH",
        role: ROLES.SECRETARY,
      });
      expect(session?.activeRole).toBeNull();
    });

    it("withholds the active role for a deactivated account", async () => {
      arrangeSession({ isActive: false });

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({ status: "INACTIVE" });
      expect(session?.activeRole).toBeNull();
    });

    it.each(["PENDING", "REJECTED"] as const)(
      "withholds the active role while a Faculty request is %s",
      async (facultyApprovalStatus) => {
        readActiveRoleCookieMock.mockResolvedValue("FACULTY");
        arrangeSession({ role: SystemRole.FACULTY, facultyApprovalStatus });

        const session = await resolveAuthSession();

        expect(session?.activeRole).toBeNull();
      }
    );

    it("withholds the active role for a Student awaiting institution placement", async () => {
      // Placement is Secretary-recorded, so a provisioned Student with no
      // academic context waits on the institution rather than entering any
      // Student workspace — even from a proved Google session.
      readActiveRoleCookieMock.mockResolvedValue("STUDENT");
      arrangeSession({ role: SystemRole.STUDENT });

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({ status: "STUDENT_PLACEMENT_REQUIRED" });
      expect(session?.activeRole).toBeNull();
    });

    it("keeps the active role for a ready Google session", async () => {
      arrangeSession();

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({ status: "COMPLETE" });
      expect(session?.activeRole).toBe(ROLES.SECRETARY);
    });

    it("keeps the active role for a redirected-only readiness gate", async () => {
      // An onboarding requirement redirects to an entry route rather than
      // refusing authority, so the role stays active and the destination
      // resolver still sees which role to route.
      readActiveRoleCookieMock.mockResolvedValue("ALUMNI");
      arrangeSession({ role: SystemRole.ALUMNI });

      const session = await resolveAuthSession();

      expect(session?.profileGate).toEqual({
        status: "ALUMNI_ONBOARDING_REQUIRED",
        intent: "alumni",
      });
      expect(session?.activeRole).toBe(ROLES.ALUMNI);
    });
  });

  describe("privileged writes through the real services and actions", () => {
    it("refuses a password Secretary session in addRoleToExistingUser", async () => {
      arrangeSession({ method: "password" });

      const result = await addRoleToExistingUser({
        user_id: TARGET_USER_ID,
        role: SystemRole.FACULTY,
        program_id: "program-1",
      });

      expect(result).toEqual({ success: false, error: "Authentication required." });
      expect(userRoleCreateMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it("refuses a recovery Dean session in addRoleToExistingUser", async () => {
      readActiveRoleCookieMock.mockResolvedValue("DEAN");
      arrangeSession({ method: "recovery", role: SystemRole.DEAN });

      const result = await addRoleToExistingUser({
        user_id: TARGET_USER_ID,
        role: SystemRole.FACULTY,
        program_id: "program-1",
      });

      expect(result.success).toBe(false);
      expect(userRoleCreateMock).not.toHaveBeenCalled();
    });

    it("refuses an otp Secretary session in toggleUserActive", async () => {
      arrangeSession({ method: "otp" });

      const result = await toggleUserActive(TARGET_USER_ID, false);

      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("refuses a deactivated Secretary session in removeRoleFromUser", async () => {
      arrangeSession({ isActive: false });

      const result = await removeRoleFromUser(TARGET_USER_ID, SystemRole.FACULTY);

      expect(result).toEqual({ success: false, error: "Authentication required." });
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it("refuses a password Secretary session in createUserBySecretaryAction", async () => {
      arrangeSession({ method: "password" });
      const formData = new FormData();
      formData.set("name", "New Student");
      formData.set("email", "student@acd.edu.ph");
      formData.set("role", SystemRole.STUDENT);

      const result = await createUserBySecretaryAction(formData);

      expect(result).toEqual({ success: false, error: "Secretary access required" });
    });

    it("refuses a password Secretary session in addRoleToExistingUserAction", async () => {
      arrangeSession({ method: "password" });
      const formData = new FormData();
      formData.set("user_id", TARGET_USER_ID);
      formData.set("role", SystemRole.FACULTY);

      const result = await addRoleToExistingUserAction(formData);

      expect(result).toEqual({ error: "Authentication required.", success: false });
    });
  });

  describe("Student provisioning is Secretary-only (issue #649, story 5)", () => {
    const studentGrant = {
      user_id: TARGET_USER_ID,
      role: SystemRole.STUDENT,
      program_id: "program-1",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    };

    it("refuses a Dean granting the Student role on an existing account", async () => {
      readActiveRoleCookieMock.mockResolvedValue("DEAN");
      arrangeSession({ role: SystemRole.DEAN });

      const result = await addRoleToExistingUser(studentGrant);

      expect(result).toEqual({
        success: false,
        error: "Only a Secretary can provision a Student account.",
      });
      expect(userRoleCreateMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it("lets a Secretary grant the Student role with its academic context", async () => {
      arrangeSession();

      const result = await addRoleToExistingUser(studentGrant);

      expect(result).toEqual({ success: true, data: { id: "role-1" } });
      expect(userRoleCreateMock).toHaveBeenCalledWith({
        data: { user_id: TARGET_USER_ID, role: SystemRole.STUDENT },
      });
    });

    it("leaves every other Dean grant unchanged", async () => {
      readActiveRoleCookieMock.mockResolvedValue("DEAN");
      arrangeSession({ role: SystemRole.DEAN });

      const result = await addRoleToExistingUser({
        user_id: TARGET_USER_ID,
        role: SystemRole.FACULTY,
        program_id: "program-1",
      });

      expect(result).toEqual({ success: true, data: { id: "role-1" } });
      // The Faculty grant commits its role row together with the primary
      // affiliation in one transaction.
      expect(userRoleCreateMock).toHaveBeenCalledWith({
        data: { user_id: TARGET_USER_ID, role: SystemRole.FACULTY },
      });
      expect(facultyAffiliationUpsertMock).toHaveBeenCalled();
    });
  });
});
