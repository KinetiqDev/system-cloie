import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { resolveAuthSessionMock, findUniqueUserMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueUserMock } },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import IndustryPartnerProfilePage from "@/app/(app)/industry-partner/profile/page";

function mockUser(affiliations: Array<{ program_id: string; program: unknown }>, legacy: unknown) {
  resolveAuthSessionMock.mockResolvedValue({ userId: "industry-1" });
  findUniqueUserMock.mockResolvedValue({
    name: "Sandy Partner",
    email: "sandy@example.com",
    industry_partner_profile: {
      company_name: "Sample Company",
      position: "Senior Engineer",
      program: legacy,
    },
    industry_partner_program_affiliations: affiliations,
  });
}

const BEED = { id: "prog-beed", code: "BEED", name: "Bachelor of Elementary Education" };
const BSHM = {
  id: "prog-bshm",
  code: "BSHM",
  name: "Bachelor of Science in Hospitality Management",
};

describe("IndustryPartnerProfilePage affiliations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders every affiliated program when the partner holds several", async () => {
    mockUser(
      [
        { program_id: BSHM.id, program: BSHM },
        { program_id: BEED.id, program: BEED },
      ],
      BEED
    );

    render(await IndustryPartnerProfilePage());

    expect(screen.getByText("Affiliated Programs")).toBeInTheDocument();
    expect(screen.getByText(`BEED — ${BEED.name}`)).toBeInTheDocument();
    expect(screen.getByText(`BSHM — ${BSHM.name}`)).toBeInTheDocument();
  });

  it("falls back to the legacy program when the join table holds nothing", async () => {
    mockUser([], BEED);

    render(await IndustryPartnerProfilePage());

    expect(screen.getByText("Affiliated Program")).toBeInTheDocument();
    expect(screen.getByText(`BEED — ${BEED.name}`)).toBeInTheDocument();
  });

  it("renders the empty state when no affiliation exists anywhere", async () => {
    mockUser([], null);

    render(await IndustryPartnerProfilePage());

    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });
});
