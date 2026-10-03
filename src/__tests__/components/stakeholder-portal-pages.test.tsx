import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentEvaluationListItem } from "@/features/responses/types";

const { listEvaluationsMock } = vi.hoisted(() => ({
  listEvaluationsMock: vi.fn(),
}));

vi.mock("@/features/responses/services/list-stakeholder-evaluations", () => ({
  listStakeholderEvaluations: listEvaluationsMock,
}));

import {
  ALUMNI_PORTAL,
  INDUSTRY_PARTNER_PORTAL,
  StakeholderDashboardPage,
} from "@/components/stakeholder-portal-pages";

function item(overrides: Partial<StudentEvaluationListItem>): StudentEvaluationListItem {
  return {
    assignmentId: "assignment-1",
    evaluationTitle: "Exit Survey",
    programLabel: "BSIT",
    courseTitle: null,
    deadlineAt: null,
    deploymentType: "CENTRAL",
    status: "NOT_STARTED",
    href: "/alumni/evaluations/1",
    progress: 0,
    ...overrides,
  } as StudentEvaluationListItem;
}

function precedes(first: Element, second: Element): boolean {
  const relation: number = first.compareDocumentPosition(second);
  return (relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

async function renderDashboard() {
  return render(await StakeholderDashboardPage({ portal: ALUMNI_PORTAL }));
}

describe("Stakeholder dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("heads the dashboard with the portal's own title and no greeting", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [], submitted: [] });

    await renderDashboard();

    expect(screen.getByRole("heading", { level: 1, name: "Alumni Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
  });

  it("offers the resume card with answers given for an evaluation in progress", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "IN_PROGRESS", progress: 40, href: "/alumni/evaluations/9" })],
      submitted: [],
    });

    await renderDashboard();

    expect(screen.getByRole("heading", { level: 2, name: "Continue" })).toBeInTheDocument();
    expect(screen.getByText("40% answered · not submitted")).toBeInTheDocument();
    expect(screen.getByText("Resume").closest("a")).toHaveAttribute(
      "href",
      "/alumni/evaluations/9"
    );
  });

  it("puts the startable list above the status summary when no draft exists", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "DUE_SOON" })],
      submitted: [],
    });

    await renderDashboard();

    const pendingSection = screen.getByRole("heading", {
      level: 2,
      name: "Pending Evaluations",
    });
    const summary = screen.getByRole("region", { name: "Evaluation status summary" });
    expect(precedes(pendingSection, summary)).toBe(true);
    expect(screen.getByText("Start Evaluation").closest("a")).toHaveAttribute(
      "href",
      "/alumni/evaluations/1"
    );
    expect(screen.queryByText(/% answered/)).not.toBeInTheDocument();
  });

  it("leads with Resume and names the trailing backlog once a draft exists", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [
        item({ status: "IN_PROGRESS", progress: 10 }),
        item({ assignmentId: "assignment-2", status: "NOT_STARTED" }),
      ],
      submitted: [],
    });

    await renderDashboard();

    const resume = screen.getByRole("heading", { level: 2, name: "Continue" });
    const summary = screen.getByRole("region", { name: "Evaluation status summary" });
    expect(precedes(resume, summary)).toBe(true);
    expect(screen.getByRole("heading", { level: 2, name: "Waiting to Start" })).toBeInTheDocument();
  });

  it("counts a draft as in progress, never as pending", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [
        item({ assignmentId: "draft", status: "IN_PROGRESS", progress: 10 }),
        item({ assignmentId: "a", status: "NOT_STARTED" }),
        item({ assignmentId: "b", status: "DUE_SOON" }),
      ],
      submitted: [item({ assignmentId: "done", status: "SUBMITTED" })],
    });

    await renderDashboard();

    expect(screen.getByRole("link", { name: "Pending: 2" })).toHaveAttribute(
      "href",
      "/alumni/evaluations?tab=pending"
    );
    expect(screen.getByRole("link", { name: "In Progress: 1" })).toHaveAttribute(
      "href",
      "/alumni/evaluations?tab=in-progress"
    );
    expect(screen.getByRole("link", { name: "Completed: 1" })).toHaveAttribute(
      "href",
      "/alumni/evaluations?tab=submitted"
    );
  });

  it("tells a respondent with only a draft that nothing is waiting to be started", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "IN_PROGRESS", progress: 10 })],
      submitted: [],
    });

    await renderDashboard();

    expect(screen.getByText("Nothing waiting to be started")).toBeInTheDocument();
    expect(screen.queryByText(/no active evaluations/i)).not.toBeInTheDocument();
  });

  it("explains an empty pending list rather than rendering a blank grid", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [], submitted: [] });

    await renderDashboard();

    expect(screen.getByText("No pending evaluations")).toBeInTheDocument();
  });

  it("links each portal's pending list to that portal's own pending tab", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [item({})], submitted: [] });

    render(await StakeholderDashboardPage({ portal: INDUSTRY_PARTNER_PORTAL }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Industry Partner Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute(
      "href",
      "/industry-partner/evaluations?tab=pending"
    );
  });
});
