import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProgramHeadToolsPage } from "@/features/instruments/components/program-head-tools-page";
import type { ProgramHeadTemplateItem } from "@/features/instruments/services/manage-program-head-templates";
import type { ProgramHeadDeploymentItem } from "@/features/evaluations/services/list-program-head-deployments";
import type { InstitutionalBaselineItem } from "@/features/instruments/services/list-institutional-baselines";

const { routerPushMock, routerRefreshMock, showToastMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, refresh: routerRefreshMock }),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: showToastMock }));

const { duplicateTemplateActionMock } = vi.hoisted(() => ({
  duplicateTemplateActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/program-head-template-actions", () => ({
  duplicateTemplateAction: duplicateTemplateActionMock,
  toggleTemplateActiveAction: vi.fn().mockResolvedValue({ success: true }),
  deleteTemplateAction: vi.fn().mockResolvedValue({ success: true }),
}));

const { closeCentralDeploymentActionMock, reopenCentralDeploymentActionMock } = vi.hoisted(() => ({
  closeCentralDeploymentActionMock: vi.fn().mockResolvedValue({ success: true }),
  reopenCentralDeploymentActionMock: vi.fn().mockResolvedValue({
    success: true,
    data: {
      activationAt: new Date("2026-09-08T00:00:00.000Z"),
      deadlineAt: new Date("2027-01-01T10:00:00.000Z"),
    },
  }),
}));

vi.mock("@/lib/actions/central-deployment-actions", () => ({
  closeCentralDeploymentAction: closeCentralDeploymentActionMock,
  reopenCentralDeploymentAction: reopenCentralDeploymentActionMock,
}));

const template: ProgramHeadTemplateItem = {
  id: "template-1",
  code: "BSIT001",
  name: "BSIT Tool",
  description: "Program evaluation tool",
  template_type: "PROGRAM_WIDE",
  structure: {},
  is_active: true,
  is_faculty_accessible: false,
  program_id: "program-1",
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
  _count: { versions: 1 },
  latestVersion: null,
  isReadOnly: false,
};

const baseline: InstitutionalBaselineItem = {
  id: "baseline-1",
  code: "BASE001",
  name: "Institutional Tool",
  description: null,
  template_type: "PROGRAM_WIDE",
  is_active: true,
  is_faculty_accessible: false,
  structure: [],
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
};

const deployment: ProgramHeadDeploymentItem = {
  id: "deployment-1",
  templateName: "BSIT Tool",
  templateId: "template-1",
  programName: "Information Technology",
  programCode: "BSIT",
  majorName: null,
  yearLevelName: null,
  target_stakeholder: "STUDENT",
  status: "ACTIVE",
  termInstanceId: "term-1",
  termInstanceLabel: "Term 1",
  activation_at: new Date("2026-01-01"),
  deadline_at: null,
  created_at: new Date("2026-01-01"),
  assignmentCount: 10,
  responseCount: 5,
};

function renderPage() {
  return render(
    <ProgramHeadToolsPage
      templates={[template]}
      deployments={[deployment]}
      baselines={[baseline]}
      program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
    />
  );
}

