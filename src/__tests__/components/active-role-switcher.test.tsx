import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/switch-role-action", () => ({
  switchActiveRole: vi.fn(),
}));

import { ActiveRoleSwitcher } from "@/features/auth/components/active-role-switcher";

describe("ActiveRoleSwitcher", () => {
  it("opens a labelled role menu for multi-role sessions without throwing", async () => {
    render(<ActiveRoleSwitcher roles={[ROLES.FACULTY, ROLES.ALUMNI]} activeRole={ROLES.FACULTY} />);

    fireEvent.click(screen.getByRole("button", { name: /switch role\. current role:/i }));

    expect(await screen.findByText("Switch role")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /alumni/i })).toBeInTheDocument();
  });

  it("renders nothing for single-role sessions", () => {
    render(<ActiveRoleSwitcher roles={[ROLES.FACULTY]} activeRole={ROLES.FACULTY} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
