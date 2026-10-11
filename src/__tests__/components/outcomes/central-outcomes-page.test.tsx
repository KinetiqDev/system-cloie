import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";

import { CentralOutcomesPage } from "@/features/outcomes/components/central-outcomes-page";
import {
  reviewCentralOutcomeAction,
  commitCentralOutcomeAction,
} from "@/lib/actions/central-outcome-actions";

const routerRefreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("@/lib/actions/central-outcome-actions", () => ({
  reviewCentralOutcomeAction: vi.fn(),
  commitCentralOutcomeAction: vi.fn(),
}));

const reviewMock = vi.mocked(reviewCentralOutcomeAction);
const commitMock = vi.mocked(commitCentralOutcomeAction);

const CREATED = new Date("2026-01-01");
const COMMON_ONE = {
  id: "common-1",
  code: "CPO-1",
  description: "Communicate effectively.",
  source_ref: "University bulletin 2026",
  order: 0,
  is_active: true,
  created_at: CREATED,
  updated_at: CREATED,
  _count: { program_pos: 2, ge_mappings: 3 },
};
const COMMON_TWO = {
  id: "common-2",
  code: "CPO-2",
  description: "Work effectively in teams.",
  source_ref: null,
  order: 1,
  is_active: false,
  created_at: CREATED,
  updated_at: CREATED,
  _count: { program_pos: 0, ge_mappings: 0 },
};
const INSTITUTION_PO = {
  id: "po-1",
  code: "PO-1",
  description: "Institutional outcome one",
  classification: "INSTITUTION_SPECIFIC" as const,
  common_outcome_id: null,
  is_active: true,
};
const COMMON_ADOPTION = {
  id: "po-2",
  code: "PO-2",
  description: "Communicate effectively.",
  classification: "COMMON" as const,
  common_outcome_id: "common-1",
  is_active: true,
};
const UNCLASSIFIED_PO = {
  id: "po-3",
  code: "PO-3",
  description: "Legacy row statement",
  classification: "UNCLASSIFIED" as const,
  common_outcome_id: null,
  is_active: true,
};

const PROGRAMS = [
  {
    id: "program-1",
    code: "BSCS",
    name: "BS Computer Science",
    pos: [INSTITUTION_PO, COMMON_ADOPTION, UNCLASSIFIED_PO],
  },
  { id: "program-2", code: "BSED", name: "BS Education", pos: [] },
];

function catalogRow(code: string) {
  const row = screen.getByText(code).closest("li");
  if (!row) throw new Error(`No catalog row for ${code}`);
  return within(row);
}

function programRow(code: string) {
  const row = screen.getByText(code).closest("article");
  if (!row) throw new Error(`No program outcome row for ${code}`);
  return within(row);
}

function renderPage(data = { common: [COMMON_ONE, COMMON_TWO], programs: PROGRAMS }) {
  return render(<CentralOutcomesPage data={data} />);
}

