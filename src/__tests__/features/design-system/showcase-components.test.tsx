import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: showToastMock,
}));

import { DesignSystemShowcasePage } from "@/features/design-system/components/design-system-showcase-page";
import { SHOWCASE_SECTIONS } from "@/features/design-system/components/showcase-section-registry";
import { TokenReference } from "@/features/design-system/components/token-reference";
import { DataShowcase } from "@/features/design-system/components/data-showcase";
import { TableSelectionShowcase } from "@/features/design-system/components/table-selection-showcase";
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

    expect(
      screen.getByText(`0 of ${SHOWCASE_PROGRAMS.length} programs selected`)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all programs" }));

    expect(
      screen.getByText(
        `${SHOWCASE_PROGRAMS.length} of ${SHOWCASE_PROGRAMS.length} programs selected`
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(
      screen.getByText(`0 of ${SHOWCASE_PROGRAMS.length} programs selected`)
    ).toBeInTheDocument();
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

describe("ChartShowcase", () => {
  it("renders reference charts with legend, insight, and exact-value tables", () => {
    render(<DesignSystemShowcasePage />);

    expect(screen.getByRole("heading", { name: "Charts" })).toBeInTheDocument();
    expect(screen.getByText("Mean Attainment by Stakeholder")).toBeInTheDocument();
    expect(screen.getByText("Student (128 responses)")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Highest mean: Instructor \(4\.65\)\. Lowest mean: Industry Partner \(3\.86\)\./
      )
    ).toHaveLength(2);
    expect(screen.getAllByText("View exact values").length).toBeGreaterThan(0);
  });

  it("hatches the seventh bar and sixth pie slice with deterministic patterns", () => {
    render(<DesignSystemShowcasePage />);

    expect(document.querySelector('[id^="stakeholder-mean-"][id$="-hatch-0-c1"]')).not.toBeNull();
    const barPatterns = document.querySelectorAll(
      '[id^="mean-bar-"][id$="-hatch-0-c1"], [id^="mean-bar-"][id$="-hatch-1-c1"]'
    );
    expect(barPatterns.length).toBe(2);
    expect(
      document.querySelector(
        '[id^="stakeholder-mean-"][id$="-hatch-0-c0"], [id^="stakeholder-mean-"][id$="-hatch-1-c0"], [id^="stakeholder-mean-"][id$="-hatch-2-c0"], [id^="stakeholder-mean-"][id$="-hatch-3-c0"], [id^="stakeholder-mean-"][id$="-hatch-4-c0"]'
      )
    ).not.toBeNull();
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

  it("submits valid values and renders the reference submission summary", async () => {
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
      expect(screen.getByText(/Submitted: Evaluator in Arts and Sciences/)).toBeInTheDocument();
    });
  });
});
