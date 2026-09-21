import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GOImportDialog } from "@/features/outcomes/components/go-import-dialog";
import {
  confirmGOImportAction,
  previewGOImportAction,
} from "@/lib/actions/program-head-outcome-actions";

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  previewGOImportAction: vi.fn(),
  confirmGOImportAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const program = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "BSIT",
  name: "Information Technology",
};
const readyRow = {
  sourceIndex: 2,
  input: { go_code: "GO-20", description: "Apply computing knowledge" },
  goCode: "GO-20",
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

describe("GOImportDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  async function uploadCsv(content: string, filename = "gos.csv") {
    render(<GOImportDialog open onOpenChange={vi.fn()} program={program} />);
    const input = screen.getByLabelText("GO CSV file");
    await act(async () =>
      fireEvent.change(input, {
        target: { files: [new File([content], filename, { type: "text/csv" })] },
      })
    );
  }

  it("shows the selected Program, two-column guide, and twenty-row limit", () => {
    render(<GOImportDialog open onOpenChange={vi.fn()} program={program} />);
    expect(screen.getByRole("heading", { name: "Import Graduate Outcomes" })).toBeInTheDocument();
    expect(screen.getAllByText(/BSIT · Information Technology/).length).toBeGreaterThan(0);
    expect(screen.getByText("GO Code")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText(/up to 20 GOs/i)).toBeInTheDocument();
  });

  it("previews and confirms only ready rows", async () => {
    vi.mocked(previewGOImportAction).mockResolvedValue({
      success: true,
      data: { rows: [readyRow], summary },
    });
    vi.mocked(confirmGOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [{ ...readyRow, outcome: "CREATED" }],
        summary: { ...summary, ready: 0, created: 1 },
      },
    });
    await uploadCsv("GO Code,Description\nGO-20,Apply computing knowledge");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(await screen.findByRole("heading", { name: "Review GOs" })).toBeInTheDocument();
    expect(screen.getByText(/may show incomplete CILO mappings/i)).toBeInTheDocument();
    const createButton = screen.getByRole("button", { name: "Create 1 GO" });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    await waitFor(() => expect(confirmGOImportAction).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Import results" })).toBeInTheDocument();
  });

  it("keeps parser errors beside the file step", async () => {
    await uploadCsv("wrong,headers\na,b", "bad.csv");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    expect(
      await screen.findByText(/Use the Graduate Outcome import template/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review GOs" })).not.toBeInTheDocument();
  });

  it("keeps failed rows addressable on the results step", async () => {
    const invalidRow = {
      ...readyRow,
      sourceIndex: 3,
      goCode: "GO-21",
      input: { go_code: "GO-21", description: "Nope" },
      status: "INVALID" as const,
      error: "Description must be 3 to 1,000 characters.",
    };
    vi.mocked(previewGOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [readyRow, invalidRow],
        summary: { ...summary, total: 2, ready: 1, attention: 1 },
      },
    });
    vi.mocked(confirmGOImportAction).mockResolvedValue({
      success: true,
      data: {
        rows: [
          { ...readyRow, outcome: "CREATED" as const },
          { ...invalidRow, outcome: "INVALID" as const },
        ],
        summary: { total: 2, ready: 0, attention: 1, existing: 0, created: 1, notCreated: 1 },
      },
    });
    await uploadCsv("GO Code,Description\nGO-20,Apply computing knowledge\nGO-21,Nope");
    fireEvent.click(screen.getByRole("button", { name: "Check file" }));
    const createButton = await screen.findByRole("button", { name: "Create 1 GO" });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    expect(await screen.findByRole("button", { name: "Download rows to fix" })).toBeInTheDocument();
    expect(screen.getByText("Description must be 3 to 1,000 characters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review CILO mappings" })).toBeInTheDocument();
  });
});
