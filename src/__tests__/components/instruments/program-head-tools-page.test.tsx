import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProgramHeadToolsPage } from "@/features/instruments/components/program-head-tools-page";
import type { ProgramHeadTemplateItem } from "@/features/instruments/services/manage-program-head-templates";
import type { ProgramHeadDeploymentItem } from "@/features/evaluations/services/list-program-head-deployments";
import type { InstitutionalBaselineItem } from "@/features/instruments/services/list-institutional-baselines";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

const { duplicateTemplateActionMock } = vi.hoisted(() => ({
  duplicateTemplateActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/program-head-template-actions", () => ({
  duplicateTemplateAction: duplicateTemplateActionMock,
  toggleTemplateActiveAction: vi.fn().mockResolvedValue({ success: true }),
  deleteTemplateAction: vi.fn().mockResolvedValue({ success: true }),
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
  });

  test("does not surface a stale operation error inside the delete confirmation", async () => {
    duplicateTemplateActionMock.mockResolvedValue({ success: false, error: "Duplicate failed." });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /duplicate/i }));

    await waitFor(() => {
      expect(screen.getByText("Duplicate failed.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    const deleteItem = screen
      .getAllByRole("menuitem")
      .find((item) => item.textContent?.includes("Delete"));
    fireEvent.click(deleteItem!);

    const dialog = await screen.findByRole("alertdialog", { name: "Delete Template" });
    expect(within(dialog).queryByText("Duplicate failed.")).not.toBeInTheDocument();
  });
});
