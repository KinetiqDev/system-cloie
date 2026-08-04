import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEDICATED_DEMO_USERS,
  DemoRoleSwitcher,
  DemoRoleSwitcherDesktop,
} from "@/features/auth/components/demo-role-switcher";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
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

describe("DemoRoleSwitcher", () => {
  it("does not render without the server capability", () => {
    render(<DemoRoleSwitcher enabled={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the seven required roles in the desktop dropdown", () => {
    installLocalStorage();
    render(<DemoRoleSwitcherDesktop enabled />);

    fireEvent.click(screen.getByRole("button", { name: /demo/i }));

    expect(screen.getAllByRole("button", { name: /switch to/i })).toHaveLength(7);
    expect(screen.getByText("College Dean")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Search roles" }), {
      target: { value: "alumni" },
    });

    expect(screen.getByRole("button", { name: "Switch to Alumni" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch to Student" })).not.toBeInTheDocument();
  });

  it("uses the dedicated route, destination, and refresh", async () => {
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/student/dashboard" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    render(<DemoRoleSwitcherDesktop enabled />);

    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Student" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/demo-login",
        expect.objectContaining({
          body: JSON.stringify({ identifier: "demo-student@cloie.test" }),
        })
      );
      expect(pushMock).toHaveBeenCalledWith("/student/dashboard");
      expect(refreshMock).toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });

  it("locks the role choices while a selection is in flight", async () => {
    installLocalStorage();
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.spyOn(global, "fetch").mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );
    render(<DemoRoleSwitcherDesktop enabled />);
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));

    const secretary = screen.getByRole("button", { name: "Switch to Secretary" });
    const student = screen.getByRole("button", { name: "Switch to Student" });
    fireEvent.click(secretary);
    fireEvent.click(student);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(secretary).toBeDisabled();
    expect(student).toBeDisabled();

    resolveResponse(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await waitFor(() => expect(secretary).not.toBeDisabled());
    fetchMock.mockRestore();
  });

  it("shows a safe error for failed and non-JSON responses", async () => {
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Demo user unavailable." }), { status: 404 })
    );
    render(<DemoRoleSwitcherDesktop enabled />);
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Secretary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demo user unavailable.");

    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Secretary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Role switch failed.");

    fetchMock.mockRestore();
  });

  it("uses the dedicated route from the mobile drawer", async () => {
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/student/dashboard" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    render(<DemoRoleSwitcher enabled />);

    fireEvent.click(screen.getByRole("button", { name: "Open Demo Roles switcher" }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Student" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/demo-login",
        expect.objectContaining({
          body: JSON.stringify({ identifier: "demo-student@cloie.test" }),
        })
      );
      expect(pushMock).toHaveBeenCalledWith("/student/dashboard");
      expect(refreshMock).toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });

  it("keeps the dedicated presentation catalog distinct from the broader seed catalog", () => {
    expect(DEDICATED_DEMO_USERS).toHaveLength(7);
    expect(DEDICATED_DEMO_USERS.map((user) => user.label)).toEqual([
      "Secretary",
      "College Dean",
      "Program Head",
      "Faculty Member",
      "Student",
      "Alumni",
      "Industry Partner",
    ]);
  });
});
