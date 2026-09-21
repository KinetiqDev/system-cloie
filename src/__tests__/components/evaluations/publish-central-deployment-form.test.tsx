// fallow-ignore-file code-duplication
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { AcademicSemester, YearLevel } from "@prisma/client";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/program-head/programs/program-1/tools/publish",
  useSearchParams: () => new URLSearchParams(),
}));

import { PublishCentralDeploymentForm } from "@/features/evaluations/components/publish-central-deployment-form";
import type { CentralPublishReadiness } from "@/features/evaluations/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const templates = [{ id: "template-1", name: "BSIT Exit Survey", code: "TMPL-1" }];
const majors = [{ id: "major-1", name: "Computer Programming" }];
const termInstances: TermInstanceItem[] = [
  {
    id: "term-1",
    schoolYearId: "sy-1",
    schoolYearCode: "2025-2026",
    semester: AcademicSemester.FIRST,
    term: null,
    startDate: null,
    endDate: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const previewRespondent = {
  email: "alice@school.edu",
  name: "Alice Adams",
  programCode: "BSCS",
  studentId: "2024-0001",
  userId: "user-1",
  yearLevel: YearLevel.FIRST_YEAR as YearLevel | null,
};

const FULLY_BOUND_READINESS: CentralPublishReadiness = {
  templateId: "template-1",
  likertCount: 3,
  boundQuestionCount: 3,
  coveredGos: [{ code: "BSIT-GO1", description: "Communicate effectively" }],
  unboundQuestions: [],
  blockingError: null,
};

function renderForm(
  overrides: {
    previewAction?: Mock;
    publishAction?: Mock;
    readinessByTemplateId?: Record<string, CentralPublishReadiness>;
    readinessError?: string | null;
  } = {}
) {
  return render(
    <PublishCentralDeploymentForm
      templates={templates}
      yearLevels={[YearLevel.FIRST_YEAR, YearLevel.SECOND_YEAR]}
      majors={majors}
      programId="program-1"
      programLabel="BSCS — BS Computer Science"
      termInstances={termInstances}
      activeTermId="term-1"
      readinessByTemplateId={
        overrides.readinessByTemplateId ?? { "template-1": FULLY_BOUND_READINESS }
      }
      readinessError={overrides.readinessError ?? null}
      previewAction={
        overrides.previewAction ?? vi.fn().mockResolvedValue({ success: true, data: [] })
      }
      publishAction={
        overrides.publishAction ?? vi.fn().mockResolvedValue({ success: true, data: {} })
      }
    />
  );
}

async function selectTemplate() {
  fireEvent.click(screen.getByRole("combobox", { name: "Evaluation Template" }));
  const option = await screen.findByRole("option", { name: /BSIT Exit Survey/ });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

async function fillNameAndSelectTemplate() {
  fireEvent.change(screen.getByLabelText("Deployed Evaluation Name"), {
    target: { value: "BSIT Exit Survey 2026" },
  });
  await selectTemplate();
}

describe("PublishCentralDeploymentForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the deployment configuration form with semantic labels", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: /publish evaluation tool/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Evaluation Template" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Academic Term" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Students" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Alumni" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Industry Partners" })).toBeInTheDocument();
  });

  it("names the unbound Likert questions of the selected template", async () => {
    renderForm({
      readinessByTemplateId: {
        "template-1": {
          ...FULLY_BOUND_READINESS,
          boundQuestionCount: 2,
          unboundQuestions: [
            {
              itemKey: "q-3",
              prompt: "Overall satisfaction with the program",
              sectionKey: "overall",
              sectionTitle: "Overall Assessment",
            },
          ],
        },
      },
    });

    expect(screen.queryByText("GO coverage")).not.toBeInTheDocument();

    await selectTemplate();

    expect(screen.getByRole("heading", { name: "GO coverage" })).toBeInTheDocument();
    expect(
      screen.getByText("2 of 3 Likert questions bound to a GO, covering 1 GO.")
    ).toBeInTheDocument();
    expect(screen.getByText("Overall Assessment")).toBeInTheDocument();
    expect(screen.getByText("Overall satisfaction with the program")).toBeInTheDocument();
    expect(
      screen.getByText(/publish as general evaluation items and give no GO evidence/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Assign GOs in the template editor" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/tools/template-1/edit"
    );
  });

  it("surfaces a readiness failure instead of hiding the coverage panel", () => {
    renderForm({ readinessError: "Unable to load GO coverage right now." });

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load GO coverage right now.");
  });

  it("shows the binding problem that still blocks publication", async () => {
    renderForm({
      readinessByTemplateId: {
        "template-1": {
          ...FULLY_BOUND_READINESS,
          boundQuestionCount: 2,
          blockingError:
            "One or more bound GOs are archived or no longer available. Update the template before publishing.",
          unboundQuestions: [
            {
              itemKey: "q-1",
              prompt: "The program prepared me for employment",
              sectionKey: "outcomes",
              sectionTitle: "Outcomes",
            },
          ],
        },
      },
    });

    await selectTemplate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "One or more bound GOs are archived or no longer available."
    );
    expect(screen.getByText("The program prepared me for employment")).toBeInTheDocument();
  });

  it("requires a template, term, and year level before previewing", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Deployed Evaluation Name"), {
      target: { value: "BSIT Exit Survey 2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please select a template to deploy.");

    await selectTemplate();
    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please select a target year level.");
  });

  it("shows a loading state with pending copy and aria-busy while previewing", async () => {
    const pending = deferred<{ success: true; data: (typeof previewRespondent)[] }>();
    const previewAction = vi.fn().mockReturnValue(pending.promise);
    renderForm({ previewAction });

    await fillNameAndSelectTemplate();
    fireEvent.click(screen.getByRole("combobox", { name: "Year Level" }));
    const yearOption = await screen.findByRole("option", { name: "1st Year" });
    fireEvent.mouseMove(yearOption);
    fireEvent.click(yearOption);

    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));

    const pendingButton = screen.getByRole("button", { name: "Loading preview..." });
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(pendingButton).toBeDisabled();

    pending.resolve({ success: true, data: [previewRespondent] });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /respondent preview/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/1 respondent\(s\) found/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.queryByText("Adams, Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("2024-0001")).not.toBeInTheDocument();
    expect(screen.queryByText(/student id/i)).not.toBeInTheDocument();
  });

  it("previews with the selected term, year level, and stakeholder", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [previewRespondent],
    });
    renderForm({ previewAction });

    await fillNameAndSelectTemplate();
    fireEvent.click(screen.getByRole("combobox", { name: "Year Level" }));
    const yearOption = await screen.findByRole("option", { name: "2nd Year" });
    fireEvent.mouseMove(yearOption);
    fireEvent.click(yearOption);

    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledWith({
        termInstanceId: "term-1",
        majorId: undefined,
        programId: "program-1",
        targetStakeholder: "STUDENT",
        yearLevel: YearLevel.SECOND_YEAR,
      });
    });
  });

  it("carries the selected major into the preview payload and final publish", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [previewRespondent],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: true,
      deploymentId: "deployment-1",
      assignmentCount: 1,
      status: "ACTIVE",
    });
    renderForm({ previewAction, publishAction });

    await fillNameAndSelectTemplate();
    fireEvent.click(screen.getByRole("combobox", { name: "Year Level" }));
    const yearOption = await screen.findByRole("option", { name: "1st Year" });
    fireEvent.mouseMove(yearOption);
    fireEvent.click(yearOption);

    fireEvent.click(screen.getByRole("combobox", { name: "Major" }));
    const majorOption = await screen.findByRole("option", { name: "Computer Programming" });
    fireEvent.mouseMove(majorOption);
    fireEvent.click(majorOption);

    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledWith(expect.objectContaining({ majorId: "major-1" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm and Publish" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and Publish" }));

    await waitFor(() => {
      expect(publishAction).toHaveBeenCalledTimes(1);
    });
    const formData = publishAction.mock.calls[0][0] as FormData;
    expect(formData.get("major_id")).toBe("major-1");
  });

  it("publishes only non-excluded respondents after curation", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [previewRespondent],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: true,
      deploymentId: "deployment-1",
      assignmentCount: 1,
      status: "ACTIVE",
    });
    renderForm({ previewAction, publishAction });

    await fillNameAndSelectTemplate();
    fireEvent.click(screen.getByRole("combobox", { name: "Year Level" }));
    const yearOption = await screen.findByRole("option", { name: "1st Year" });
    fireEvent.mouseMove(yearOption);
    fireEvent.click(yearOption);
    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm and Publish" })).toBeInTheDocument();
    });

    // Exclude the only respondent, then include them again
    fireEvent.click(screen.getByRole("checkbox", { name: "Include Alice Adams" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Include Alice Adams" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm and Publish" }));

    await waitFor(() => {
      expect(publishAction).toHaveBeenCalledTimes(1);
    });
    const formData = publishAction.mock.calls[0][0] as FormData;
    expect(JSON.parse(formData.get("respondent_ids") as string)).toEqual(["user-1"]);
    expect(formData.get("template_id")).toBe("template-1");
    expect(formData.get("term_instance_id")).toBe("term-1");
    expect(formData.get("year_level")).toBe("FIRST_YEAR");
    expect(formData.get("target_stakeholder")).toBe("STUDENT");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/program-head/programs/program-1/tools")
      );
    });
  });

  it("keeps the dialog open and explains the cause when publishing fails", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [previewRespondent],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: false,
      error: "The evaluation window overlaps an existing deployment.",
    });
    renderForm({ previewAction, publishAction });

    await fillNameAndSelectTemplate();
    fireEvent.click(screen.getByRole("combobox", { name: "Year Level" }));
    const yearOption = await screen.findByRole("option", { name: "1st Year" });
    fireEvent.mouseMove(yearOption);
    fireEvent.click(yearOption);
    fireEvent.click(screen.getByRole("button", { name: "Preview Respondents" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm and Publish" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and Publish" }));

    expect(
      await screen.findByText(/The evaluation window overlaps an existing deployment\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /respondent preview/i })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
