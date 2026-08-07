import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

describe("Landing page", () => {
  it("renders both portal choice cards with preserved copy and hrefs", () => {
    render(<Home />);

    expect(screen.getByText("Welcome to System CLOIE")).toBeInTheDocument();
    expect(screen.getByText("Select your portal to sign in or register.")).toBeInTheDocument();
    expect(screen.getByText("ACD Staff & Faculty")).toBeInTheDocument();
    expect(screen.getByText("Students, Alumni & Partners")).toBeInTheDocument();

    const staffCard = screen.getByRole("link", { name: /ACD Staff & Faculty/i });
    const respondentCard = screen.getByRole("link", { name: /Students, Alumni & Partners/i });
    expect(staffCard.getAttribute("href")).toBe("/portal/staff");
    expect(respondentCard.getAttribute("href")).toBe("/portal/respondents");
  });

  it("keeps the two-column desktop card grid", () => {
    const { container } = render(<Home />);
    const grid = container.querySelector(".md\\:grid-cols-2");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-1");
  });

  it("uses semantic muted text instead of legacy text tokens", () => {
    const { container } = render(<Home />);
    expect(container.querySelector(".text-text-muted")).toBeNull();
    expect(container.querySelector(".text-text-secondary")).toBeNull();
    expect(container.querySelector(".text-text-primary")).toBeNull();
  });

  it("uses no decorative glow, blur, or colored shadows", () => {
    const { container } = render(<Home />);
    const classStrings = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(classStrings).not.toMatch(/radial-gradient/);
    expect(classStrings).not.toMatch(/(^|\s)blur-/);
    expect(classStrings).not.toMatch(/shadow-primary|shadow-danger|shadow-warning|shadow-success|shadow-info/);
  });
});
