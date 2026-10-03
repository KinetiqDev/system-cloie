import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  resolvePostLoginDestinationMock,
  getActiveTermIdMock,
  findUniqueEnrollmentMock,
  cookieSetMock,
  revalidatePathMock,
  redirectMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  resolvePostLoginDestinationMock: vi.fn(() => "/destination"),
  getActiveTermIdMock: vi.fn(),
  findUniqueEnrollmentMock: vi.fn(),
  cookieSetMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));
vi.mock("@/features/academic-calendar/services/resolve-active-term", () => ({
  getActiveTermId: getActiveTermIdMock,
}));
const findFirstFacultyAffiliationMock = vi.hoisted(() => vi.fn());
const findUniqueFacultyRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentEnrollment: { findUnique: findUniqueEnrollmentMock },
    facultyProgramAffiliation: { findFirst: findFirstFacultyAffiliationMock },
    facultyAccessRequest: { findUnique: findUniqueFacultyRequestMock },
  },
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ set: cookieSetMock })) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { switchActiveRole } from "@/lib/actions/switch-role-action";

describe("switchActiveRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "person@acd.edu.ph",
      name: "Person One",
      roles: [ROLES.FACULTY, ROLES.STUDENT],
      activeRole: ROLES.FACULTY,
      studentProfileId: "student-profile-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      alumniVerificationStatus: null,
      industryPartnerVerificationStatus: null,
      profileGate: { status: "COMPLETE" },
    });
    getActiveTermIdMock.mockResolvedValue("active-term-1");
    findUniqueEnrollmentMock.mockResolvedValue({ is_active: true });
    findFirstFacultyAffiliationMock.mockResolvedValue(null);
    findUniqueFacultyRequestMock.mockResolvedValue({ status: "PENDING" });
  });

  it("preserves Student enrollment readiness when switching roles", async () => {
    await expect(switchActiveRole(ROLES.STUDENT)).rejects.toThrow("NEXT_REDIRECT:/destination");

    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: null,
      intent: null,
      activeRole: ROLES.STUDENT,
      profileGate: { status: "COMPLETE" },
    });
    expect(findUniqueEnrollmentMock).toHaveBeenCalledWith({
      where: {
        student_user_id_term_instance_id: {
          student_user_id: "user-1",
          term_instance_id: "active-term-1",
        },
      },
      select: { is_active: true },
    });
    expect(cookieSetMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("blocks a pending Faculty request on switch instead of recomputing COMPLETE", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "person@acd.edu.ph",
      name: "Person One",
      roles: [ROLES.FACULTY, ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
      studentProfileId: "student-profile-1",
      alumniProfileId: null,
      industryPartnerProfileId: null,
      alumniVerificationStatus: null,
      industryPartnerVerificationStatus: null,
      authMethod: "google",
      facultyApprovalStatus: "PENDING",
      profileGate: { status: "COMPLETE" },
    });

    await expect(switchActiveRole(ROLES.FACULTY)).rejects.toThrow("NEXT_REDIRECT");

    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: null,
      intent: null,
      activeRole: ROLES.FACULTY,
      profileGate: { status: "FACULTY_APPROVAL_PENDING" },
    });
  });

  it("blocks a password session on switch even when the role is assigned", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "person@acd.edu.ph",
      name: "Person One",
      roles: [ROLES.SECRETARY],
      activeRole: ROLES.SECRETARY,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
      alumniVerificationStatus: null,
      industryPartnerVerificationStatus: null,
      authMethod: "password",
      facultyApprovalStatus: null,
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.SECRETARY },
    });

    await expect(switchActiveRole(ROLES.SECRETARY)).rejects.toThrow("NEXT_REDIRECT");

    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: null,
      intent: null,
      activeRole: ROLES.SECRETARY,
      profileGate: { status: "AUTH_METHOD_MISMATCH", role: ROLES.SECRETARY },
    });
  });
});
