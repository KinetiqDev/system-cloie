import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/components/session-guard", () => ({
  SessionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
