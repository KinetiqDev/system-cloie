import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";

const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: showToastMock,
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/design-system" }));
vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
    <img alt={props.alt ?? ""} {...props} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return <a {...props}>{children}</a>;
  },
  useLinkStatus: () => ({ pending: false }),
}));

import { DesignSystemShowcasePage } from "@/features/design-system/components/design-system-showcase-page";
import { SHOWCASE_SECTIONS } from "@/features/design-system/components/showcase-section-registry";
import { TokenReference } from "@/features/design-system/components/token-reference";
import { DataShowcase } from "@/features/design-system/components/data-showcase";
import { TableSelectionShowcase } from "@/features/design-system/components/table-selection-showcase";
import { NavigationShowcase } from "@/features/design-system/components/navigation-showcase";
import { ResponsiveShowcase } from "@/features/design-system/components/responsive-showcase";
import { SHOWCASE_PROGRAMS } from "@/features/design-system/data/showcase-fixtures";

describe("Design System Showcase page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a page heading and one section per registry entry with matching TOC anchors", () => {
    render(<DesignSystemShowcasePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Design System");

    const toc = screen.getByRole("navigation", { name: "Showcase sections" });
    const tocLinks = toc.querySelectorAll("a");
    expect(tocLinks.length).toBe(SHOWCASE_SECTIONS.length);

    for (const section of SHOWCASE_SECTIONS) {
      const sectionHeading = screen.getByRole("heading", { name: section.title });
      const sectionElement = sectionHeading.closest("section");
      expect(sectionElement).not.toBeNull();
      expect(sectionElement!.getAttribute("id")).toBe(section.id);
      expect(sectionHeading.getAttribute("aria-labelledby")).toBeNull();
      expect(sectionElement!.getAttribute("aria-labelledby")).toBe(`${section.id}-title`);

      const tocLink = Array.from(tocLinks).find((link) => link.textContent === section.title);
      expect(tocLink).toBeDefined();
      expect(tocLink!.getAttribute("href")).toBe(`#${section.id}`);
    }
  });

  it("renders every registered section component without throwing", () => {
    render(<DesignSystemShowcasePage />);
    for (const section of SHOWCASE_SECTIONS) {
      expect(screen.getByRole("heading", { name: section.title })).toBeInTheDocument();
    }
  });
});

describe("TokenReference", () => {
  it("renders the surface, status, radius, and type-scale blocks with semantic names", () => {
    render(<TokenReference />);

    expect(screen.getByText("Surface and interaction roles")).toBeInTheDocument();
    expect(screen.getByText("scrim")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("danger")).toBeInTheDocument();
    expect(screen.getByText("radius", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("display-md")).toBeInTheDocument();
    expect(screen.getByText("caption")).toBeInTheDocument();
  });
});

describe("DataShowcase", () => {
  it("renders one table row per fixture program with a status badge", () => {
    render(<DataShowcase />);

    for (const program of SHOWCASE_PROGRAMS) {
      expect(screen.getByText(program.name)).toBeInTheDocument();
      expect(screen.getByText(program.statusLabel)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Active")).not.toHaveLength(0);
  });
});

describe("TableSelectionShowcase", () => {
  it("selects all rows and reports the selection count", () => {
    render(<TableSelectionShowcase />);

    expect(screen.getByText(`0 of ${SHOWCASE_PROGRAMS.length} programs selected`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all programs" }));

    expect(
      screen.getByText(`${SHOWCASE_PROGRAMS.length} of ${SHOWCASE_PROGRAMS.length} programs selected`)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText(`0 of ${SHOWCASE_PROGRAMS.length} programs selected`)).toBeInTheDocument();
  });
});

describe("OverlayAndFeedbackShowcase", () => {
  it("opens and closes the reference dialog", async () => {
    render(<DesignSystemShowcasePage />);

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(document.querySelector(".bg-scrim")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fires the shared toast contract with each supported kind", () => {
    render(<DesignSystemShowcasePage />);

    fireEvent.click(screen.getByRole("button", { name: "Success toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Warning toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Error toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Information toast" }));

    expect(showToastMock).toHaveBeenCalledTimes(4);
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), "success");
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), "warning");
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), "error");
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), "information");
  });
});

