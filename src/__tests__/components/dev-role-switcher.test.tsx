import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DevRoleSwitcher,
  DevRoleSwitcherDesktop,
} from "@/features/auth/components/dev-role-switcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function installLocalStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
    },
  });
}

describe("DevRoleSwitcher", () => {
  it("does not render outside local development", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(<DevRoleSwitcher />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("renders the mobile FAB trigger in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    installLocalStorage();

    render(<DevRoleSwitcher />);

    expect(screen.getByRole("button", { name: "Open Dev Roles switcher" })).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("keeps the development login endpoint for desktop dropdown", async () => {
    vi.stubEnv("NODE_ENV", "development");
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/dashboard" }), { status: 200 })
    );

    render(<DevRoleSwitcherDesktop />);
    fireEvent.click(screen.getByRole("button", { name: /dev/i }));
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

  it("keeps the development login endpoint for mobile drawer", async () => {
    vi.stubEnv("NODE_ENV", "development");
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/dashboard" }), { status: 200 })
    );

    render(<DevRoleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Open Dev Roles switcher" }));
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