describe("ProgramHeadToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/program-head/tools");
  });

  test("switches tabs locally without navigating to a new page", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Published" }));

    const publishedPanel = screen.getByRole("tabpanel");
    expect(within(publishedPanel).getByText("Term 1")).toBeVisible();
    expect(routerPushMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?tab=published");
    expect(window.history.state).toBeNull();
  });

  test("opens the published tab when a deep link requests it", () => {
    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
      />
    );

    const publishedPanel = screen.getByRole("tabpanel");
    expect(within(publishedPanel).getByText("Term 1")).toBeVisible();
  });

  test("opens published deployment details through the canonical response route", () => {
    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
      />
    );

    const detailsLink = screen.getByRole("link", { name: "View Details" });
    expect(detailsLink).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/responses/program-wide/deployment-1?from=tools"
    );
    expect(screen.queryByRole("dialog", { name: "BSIT Tool" })).not.toBeInTheDocument();
  });

  test("shows deployment details in the list-view accordion", () => {
    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
        initialView="list"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand BSIT Tool" }));

    expect(screen.getByText("5 of 10 submitted")).toBeVisible();
    expect(screen.getByRole("button", { name: "View evaluation details" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/responses/program-wide/deployment-1?from=tools"
    );
  });

  test("duplicates an institutional baseline directly into the selected program", async () => {
    duplicateTemplateActionMock.mockResolvedValue({ success: true });

    renderPage();
    const baselines = screen
      .getByRole("heading", { name: "Institutional Baselines" })
      .closest("section");
    expect(baselines).not.toBeNull();
    fireEvent.click(within(baselines!).getByRole("button", { name: "Duplicate" }));

    await waitFor(() => {
      expect(duplicateTemplateActionMock).toHaveBeenCalledWith("program-1", "baseline-1");
      expect(showToastMock).toHaveBeenCalledWith("Template duplicated successfully.");
      expect(routerRefreshMock).toHaveBeenCalledOnce();
    });
  });

  test("does not surface a stale operation error inside the delete confirmation", async () => {
    duplicateTemplateActionMock.mockResolvedValue({ success: false, error: "Duplicate failed." });

    renderPage();

    const programTemplates = screen
      .getByRole("heading", { name: "Program Templates" })
      .closest("section");
    expect(programTemplates).not.toBeNull();
    fireEvent.click(within(programTemplates!).getByRole("button", { name: "Duplicate" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith("Duplicate failed.", "error");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    const deleteItem = screen
      .getAllByRole("menuitem")
      .find((item) => item.textContent?.includes("Delete"));
    fireEvent.click(deleteItem!);
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Template" });
    expect(within(dialog).queryByText("Duplicate failed.")).not.toBeInTheDocument();
  });

  test("narrows published deployments by the initial target filter", () => {
    const alumniDeployment: ProgramHeadDeploymentItem = {
      ...deployment,
      id: "deployment-2",
      templateName: "BSIT Alumni Tool",
      target_stakeholder: "ALUMNI",
    };

    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment, alumniDeployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
        initialPublishedFilters={{
          periodId: null,
          courseId: null,
          target: "ALUMNI",
          query: "",
          status: "ALL",
        }}
      />
    );

    const publishedPanel = screen.getByRole("tabpanel");
    expect(within(publishedPanel).getByText("BSIT Alumni Tool")).toBeVisible();
    expect(within(publishedPanel).queryByText("BSIT Tool")).not.toBeInTheDocument();
  });

  test("ignores a stale period filter that matches no deployment", () => {
    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
        initialPublishedFilters={{
          periodId: "00000000-0000-4000-8000-000000000000",
          courseId: null,
          target: null,
          query: "",
          status: "ALL",
        }}
      />
    );

    expect(within(screen.getByRole("tabpanel")).getByText("BSIT Tool")).toBeVisible();
  });

  test("shows the reopen action only for closed deployments", () => {
    const closedDeployment: ProgramHeadDeploymentItem = {
      ...deployment,
      id: "deployment-closed",
      templateName: "BSIT Closed Tool",
      status: "CLOSED",
    };

    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[deployment, closedDeployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
      />
    );

    const publishedPanel = screen.getByRole("tabpanel");
    expect(within(publishedPanel).getByRole("button", { name: "Reopen Deployment" })).toBeVisible();
    expect(
      within(publishedPanel).getAllByRole("button", { name: "Close Deployment" })
    ).toHaveLength(1);
  });

  test("reopens a closed deployment with a new deadline", async () => {
    const closedDeployment: ProgramHeadDeploymentItem = {
      ...deployment,
      id: "deployment-closed",
      templateName: "BSIT Closed Tool",
      status: "CLOSED",
    };

    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[closedDeployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reopen Deployment" }));

    const dialog = await screen.findByRole("dialog", { name: "Reopen Deployment" });
    fireEvent.change(within(dialog).getByLabelText("New deadline"), {
      target: { value: "2027-06-01T10:00" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen Deployment" }));

    await waitFor(() => {
      expect(reopenCentralDeploymentActionMock).toHaveBeenCalledWith(
        "program-1",
        "deployment-closed",
        new Date("2027-06-01T10:00")
      );
      expect(showToastMock).toHaveBeenCalledWith("Deployment reopened successfully.");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Reopen Deployment" })).not.toBeInTheDocument();
    });
  });

  test("keeps the reopen dialog open when reopening fails", async () => {
    reopenCentralDeploymentActionMock.mockResolvedValueOnce({
      success: false,
      error: "Reopen failed.",
    });
    const closedDeployment: ProgramHeadDeploymentItem = {
      ...deployment,
      id: "deployment-closed",
      templateName: "BSIT Closed Tool",
      status: "CLOSED",
    };

    render(
      <ProgramHeadToolsPage
        templates={[template]}
        deployments={[closedDeployment]}
        baselines={[baseline]}
        program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
        initialTab="published"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reopen Deployment" }));

    const dialog = await screen.findByRole("dialog", { name: "Reopen Deployment" });
    fireEvent.change(within(dialog).getByLabelText("New deadline"), {
      target: { value: "2027-06-01T10:00" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen Deployment" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith("Reopen failed.", "error");
    });
    expect(screen.getByRole("dialog", { name: "Reopen Deployment" })).toBeInTheDocument();
  });
});
