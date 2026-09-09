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
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentEnrollment: { findUnique: findUniqueEnrollmentMock },
    facultyProgramAffiliation: { findFirst: vi.fn() },
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
});
