import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  TemplateCollection,
  type TemplateCollectionItem,
} from "@/features/instruments/components/template-collection";

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

/** A page with both sections filled, which is where duplicate search bars appeared. */
function renderTwoSectionCollection() {
  return render(
    <TemplateCollection
      view="card"
      sections={[
        {
          filterKey: "mine",
          heading: "My Templates",
          items: [makeItem({ origin: "faculty-copy", originLabel: "My copy" })],
          renderFooterActions: () => null,
        },
        {
          filterKey: "available",
          heading: "Available Templates",
          items: [
            makeItem({
              id: "template-2",
              name: "Institutional Baseline",
              origin: "institutional",
              originLabel: "Institutional baseline",
            }),
          ],
          renderFooterActions: () => null,
        },
      ]}
      empty={<p>Empty</p>}
    />
  );
}

describe("TemplateCollection", () => {
  test("renders card anatomy with origin marker and badges", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            filterKey: "section-card",
            items: [makeItem()],
            renderFooterActions: () => <button>Edit</button>,
          },
        ]}
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
        sections={[
          {
            filterKey: "section-1",
            items: [makeItem({ origin: "institutional", originLabel: "Institutional baseline" })],
            renderFooterActions: () => null,
          },
        ]}
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
        sections={[
          {
            filterKey: "section-2",
            items: [
              makeItem(),
              makeItem({
                id: "t2",
                name: "Course Tool",
                templateType: "COURSE_BOUND",
                origin: "faculty-copy",
                originLabel: "My copy",
                versionCount: 1,
              }),
            ],
            renderFooterActions: () => <button>Edit</button>,
          },
        ]}
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

  test("keeps list view as a horizontally scrollable table on mobile", () => {
    render(
      <TemplateCollection
        view="list"
        sections={[
          {
            filterKey: "section-3",
            heading: "My Templates",
            items: [makeItem({ origin: "faculty-copy", originLabel: "My copy" })],
            renderFooterActions: () => <button>Edit</button>,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    const table = screen.getByRole("table", { name: "My Templates" });
    const scrollRegion = table.closest('[data-slot="table-container"]');

    expect(table).toHaveClass("min-w-[44rem]");
    expect(scrollRegion).toHaveClass("overflow-x-auto");
    expect(scrollRegion?.parentElement).toHaveClass("max-h-[70dvh]", "overflow-y-auto");
    expect(scrollRegion).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("list", { name: "My Templates" })).not.toBeInTheDocument();
    expect(within(table).getByText("Program Evaluation")).toBeInTheDocument();
    expect(within(table).getByText("My copy")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("renders section headings and omits empty sections", () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            filterKey: "program-templates",
            heading: "Program Templates",
            items: [makeItem()],
            renderFooterActions: () => null,
          },
          {
            filterKey: "institutional-baselines",
            heading: "Institutional Baselines",
            items: [],
            renderFooterActions: () => null,
          },
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
        sections={[{ filterKey: "section-empty", items: [], renderFooterActions: () => null }]}
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
            filterKey: "section-4",
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
            filterKey: "section-5",
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
            filterKey: "section-6",
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
            filterKey: "section-7",
            items: [makeItem()],
            renderFooterActions: () => <button>Edit</button>,
            renderOverflowMenu: () => <button>Delete</button>,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Actions" })).toHaveLength(1);
  });

  test("filters a section by its Type column funnel", async () => {
    render(
      <TemplateCollection
        view="list"
        sections={[
          {
            filterKey: "type-filter",
            items: [
              makeItem(),
              makeItem({
                id: "template-2",
                name: "Course Tool",
                templateType: "COURSE_BOUND",
              }),
            ],
            renderFooterActions: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Filter Type/ }));
    fireEvent.click(await screen.findByRole("radio", { name: "Course-bound" }));

    expect(screen.getByText("Course Tool")).toBeInTheDocument();
    expect(screen.queryByText("Program Evaluation")).not.toBeInTheDocument();
  });

  test("narrows the page by the shared search box", async () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            filterKey: "search-filter",
            items: [
              makeItem(),
              makeItem({
                id: "template-2",
                name: "Ethics Survey",
                origin: "faculty-copy",
                originLabel: "My copy",
              }),
            ],
            renderFooterActions: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search templates" }), {
      target: { value: "ethics" },
    });

    // The box debounces, so the row disappears once the commit lands.
    await waitFor(() => {
      expect(screen.queryByText("Program Evaluation")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Ethics Survey")).toBeInTheDocument();
  });

  test("offers exactly one search box for two sections on one page", () => {
    renderTwoSectionCollection();
    // Two identical search boxes in one viewport read as two forms.
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
  });

  test("one page search narrows every section at once", async () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            filterKey: "mine",
            heading: "My Templates",
            items: [makeItem({ origin: "faculty-copy", originLabel: "My copy" })],
            renderFooterActions: () => null,
          },
          {
            filterKey: "available",
            heading: "Available Templates",
            items: [
              makeItem({
                id: "template-2",
                name: "Institutional Baseline",
                origin: "institutional",
                originLabel: "Institutional baseline",
              }),
            ],
            renderFooterActions: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search templates" }), {
      target: { value: "nothing-matches-this" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Program Evaluation")).not.toBeInTheDocument();
      expect(screen.queryByText("Institutional Baseline")).not.toBeInTheDocument();
    });
  });

  test("keeps two sections' facet narrowing independent", async () => {
    render(
      <TemplateCollection
        view="card"
        sections={[
          {
            filterKey: "mine",
            heading: "My Templates",
            items: [makeItem({ origin: "faculty-copy", originLabel: "My copy" })],
            renderFooterActions: () => null,
          },
          {
            filterKey: "available",
            heading: "Available Templates",
            items: [
              makeItem({
                id: "template-2",
                name: "Institutional Baseline",
                origin: "institutional",
                originLabel: "Institutional baseline",
              }),
            ],
            renderFooterActions: () => null,
          },
        ]}
        empty={<p>Empty</p>}
      />
    );

    // Narrow only the first section; its sibling must be untouched.
    const sheetTriggers = screen.getAllByRole("button", { name: "Filters" });
    fireEvent.click(sheetTriggers[0]);
    const sheet = await screen.findByRole("dialog");
    // The section's own Status facet, whose options come from its own items:
    // only "Active" exists here, so choosing it is a real narrowing while a
    // missing option would prove nothing.
    fireEvent.click(within(sheet).getByRole("radio", { name: "Active" }));
    expect(screen.getByText("Program Evaluation")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("radio", { name: "All statuses" }));
    // The sibling section still shows its row, because the facet belonged to
    // the first section alone.
    expect(screen.getByText("Institutional Baseline")).toBeInTheDocument();
  });
});
