import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManagementTemplateBuilder } from "@/features/instruments/components/management-template-builder";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("ManagementTemplateBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The shared TemplateBuilder renders the PLO picker only for
    // program-owned templates; baseline templates skip the picker.
    // PLO picker uses useMediaQuery; stub a desktop viewport.
    // Stub retained for safety if the PLO picker path is reached.
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders template builder for Secretary with secretary/instruments redirect", () => {
    render(
      <ManagementTemplateBuilder
        programLabel="Institutional Baseline"
        onSave={vi.fn().mockResolvedValue({ success: true })}
        toolsHref="/secretary/instruments"
      />
    );

    expect(screen.getByText("Template Settings")).toBeInTheDocument();
    expect(screen.queryByText("CILO Binding")).not.toBeInTheDocument();
  });

  test("saves Secretary instrument templates in place", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });
    render(
      <ManagementTemplateBuilder
        programLabel="Institutional Baseline"
        onSave={onSave}
        toolsHref="/secretary/instruments"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /create template/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog", { name: /saved successfully/i })).not.toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/secretary/instruments/template-1/edit");
  });

  test("uses the shared template action toolbar for Dean", () => {
    render(
      <ManagementTemplateBuilder
        programLabel="Institutional Baseline"
        onSave={vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } })}
        toolsHref="/dean/instruments"
      />
    );

    expect(screen.getByRole("toolbar", { name: "Template actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create template/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
  });
});
