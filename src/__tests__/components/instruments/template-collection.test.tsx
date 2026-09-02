import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TemplateCollection, type TemplateCollectionItem } from "@/features/instruments/components/template-collection";

function makeItem(overrides: Partial<TemplateCollectionItem> = {}): TemplateCollectionItem {
  return {
    id: "template-1",
    name: "Program Evaluation",
    description: "Evaluation tool",
    templateType: "PROGRAM_WIDE",
    statusLabel: "Active",
    statusActive: true,
    origin: "program-owned",
    originLabel: "Program-owned",
    facultyAccessible: false,
    versionCount: 2,
    ...overrides,
  };
}

describe("TemplateCollection", () => {
  test("renders card anatomy with origin marker and badges", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[{ items: [makeItem()], renderFooterActions: () => <button>Edit</button> }]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.getByText("Program Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Program-owned")).toBeInTheDocument();
    expect(screen.getByText("Program-wide")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("2 versions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("renders the provenance dot with a text label (never color-only)", () => {
    const { container } = render(
      <TemplateCollection
        view="card"
        sections={[{ items: [makeItem({ origin: "institutional", originLabel: "Institutional baseline" })], renderFooterActions: () => null }]}
        empty={<p>Empty</p>}
      />
    );

    const dot = container.querySelector("span.bg-brand-accent");
    expect(dot).not.toBeNull();
    expect(screen.getByText("Institutional baseline")).toBeInTheDocument();
  });

  test("switches to list view geometry with the same columns", () => {
    render(
      <TemplateCollection
        view="list"
        sections={[{ items: [makeItem(), makeItem({ id: "t2", name: "Course Tool", templateType: "COURSE_BOUND", origin: "faculty-copy", originLabel: "My copy", versionCount: 1 })] , renderFooterActions: () => <button>Edit</button> }]}
        empty={<p>Empty</p>}
      />
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Source" })).toBeInTheDocument();
    expect(table.getByText("Course Tool")).toBeInTheDocument();
    expect(table.getByText("My copy")).toBeInTheDocument();
    expect(table.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  test("uses a compact card list instead of a wide table on mobile", () => {
    render(
      <TemplateCollection
        view="list"
        sections={[
          {
            heading: "My Templates",
            items: [makeItem({ origin: "faculty-copy", originLabel: "My copy" })],
            renderFooterActions: () => <button>Edit</button>,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    const mobileList = screen.getByRole("list", { name: "My Templates" });
    const desktopTable = screen.getByRole("table", { name: "My Templates" });

    expect(mobileList).toHaveClass("sm:hidden");
    expect(desktopTable.closest(".hidden.sm\\:block")).not.toBeNull();
    expect(within(mobileList).getByText("Program Evaluation")).toBeInTheDocument();
    expect(within(mobileList).getByText("My copy")).toBeInTheDocument();
    expect(within(mobileList).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("renders section headings and omits empty sections", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          { heading: "Program Templates", items: [makeItem()], renderFooterActions: () => null },
          { heading: "Institutional Baselines", items: [], renderFooterActions: () => null },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.getByText("Program Templates")).toBeInTheDocument();
    expect(screen.queryByText("Institutional Baselines")).not.toBeInTheDocument();
  });

  test("shows the empty state when no section has items", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[{ items: [], renderFooterActions: () => null }]}
        empty={<p>Nothing here yet.</p>}
      />
    );

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  test("renders overflow menu items when provided", async () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            items: [makeItem()],
            renderFooterActions: () => null,
            renderOverflowMenu: () => <button>Delete</button>,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.getAllByRole("button", { name: "Actions" })).toHaveLength(1);
  });

  test("omits overflow menu button when renderOverflowMenu returns null in card view", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            items: [makeItem()],
            renderFooterActions: () => null,
            renderOverflowMenu: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  test("omits overflow menu button when renderOverflowMenu returns null in list view", () => {
    render(
      <TemplateCollection
        view="list"
        sections={[
          {
            items: [makeItem()],
            renderFooterActions: () => null,
            renderOverflowMenu: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  test("renders footer actions and overflow menu together in list view", () => {
    render(
      <TemplateCollection
        view="list"
        sections={[
          {
            items: [makeItem()],
            renderFooterActions: () => <button>Edit</button>,
            renderOverflowMenu: () => <button>Delete</button>,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Actions" })).toHaveLength(2);
  });
});
