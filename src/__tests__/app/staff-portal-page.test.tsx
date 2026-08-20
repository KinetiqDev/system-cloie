import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import StaffPortalPage from "@/app/(public)/portal/staff/page";
import type { RoleCardConfig } from "@/features/portals/lib/role-card-config";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

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
}

vi.mock("@/features/portals", () => ({
  PortalShell: ({ title, subtitle, cards, session, backLink }: MockPortalShellProps) => (
    <div data-testid="portal-shell">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {session && <p>Signed in as {session.email}</p>}
      <span data-testid="card-count">{cards.length}</span>
      {backLink && <a href={backLink.href}>{backLink.label}</a>}
    </div>
  ),
}));

describe("StaffPortalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders staff portal with 5 cards when no session is active", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const page = await StaffPortalPage();
    render(page);

    expect(screen.getByText("ACD Staff & Faculty Portal")).toBeInTheDocument();
    expect(screen.getByTestId("card-count").textContent).toBe("5");
    expect(screen.getByText(/Back to portal selection/)).toBeInTheDocument();
  });

  it("redirects authenticated staff to their dashboard", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "user-123",
      email: "staff@acd.edu.ph",
      activeRole: "FACULTY",
      roles: ["FACULTY"],
      profileGate: { status: "COMPLETE" },
    });
    resolvePostLoginDestinationMock.mockReturnValue("/faculty/dashboard");

    await expect(StaffPortalPage()).rejects.toThrow("NEXT_REDIRECT:/faculty/dashboard");
    expect(resolvePostLoginDestinationMock).toHaveBeenCalledWith({
      requestedPath: "/dashboard",
      intent: null,
      activeRole: "FACULTY",
      profileGate: { status: "COMPLETE" },
    });
  });
});
