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
    demoEnabled,
    demoUsers,
    appearanceEnabled,
  }: {
    children: React.ReactNode;
    demoEnabled?: boolean;
    demoUsers?: readonly { email: string }[];
    appearanceEnabled?: boolean;
  }) => (
    <div
      data-demo-enabled={String(demoEnabled)}
      data-demo-users={demoUsers?.length ?? 0}
      data-appearance-enabled={String(appearanceEnabled)}
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
      roles: [ROLES.FACULTY],
      activeRole: ROLES.FACULTY,
    });
    getDemoAuthConfigMock.mockReturnValue({
      sessionSecret: "a".repeat(32),
      allowedUsers: new Set(["demo-faculty@cloie.test"]),
    });

    render(await AuthenticatedAppShell({ children: <div>Protected sentinel</div> }));

    expect(screen.getByText("Protected sentinel").parentElement).toHaveAttribute(
      "data-demo-enabled",
      "true"
    );
    expect(screen.getByText("Protected sentinel").parentElement).toHaveAttribute(
      "data-demo-users",
      "1"
    );
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
