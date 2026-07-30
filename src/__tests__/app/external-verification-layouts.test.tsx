import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerificationStatus } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  sessionGuardMock,
  bannerMock,
  alumniProfileFindUniqueMock,
  industryPartnerProfileFindUniqueMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  sessionGuardMock: vi.fn(({ children }: { children: React.ReactNode }) => children),
  bannerMock: vi.fn(({ status }: { status: VerificationStatus }) => (
    <div data-testid="verification-status">{status}</div>
  )),
  alumniProfileFindUniqueMock: vi.fn(),
  industryPartnerProfileFindUniqueMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/components/session-guard", () => ({
  SessionGuard: sessionGuardMock,
}));
vi.mock("@/features/auth/components/verification-status-banner", () => ({
  VerificationStatusBanner: bannerMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    alumniProfile: { findUnique: alumniProfileFindUniqueMock },
    industryPartnerProfile: { findUnique: industryPartnerProfileFindUniqueMock },
  },
}));

describe("external verification layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Alumni verification status from the auth snapshot", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "alumni-1",
      activeRole: ROLES.ALUMNI,
      alumniProfileId: "alumni-profile-1",
      alumniVerificationStatus: VerificationStatus.PENDING,
    });
    const { default: AlumniLayout } = await import("@/app/(app)/alumni/layout");

    const result = await AlumniLayout({ children: <div>Alumni content</div> });

    expect(result.type).toBe(sessionGuardMock);
    expect(result.props.allowedRoles).toEqual([ROLES.ALUMNI]);
    expect(result.props.children[0].props.status).toBe(VerificationStatus.PENDING);
    expect(alumniProfileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("uses Industry Partner verification status from the auth snapshot", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "industry-1",
      activeRole: ROLES.INDUSTRY_PARTNER,
      industryPartnerProfileId: "industry-profile-1",
      industryPartnerVerificationStatus: VerificationStatus.APPROVED,
    });
    const { default: IndustryPartnerLayout } = await import(
      "@/app/(app)/industry-partner/layout"
    );

    const result = await IndustryPartnerLayout({ children: <div>Industry content</div> });

    expect(result.type).toBe(sessionGuardMock);
    expect(result.props.allowedRoles).toEqual([ROLES.INDUSTRY_PARTNER]);
    expect(result.props.children[0].props.status).toBe(VerificationStatus.APPROVED);
    expect(industryPartnerProfileFindUniqueMock).not.toHaveBeenCalled();
  });
});
