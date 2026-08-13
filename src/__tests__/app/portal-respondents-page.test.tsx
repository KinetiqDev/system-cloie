import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RespondentPortalPage from "@/app/(public)/portal/respondents/page";
import type { RoleCardConfig } from "@/features/portals/lib/role-card-config";

const { redirectMock, resolveAuthSessionMock, resolvePostLoginDestinationMock } = vi.hoisted(
  () => ({
    redirectMock: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    resolveAuthSessionMock: vi.fn(),
    resolvePostLoginDestinationMock: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-post-login-destination", () => ({
  resolvePostLoginDestination: resolvePostLoginDestinationMock,
}));

interface MockPortalShellProps {
  title: string;
  subtitle: string;
  cards: RoleCardConfig[];
  session?: { email: string; isComplete: boolean } | null;
  backLink?: { label: string; href: string };
  crossLink?: { label: string; href: string };
}

vi.mock("@/features/portals", () => ({
  PortalShell: ({ title, subtitle, cards, session, backLink, crossLink }: MockPortalShellProps) => (
    <div data-testid="portal-shell">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {session && <p>Signed in as {session.email}</p>}
      <span data-testid="card-count">{cards.length}</span>
      {backLink && <a href={backLink.href}>{backLink.label}</a>}
      {crossLink && <a href={crossLink.href}>{crossLink.label}</a>}
    </div>
  ),
}));

describe("RespondentPortalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders respondent portal with 3 cards when no session is active", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const page = await RespondentPortalPage();
    render(page);

    expect(screen.getByText("Welcome to System CLOIE")).toBeInTheDocument();
    expect(screen.getByTestId("card-count").textContent).toBe("3");
    expect(screen.getByText(/Go to Staff Portal/)).toBeInTheDocument();
    expect(screen.getByText(/Back to portal selection/)).toBeInTheDocument();
  });

  it("redirects authenticated incomplete alumni to onboarding", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "alumni@example.com",
      activeRole: "ALUMNI",
      roles: ["ALUMNI"],
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/onboarding?intent=alumni");

    await expect(RespondentPortalPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding?intent=alumni");
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: "alumni",
      activeRole: "ALUMNI",
      profileGate: { status: "ALUMNI_ONBOARDING_REQUIRED", intent: "alumni" },
    });
  });
});