describe("CentralOutcomesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewMock.mockResolvedValue({
      success: true,
      data: {
        input: { kind: "COMMON_PO", action: "archive", id: "common-1" },
        before: { code: "CPO-1", is_active: true },
        after: { code: "CPO-1", is_active: false },
        freshnessToken: "{}",
        signature: "sig",
      },
    });
    commitMock.mockResolvedValue({ success: true, data: { id: "common-1" } });
  });

  it("renders each central definition with its adoption and GE mapping counts", () => {
    renderPage();

    const active = catalogRow("CPO-1");
    expect(active.getByText("2 program adoptions · 3 GE mappings")).toBeInTheDocument();
    expect(active.getByText("University bulletin 2026")).toBeInTheDocument();
    expect(active.getByText("Active")).toBeInTheDocument();

    const archived = catalogRow("CPO-2");
    expect(archived.getByText("Archived")).toBeInTheDocument();
    expect(archived.getByRole("button", { name: "Restore" })).toBeEnabled();
  });

  it("labels a legacy unclassified row instead of hiding it from every manager", () => {
    renderPage();

    expect(programRow("PO-3").getByText("Needs classification")).toBeInTheDocument();
  });

  it("prompts for a central definition before anything can adopt or map it", () => {
    renderPage({ common: [], programs: PROGRAMS });

    expect(
      screen.getByText(
        "No Common POs yet. Add a shared definition before adopting it or mapping GE CILOs."
      )
    ).toBeInTheDocument();
  });

  it("disables Move up on the first catalog row so ordering cannot wrap", () => {
    renderPage();

    const moveUp = screen.getAllByRole("button", { name: "Move up" });
    expect(moveUp[0]).toBeDisabled();
    expect(moveUp[1]).toBeEnabled();
  });

  it("reorders the catalog by submitting the swapped id order", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Move up" })[1]);
    });

    expect(reviewMock).toHaveBeenCalledWith({
      kind: "COMMON_PO",
      action: "reorder",
      orderedIds: ["common-2", "common-1"],
    });
  });

  it("adopts a shared statement from the central definition rather than the local form", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(programRow("PO-2").getByRole("button", { name: "Edit" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Review program PO" }));
    });

    expect(reviewMock).toHaveBeenCalledWith({
      kind: "PO",
      action: "update",
      id: "po-2",
      programId: "program-1",
      code: "PO-2",
      description: "Communicate effectively.",
      classification: "COMMON",
      commonOutcomeId: "common-1",
    });
  });

  it("authors a local statement for a legacy row and offers no shared link", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(programRow("PO-3").getByRole("button", { name: "Edit" }));
    });

    // ADR 0040: a legacy row loads as Institution-specific so the reviewer
    // authors a real statement, and it never arrives pre-linked to a Common PO.
    expect(screen.getByLabelText("Program outcome statement")).toBeInTheDocument();
    expect(screen.queryByLabelText("Shared Common PO")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Review program PO" }));
    });

    expect(reviewMock).toHaveBeenCalledWith({
      kind: "PO",
      action: "update",
      id: "po-3",
      programId: "program-1",
      code: "PO-3",
      description: "Legacy row statement",
      classification: "INSTITUTION_SPECIFIC",
      commonOutcomeId: null,
    });
  });

  it("warns that archiving a central definition makes dependent GE courses incomplete", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });

    expect(reviewMock).toHaveBeenCalledWith({
      kind: "COMMON_PO",
      action: "archive",
      id: "common-1",
    });
    expect(
      screen.getByText(/become incomplete\. New publication will be blocked/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Linked local POs stay active/)).toBeInTheDocument();
  });

  it("commits the reviewed change only on confirmation, then refreshes", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    });

    expect(commitMock).toHaveBeenCalledWith(expect.objectContaining({ signature: "sig" }), true);
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalled());
  });

  it("shows the exact before and after the confirmation will apply", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });

    expect(screen.getByText(/"is_active": true/)).toBeInTheDocument();
    expect(screen.getByText(/"is_active": false/)).toBeInTheDocument();
  });

  it("surfaces a rejected review without offering a confirmation", async () => {
    reviewMock.mockResolvedValue({
      success: false,
      error: "Submission closes the archive window.",
    });
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });

    expect(commitMock).not.toHaveBeenCalled();
    expect(screen.getByText("Submission closes the archive window.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm change" })).not.toBeInTheDocument();
  });

  it("keeps the review open when the commit is refused", async () => {
    commitMock.mockResolvedValue({ success: false, error: "Outcome record was not found." });
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    });

    expect(screen.getByRole("button", { name: "Confirm change" })).toBeInTheDocument();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("discards a review without committing when the manager goes back", async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(catalogRow("CPO-1").getByRole("button", { name: "Archive" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
    });

    expect(commitMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirm change" })).not.toBeInTheDocument();
  });

  it("refuses a program outcome write until a program is selected", () => {
    renderPage({ common: [COMMON_ONE], programs: [] });

    expect(screen.getByRole("button", { name: "Review program PO" })).toBeDisabled();
  });
});
