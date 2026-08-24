import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PublishedDeploymentsCollection,
  type PublishedDeploymentItem,
} from "@/features/evaluations/components/published-deployments-collection";

function makeItem(overrides: Partial<PublishedDeploymentItem> = {}): PublishedDeploymentItem {
  return {
    id: "deployment-1",
    name: "Student Satisfaction Survey",
    courseLabel: null,
    targetLabel: "Students",
    periodLabel: "AY 2026-2027 1st Semester",
    status: "ACTIVE",
    responseCount: 8,
    totalCount: 10,
    publishedDate: new Date("2026-08-01"),
    canClose: true,
    ...overrides,
  };
}

const NOOP_MENU = () => <></>;

function matchText(text: string) {
  return (content: string) => content === text;
}

describe("PublishedDeploymentsCollection", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  test("renders list view table with unified columns", () => {
    render(
      <PublishedDeploymentsCollection
        view="list"
        items={[makeItem()]}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Target" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Academic Period" })).toBeInTheDocument();
    expect(table.getByText("Student Satisfaction Survey")).toBeInTheDocument();
    expect(table.getByText("8 / 10")).toBeInTheDocument();
    expect(table.getByText("Aug 1, 2026")).toBeInTheDocument();
  });

  test("hides the course column when no item has a course label", () => {
    render(
      <PublishedDeploymentsCollection
        view="list"
        items={[makeItem()]}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    expect(screen.queryByRole("columnheader", { name: "Course" })).not.toBeInTheDocument();
  });

  test("shows the course column when at least one item is course-bound", () => {
    render(
      <PublishedDeploymentsCollection
        view="list"
        items={[makeItem({ courseLabel: "CS101 · Intro to Computing" })]}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Course" })).toBeInTheDocument();
    expect(screen.getByText("CS101 · Intro to Computing")).toBeInTheDocument();
  });

  test("renders card view grid with responses summary", () => {
    render(
      <PublishedDeploymentsCollection
        view="card"
        items={[makeItem()]}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Student Satisfaction Survey")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("8 / 10")).toBeInTheDocument();
  });

  test("filters by status and paginates", () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      makeItem({
        id: `d-${i}`,
        name: `Deployment ${i}`,
        status: i % 2 === 0 ? "ACTIVE" : "CLOSED",
      })
    );

    render(
      <PublishedDeploymentsCollection
        view="list"
        items={items}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Closed" }));

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Deployment 1")).toBeInTheDocument();
    expect(screen.queryByText("Deployment 0")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Deployment 0")).toBeInTheDocument();
    expect(screen.queryByText("Deployment 10")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1–10 of 12 deployments/i)).toBeInTheDocument();
  });

  test("expands a row to show role-provided details", () => {
    render(
      <PublishedDeploymentsCollection
        view="list"
        items={[makeItem({ id: "d-1", name: "Survey" })]}
        empty={<p>Empty</p>}
        renderExpanded={() => <p>Deployment details here</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    fireEvent.click(screen.getByText("Survey"));

    expect(screen.getByText("Deployment details here")).toBeInTheDocument();
  });

  test("renders the empty state when there are no deployments", () => {
    render(
      <PublishedDeploymentsCollection
        view="list"
        items={[]}
        empty={<p>No published tools yet.</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    expect(screen.getByText("No published tools yet.")).toBeInTheDocument();
  });

  test("shows an empty-match message for filters without results", () => {
    render(
      <PublishedDeploymentsCollection
        view="card"
        items={[makeItem({ status: "ACTIVE" })]}
        empty={<p>Empty</p>}
        renderMenuItems={NOOP_MENU}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));

    expect(screen.getByText(/No archived deployments found/i)).toBeInTheDocument();
  });
});
