import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DevRoleSwitcher } from "@/features/auth/components/dev-role-switcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("DevRoleSwitcher", () => {
  it("labels the role search textbox", () => {
    vi.stubEnv("NODE_ENV", "development");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
    });

    render(<DevRoleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /dev roles/i }));

    expect(screen.getByRole("textbox", { name: "Search roles" })).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
