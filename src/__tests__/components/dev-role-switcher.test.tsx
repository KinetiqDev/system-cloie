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

  it("does not render outside local development", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(<DevRoleSwitcher />);

    expect(screen.queryByRole("button", { name: /dev roles/i })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("keeps the development login endpoint", async () => {
    vi.stubEnv("NODE_ENV", "development");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: { getItem: vi.fn(), setItem: vi.fn() },
    });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/dashboard" }), { status: 200 })
    );

    render(<DevRoleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /dev roles/i }));
    fireEvent.click(screen.getByRole("button", { name: /switch to secretary/i }));

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/dev-login",
        expect.objectContaining({ body: JSON.stringify({ email: "demo-secretary@cloie.test" }) })
      );
    });

    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });
});
