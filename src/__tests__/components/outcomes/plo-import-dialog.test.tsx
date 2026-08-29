import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLOImportDialog } from "@/features/outcomes/components/plo-import-dialog";
import {
  confirmPLOImportAction,
  previewPLOImportAction,
} from "@/lib/actions/program-head-outcome-actions";

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  previewPLOImportAction: vi.fn(),
  confirmPLOImportAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const program = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "BSIT",
  name: "Information Technology",
};
const readyRow = {
  sourceIndex: 2,
  input: { plo_code: "PLO-20", description: "Apply computing knowledge" },
  ploCode: "PLO-20",
  description: "Apply computing knowledge",
  status: "READY" as const,
  error: null,
};
const summary = {
  total: 1,
  ready: 1,
  attention: 0,
  existing: 0,
  created: 0,
  notCreated: 0,
};

describe("PLOImportDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  async function uploadCsv(content: string, filename = "plos.csv") {
    render(<PLOImportDialog open onOpenChange={vi.fn()} program={program} />);
    const input = screen.getByLabelText("PLO CSV file");
    await act(async () =>
      fireEvent.change(input, {
        target: { files: [new File([content], filename, { type: "text/csv" })] },
      })
    );
  }

  it("shows the selected Program, two-column guide, and twenty-row limit", () => {
    render(<PLOImportDialog open onOpenChange={vi.fn()} program={program} />);
    expect(
      screen.getByRole("heading", { name: "Import Program Learning Outcomes" })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/BSIT · Information Technology/).length).toBeGreaterThan(0);
    expect(screen.getByText("PLO Code")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText(/up to 20 PLOs/i)).toBeInTheDocument();
  });

  it("previews and confirms only ready rows", async () => {
    vi.mocked(previewPLOImportAction).mockResolvedValue({
      success: true,
      data: { rows: [readyRow], summary },
    });
    vi.mocked(confirmPLOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [{ ...readyRow, outcome: "CREATED" }],
        summary: { ...summary, ready: 0, created: 1 },
      },
    });
    await uploadCsv("PLO Code,Description\nPLO-20,Apply computing knowledge");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(await screen.findByRole("heading", { name: "Review PLOs" })).toBeInTheDocument();
    expect(screen.getByText(/may show incomplete CILO mappings/i)).toBeInTheDocument();
    const createButton = screen.getByRole("button", { name: "Create 1 PLO" });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    await waitFor(() => expect(confirmPLOImportAction).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Import results" })).toBeInTheDocument();
  });

  it("keeps parser errors beside the file step", async () => {
    await uploadCsv("wrong,headers\na,b", "bad.csv");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(
      await screen.findByText(/Use the Program Learning Outcome import template/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review PLOs" })).not.toBeInTheDocument();
  });

  it("keeps failed rows addressable on the results step", async () => {
    const invalidRow = {
      ...readyRow,
      sourceIndex: 3,
      ploCode: "PLO-21",
      input: { plo_code: "PLO-21", description: "Nope" },
      status: "INVALID" as const,
      error: "Description must be 3 to 1,000 characters.",
    };
    vi.mocked(previewPLOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [readyRow, invalidRow],
        summary: { ...summary, total: 2, ready: 1, attention: 1 },
      },
    });
    vi.mocked(confirmPLOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [
          { ...readyRow, outcome: "CREATED" as const },
          { ...invalidRow, outcome: "INVALID" as const },
        ],
        summary: { total: 2, ready: 0, attention: 1, existing: 0, created: 1, notCreated: 1 },
      },
    });
    await uploadCsv("PLO Code,Description\nPLO-20,Apply computing knowledge\nPLO-21,Nope");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    const createButton = await screen.findByRole("button", { name: "Create 1 PLO" });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    expect(await screen.findByRole("button", { name: "Download rows to fix" })).toBeInTheDocument();
    expect(screen.getByText("Description must be 3 to 1,000 characters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review CILO mappings" })).toBeInTheDocument();
  });
});
