import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEDICATED_DEMO_USERS,
  DemoRoleSwitcher,
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

    expect(screen.queryByRole("button", { name: /demo roles/i })).not.toBeInTheDocument();
  });

  it("renders the seven required roles and filters the catalog", () => {
    installLocalStorage();
    render(<DemoRoleSwitcher enabled />);

    expect(screen.queryByRole("textbox", { name: "Search roles" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /demo roles/i }));

    expect(screen.getByRole("button", { name: /demo roles/i }).closest("div.fixed")).toHaveClass(
      "hidden",
      "lg:block"
    );
    expect(screen.getAllByRole("button", { name: /switch to/i })).toHaveLength(7);
    expect(screen.getByText("College Dean")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Search roles" }), {
      target: { value: "alumni" },
    });

    expect(screen.getByRole("button", { name: "Switch to Alumni" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch to Student" })).not.toBeInTheDocument();
  });

  it("uses the dedicated route, destination, refresh, and keyboard repositioning", async () => {
    installLocalStorage();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, destination: "/student/dashboard" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    render(<DemoRoleSwitcher enabled />);

    fireEvent.click(screen.getByRole("button", { name: /demo roles/i }));
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

    const handle = screen.getByRole("button", {
      name: /reposition role switcher/i,
    });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cloie-demo-switcher-pos",
      expect.stringContaining('"x"')
    );

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
    render(<DemoRoleSwitcher enabled />);
    fireEvent.click(screen.getByRole("button", { name: /demo roles/i }));

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
    render(<DemoRoleSwitcher enabled />);
    fireEvent.click(screen.getByRole("button", { name: /demo roles/i }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Secretary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demo user unavailable.");

    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Secretary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Role switch failed.");

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
