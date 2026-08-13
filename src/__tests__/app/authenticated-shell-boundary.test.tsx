import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
}));

const { getDemoAuthConfigMock } = vi.hoisted(() => ({
  getDemoAuthConfigMock: vi.fn(),
}));

const { resolveAppearanceAvailabilityMock } = vi.hoisted(() => ({
  resolveAppearanceAvailabilityMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/components/session-guard", () => ({
  SessionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/auth/services/demo-auth", () => ({
  getDemoAuthConfig: getDemoAuthConfigMock,
}));

vi.mock("@/features/design-system/services/resolve-appearance-availability", () => ({
  resolveAppearanceAvailability: resolveAppearanceAvailabilityMock,
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({
    children,
    user,
    demoEnabled,
    demoUsers,
    appearanceEnabled,
  }: {
    children: React.ReactNode;
    user?: { name?: string | null; email?: string | null } | undefined;
    demoEnabled?: boolean;
    demoUsers?: readonly { email: string }[];
    appearanceEnabled?: boolean;
  }) => (
    <div
      data-demo-enabled={String(demoEnabled)}
      data-demo-users={demoUsers?.length ?? 0}
      data-appearance-enabled={String(appearanceEnabled)}
      data-user-name={user?.name ?? ""}
      data-user-present={user ? "true" : "false"}
    >
      {children}
    </div>
  ),
}));

import { AuthenticatedAppShell } from "@/features/auth/components/authenticated-app-shell";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("AuthenticatedAppShell", () => {
  beforeEach(() => {
    resolveAppearanceAvailabilityMock.mockReturnValue(false);
  });

  it("passes a true demo capability for a valid dedicated-demo configuration", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      email: "demo-faculty@cloie.test",
      name: "Demo Faculty",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    getDemoAuthConfigMock.mockReturnValue({
      sessionSecret: "a".repeat(32),
      allowedUsers: new Set(["demo-faculty@cloie.test"]),
    });

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    const shell = screen.getByText("Protected sentinel").parentElement;
    expect(shell).toHaveAttribute("data-demo-enabled", "true");
    expect(shell).toHaveAttribute("data-demo-users", "1");
    expect(shell).toHaveAttribute("data-user-present", "true");
    expect(shell).toHaveAttribute("data-user-name", "Demo Faculty");
  });

  it("renders the canonical session name and never derives identity from email", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      email: "juan.dela.cruz@acd.edu.ph",
      name: "Juan Dela Cruz",
      roles: [ROLES.STUDENT],
      activeRole: ROLES.STUDENT,
    });
    getDemoAuthConfigMock.mockReturnValue(null);

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    const shell = screen.getByText("Protected sentinel").parentElement;
    expect(shell).toHaveAttribute("data-user-name", "Juan Dela Cruz");
    expect(shell).not.toHaveAttribute("data-user-name", "juan.dela.cruz");
  });

  it("omits the shell user when the session has no canonical name", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      email: "orphan@acd.edu.ph",
      name: null,
      roles: [],
      activeRole: null,
    });
    getDemoAuthConfigMock.mockReturnValue(null);

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    const shell = screen.getByText("Protected sentinel").parentElement;
    expect(shell).toHaveAttribute("data-user-present", "false");
    expect(shell).toHaveAttribute("data-user-name", "");
  });

  it("passes the appearance capability to the shell", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      email: "faculty@example.com",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    getDemoAuthConfigMock.mockReturnValue(null);
    resolveAppearanceAvailabilityMock.mockReturnValue(true);

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    expect(screen.getByText("Protected sentinel").parentElement).toHaveAttribute(
      "data-appearance-enabled",
      "true"
    );
  });

  it("passes a false demo capability when dedicated-demo configuration is invalid", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      email: "faculty@example.com",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    getDemoAuthConfigMock.mockReturnValue(null);

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    expect(screen.getByText("Protected sentinel").parentElement).toHaveAttribute(
      "data-demo-enabled",
      "false"
    );
    expect(screen.getByText("Protected sentinel").parentElement).toHaveAttribute(
      "data-demo-users",
      "0"
    );
  });

  it("defers the protected shell until the server session resolves", async () => {
    const session = deferred<{
      email: string;
      roles: [typeof ROLES.FACULTY];
      activeRole: typeof ROLES.FACULTY;
    }>();
    resolveAuthSessionMock.mockReturnValue(session.promise);

    const boundary = AuthenticatedAppShell({ children: <div>Protected sentinel</div> });
    expect(boundary).toBeInstanceOf(Promise);
    let settled = false;
    void boundary.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    session.resolve({
      email: "faculty@example.com",
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });

    render(await boundary);
    expect(screen.getByText("Protected sentinel")).toBeInTheDocument();
  });
});
