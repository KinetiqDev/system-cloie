import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { ProgramHeadMappingControls } from "@/features/outcomes/components/program-head-mapping-controls";
import {
  commitMappingAction,
  prepareMappingAction,
  prepareRemoveMappingAction,
} from "@/lib/actions/program-head-outcome-actions";
import type { OutcomeWriteReview } from "@/features/outcomes/services/manage-outcome-writes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/program-head-outcome-actions", () => ({
  createGOAction: vi.fn(),
  updateGOAction: vi.fn(),
  deleteGOAction: vi.fn(),
  reorderGOsAction: vi.fn(),
  prepareMappingAction: vi.fn(),
  prepareRemoveMappingAction: vi.fn(),
  commitMappingAction: vi.fn(),
}));

const prepareMappingActionMock = vi.mocked(prepareMappingAction);
const prepareRemoveMappingActionMock = vi.mocked(prepareRemoveMappingAction);
const commitMappingActionMock = vi.mocked(commitMappingAction);

function makeReview(): OutcomeWriteReview {
  return {
    input: {
      kind: "MAPPING",
      action: "create",
      programId: "program-1",
      ciloId: "cilo-1",
      goId: "go-1",
    },
    before: null,
    after: { cilo_id: "cilo-1", go_id: "go-1" },
    freshnessToken: "token",
    signature: "signature",
  };
}

function makeRemoveReview(): OutcomeWriteReview {
  return {
    input: { kind: "MAPPING", action: "remove", programId: "program-1", id: "mapping-1" },
    before: { id: "mapping-1", cilo_id: "cilo-1", go_id: "go-1" },
    after: null,
    freshnessToken: "token",
    signature: "signature",
  };
}

function renderControls() {
  return render(
    <ProgramHeadMappingControls
      programId="program-1"
      ciloId="cilo-1"
      ciloIndex={0}
      mappedGOs={[
        {
          id: "go-1",
          mappingId: "mapping-1",
          code: "GO-1",
          description: "Graduate Outcome one",
        },
      ]}
      activeGOs={[
        { id: "go-1", code: "GO-1" },
        { id: "go-2", code: "GO-2" },
      ]}
    />
  );
}

describe("ProgramHeadMappingControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitMappingActionMock.mockResolvedValue({ success: true });
  });

  it("renders the mapped GO chip and no-mapping hint for unmapped CILOs", () => {
    render(
      <ProgramHeadMappingControls
        programId="program-1"
        ciloId="cilo-2"
        ciloIndex={1}
        mappedGOs={[]}
        activeGOs={[{ id: "go-2", code: "GO-2" }]}
      />
    );

    expect(screen.getByText("No mappings")).toBeInTheDocument();
  });

  it("announces the preparing state on the remove trigger", async () => {
    let resolvePrepare!: (value: { success: true; review: OutcomeWriteReview }) => void;
    prepareRemoveMappingActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePrepare = resolve;
      })
    );
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Remove mapping to GO-1" }));

    const pending = await screen.findByRole("button", { name: "Preparing..." });
    expect(pending).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolvePrepare({ success: true, review: makeRemoveReview() });
    });
  });

  it("removes a mapping only after prepared review and explicit confirmation", async () => {
    const review = makeRemoveReview();
    prepareRemoveMappingActionMock.mockResolvedValue({ success: true, review });
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Remove mapping to GO-1" }));

    expect(await screen.findByText("Review this change")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm remove/i })).toBeInTheDocument();
    expect(prepareRemoveMappingActionMock).toHaveBeenCalledTimes(1);
    const formData = prepareRemoveMappingActionMock.mock.calls[0][0];
    expect(formData.get("programId")).toBe("program-1");
    expect(formData.get("id")).toBe("mapping-1");

    fireEvent.click(screen.getByRole("button", { name: /confirm remove/i }));

    await waitFor(() =>
      expect(commitMappingActionMock).toHaveBeenCalledWith(review, true)
    );
  });

  it("prepares and commits a new mapping through the GO select", async () => {
    const review = { ...makeReview(), input: { ...makeReview().input, goId: "go-2" } };
    prepareMappingActionMock.mockResolvedValue({ success: true, review });
    renderControls();

    fireEvent.click(screen.getByRole("combobox", { name: "Graduate Outcome for CILO 1" }));
    const option = await screen.findByRole("option", { name: "GO-2" });
    fireEvent.mouseMove(option);
    fireEvent.click(option);

    fireEvent.click(screen.getByRole("button", { name: /review mapping/i }));

    expect(await screen.findByText("Review this change")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm mapping/i }));

    await waitFor(() =>
      expect(commitMappingActionMock).toHaveBeenCalledWith(review, true)
    );
  });
});