describe("FormControlsShowcase", () => {
  it("surfaces field errors on invalid submit", async () => {
    render(<DesignSystemShowcasePage />);

    fireEvent.submit(screen.getByRole("form", { name: "Showcase reference form" }));

    await waitFor(() => {
      expect(screen.getByText("Choose a department.")).toBeInTheDocument();
      expect(screen.getByText("Choose a role.")).toBeInTheDocument();
      expect(screen.getByText("Enter at least 2 characters.")).toBeInTheDocument();
    });
  });

  it(
    "submits valid values and renders the reference submission summary",
    async () => {
      render(<DesignSystemShowcasePage />);

      fireEvent.change(screen.getByLabelText("Display name"), {
        target: { value: "Sample Reviewer" },
      });
      fireEvent.click(screen.getByRole("radio", { name: /Evaluator/ }));

      fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Arts and Sciences" })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Arts and Sciences" }));

      fireEvent.click(screen.getByRole("combobox", { name: "Plan" }));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Standard plan" })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Standard plan" }));

      fireEvent.submit(screen.getByRole("form", { name: "Showcase reference form" }));

      await waitFor(() => {
        expect(
          screen.getByText(/Submitted: Evaluator in Arts and Sciences/)
        ).toBeInTheDocument();
      });
    },
    10000
  );
});

describe("NavigationShowcase", () => {
  it("renders every role card from the real central declarations", () => {
    render(<NavigationShowcase />);

    for (const role of ["Secretary", "Dean", "Program Head", "Faculty", "Student", "Alumni", "Industry Partner"]) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Course Assignments").length).toBeGreaterThan(0);
    expect(screen.getByText("/secretary/users")).toBeInTheDocument();
    expect(screen.getAllByText("Bottom navigation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hamburger drawer").length).toBeGreaterThan(0);
  });

  it("marks the selected reference row current with sidebar roles and aria-current", () => {
    render(<NavigationShowcase />);

    const selected = screen.getByRole("link", { name: /Course Assignments/ });
    expect(selected).toHaveAttribute("aria-current", "page");
    expect(selected).toHaveClass("bg-sidebar-accent");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders the real interactive admin drawer", async () => {
    render(<NavigationShowcase />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open navigation menu" })[0]);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/secretary/users"
    );
  });
});

describe("ResponsiveShowcase", () => {
  it("renders the desktop, Dean rail, and mobile frames with real presentation rows", () => {
    render(<ResponsiveShowcase />);

    expect(screen.getByText(/Desktop · lg/)).toBeInTheDocument();
    expect(screen.getByText(/Dean icon rail/)).toBeInTheDocument();
    expect(screen.getByText(/Mobile · <md/)).toBeInTheDocument();

    expect(screen.getByRole("navigation", { name: "Desktop sidebar reference" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dean rail reference" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Respondent bottom navigation reference" })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/student/dashboard"
    );
    expect(screen.getByText("Reference User")).toBeInTheDocument();
  });

  it("applies the selected roles to the active desktop and rail rows", () => {
    render(<ResponsiveShowcase />);

    const desktopLinks = screen
      .getByRole("navigation", { name: "Desktop sidebar reference" })
      .querySelectorAll("a[aria-current='page']");
    expect(desktopLinks).toHaveLength(1);
    expect(desktopLinks[0]).toHaveClass("bg-sidebar-accent");

    const railLinks = screen
      .getByRole("navigation", { name: "Dean rail reference" })
      .querySelectorAll("a[aria-current='page']");
    expect(railLinks).toHaveLength(1);
    expect(railLinks[0]).toHaveClass("bg-sidebar-accent");
  });
});
