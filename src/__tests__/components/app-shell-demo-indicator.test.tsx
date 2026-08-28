import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => null,
}));
vi.mock("@/components/layout/topbar", () => ({
  Topbar: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/layout/mobile-nav", () => ({
  MobileNav: () => null,
}));
vi.mock("@/features/auth/components/dev-role-switcher", () => ({
  DevRoleSwitcher: () => null,
  DevRoleSwitcherDesktop: () => null,
}));
vi.mock("@/features/auth/components/demo-role-switcher", () => ({
  DemoRoleSwitcher: ({ enabled }: { enabled: boolean }) =>
    enabled ? <div>Demo role switcher</div> : null,
  DemoRoleSwitcherDesktop: ({ enabled }: { enabled: boolean }) =>
    enabled ? <div>Demo role switcher desktop</div> : null,
}));

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell dedicated demo experience", () => {
  it("shows the indicator and switcher only for the server capability", () => {
    const { rerender } = render(
      <AppShell demoEnabled user={{ email: "demo-faculty@cloie.test" }} activeRole={ROLES.FACULTY}>
        <div>Protected content</div>
      </AppShell>
    );

    expect(screen.getByRole("status", { name: "Dedicated demo environment" })).toBeInTheDocument();
    expect(screen.getByText("Demo role switcher")).toBeInTheDocument();

    rerender(
      <AppShell user={{ email: "faculty@example.com" }} activeRole={ROLES.FACULTY}>
        <div>Protected content</div>
      </AppShell>
    );

    expect(
      screen.queryByRole("status", { name: "Dedicated demo environment" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Demo role switcher")).not.toBeInTheDocument();
  });
});
