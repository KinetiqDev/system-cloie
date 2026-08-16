import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProgramHeadSwitcher } from "@/features/auth/components/program-head-switcher";
import { Topbar } from "@/components/layout/topbar";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
const pathnameMock = vi.hoisted(() => vi.fn(() => "/program-head/programs/program-1/course-assignments"));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const programs = [
  { id: "program-1", code: "BSIT", name: "Information Technology" },
  { id: "program-2", code: "BSED", name: "Secondary Education" },
];

describe("ProgramHeadSwitcher", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/program-head/programs/program-1/course-assignments");
  });

  it("does not render when the program head only has one program assigned", () => {
    const singleProgram = [{ id: "program-1", code: "BSIT", name: "Information Technology" }];
    const { container } = render(<ProgramHeadSwitcher programs={singleProgram} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Switch program" })).not.toBeInTheDocument();
  });

  it("does not render when the program list is empty", () => {
    const { container } = render(<ProgramHeadSwitcher programs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders when the program head has more than one program assigned", () => {
    render(<ProgramHeadSwitcher programs={programs} />);
    const trigger = screen.getByRole("button", { name: "Switch program" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("BSIT");
  });

  it("opens dropdown menu and lists assigned programs with links", async () => {
    render(<ProgramHeadSwitcher programs={programs} />);
    const trigger = screen.getByRole("button", { name: "Switch program" });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    expect(screen.getByText("Assigned Programs")).toBeInTheDocument();

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(2);

    // Links should preserve child path when possible (e.g. course-assignments)
    const bsedLink = menuItems.find((item) => item.textContent?.includes("BSED"));
    expect(bsedLink).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/course-assignments"
    );
  });

  it("renders in Topbar header when multi-program program head is active", () => {
    render(
      <AppearanceProvider enabled={false}>
        <Topbar
          roles={["PROGRAM_HEAD"]}
          authorizedPrograms={programs}
          user={{ name: "Program Head", email: "ph@example.com" }}
        />
      </AppearanceProvider>
    );

    const triggers = screen.getAllByRole("button", { name: "Switch program" });
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers[0]).toHaveTextContent("BSIT");
  });

  it("does not render in Topbar header for single-program program heads", () => {
    render(
      <AppearanceProvider enabled={false}>
        <Topbar
          roles={["PROGRAM_HEAD"]}
          authorizedPrograms={[programs[0]]}
          user={{ name: "Program Head", email: "ph@example.com" }}
        />
      </AppearanceProvider>
    );

    expect(screen.queryByRole("button", { name: "Switch program" })).not.toBeInTheDocument();
  });
});
