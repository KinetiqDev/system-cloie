import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentEvaluationListItem } from "@/features/responses/types";

const { sessionMock, listEvaluationsMock, userFindMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  listEvaluationsMock: vi.fn(),
  userFindMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: sessionMock,
}));

vi.mock("@/features/responses/services/list-stakeholder-evaluations", () => ({
  listStakeholderEvaluations: listEvaluationsMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { user: { findUnique: userFindMock } },
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
    href: "/student/evaluations/1",
    progress: 0,
    ...overrides,
  } as StudentEvaluationListItem;
}

async function renderDashboard() {
  return render(await StakeholderDashboardPage({ portal: ALUMNI_PORTAL }));
}

describe("Stakeholder dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ userId: "user-1" });
    userFindMock.mockResolvedValue({ name: "Amara Reyes" });
  });

  it("greets the account's canonical name, never an email-derived one", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [], submitted: [] });

    await renderDashboard();

    expect(screen.getByRole("heading", { name: /Welcome, Amara Reyes/i })).toBeInTheDocument();
    expect(screen.getByText("Alumni Portal")).toBeInTheDocument();
  });

  it("falls back to the portal's own label when the account has no stored name", async () => {
    userFindMock.mockResolvedValue(null);
    listEvaluationsMock.mockResolvedValue({ active: [], submitted: [] });

    await renderDashboard();

    expect(screen.getByRole("heading", { name: /Welcome, Alumni/i })).toBeInTheDocument();
  });

  it("offers the resume card with progress for an evaluation in progress", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "IN_PROGRESS", progress: 40, href: "/student/evaluations/9" })],
      submitted: [],
    });

    await renderDashboard();

    expect(screen.getByRole("heading", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByText("40% complete")).toBeInTheDocument();
    const resume = screen.getByText("Resume").closest("a");
    expect(resume).toHaveAttribute("href", "/student/evaluations/9");
  });

  it("starts an evaluation that is not yet in progress", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "DUE_SOON" })],
      submitted: [],
    });

    await renderDashboard();

    expect(screen.getByText("Start Evaluation").closest("a")).toHaveAttribute(
      "href",
      "/student/evaluations/1"
    );
    expect(screen.queryByText(/% complete/)).not.toBeInTheDocument();
  });

  it("hides the resume card when nothing is in progress", async () => {
    listEvaluationsMock.mockResolvedValue({
      active: [item({ status: "NOT_STARTED" })],
      submitted: [],
    });

    await renderDashboard();

    expect(screen.queryByRole("heading", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("explains an empty pending list rather than rendering a blank grid", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [], submitted: [] });

    await renderDashboard();

    expect(screen.getByText("No pending evaluations")).toBeInTheDocument();
  });

  it("links each portal's pending list to that portal's own evaluations route", async () => {
    listEvaluationsMock.mockResolvedValue({ active: [item({})], submitted: [] });

    render(await StakeholderDashboardPage({ portal: INDUSTRY_PARTNER_PORTAL }));

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute(
      "href",
      "/industry-partner/evaluations"
    );
    expect(screen.getByText("Industry Partner Portal")).toBeInTheDocument();
  });
});
