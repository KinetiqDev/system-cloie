import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramHeadSwitcher } from "@/features/auth/components/program-head-switcher";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameMock() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const programs = [
  { id: "program-1", code: "BEED", name: "Elementary Education" },
  { id: "program-2", code: "BSED", name: "Secondary Education" },
  { id: "program-3", code: "BSHM", name: "Hospitality Management" },
];

describe("ProgramHeadSwitcher", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
  });

  it("renders nothing for a single assigned Program", () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-1/dashboard");
    render(<ProgramHeadSwitcher programs={[programs[0]]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders nothing when no Program context is present in the pathname", () => {
    pathnameMock.mockReturnValue("/program-head");
    render(<ProgramHeadSwitcher programs={programs} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the active Program and marks it in the dropdown", async () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/analytics");
    render(<ProgramHeadSwitcher programs={programs} />);

    const trigger = screen.getByRole("button", { name: /Switch Program/ });
    expect(trigger).toHaveTextContent("BSED");

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    const activeItem = screen.getByRole("menuitem", { name: /BSED/ });
    expect(activeItem).toHaveAttribute("aria-current", "page");
  });

  it("preserves the current child page when switching Programs", async () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2/analytics");
    render(<ProgramHeadSwitcher programs={programs} />);

    fireEvent.click(screen.getByRole("button", { name: /Switch Program/ }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    const beedItem = screen.getByRole("menuitem", { name: /BEED/ });
    expect(beedItem).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/analytics"
    );
    const bshmItem = screen.getByRole("menuitem", { name: /BSHM/ });
    expect(bshmItem).toHaveAttribute(
      "href",
      "/program-head/programs/program-3/analytics"
    );
  });

  it("links to the other Program's dashboard from the Program root path", async () => {
    pathnameMock.mockReturnValue("/program-head/programs/program-2");
    render(<ProgramHeadSwitcher programs={programs} />);

    fireEvent.click(screen.getByRole("button", { name: /Switch Program/ }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    expect(screen.getByRole("menuitem", { name: /BEED/ })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/dashboard"
    );
  });
});
