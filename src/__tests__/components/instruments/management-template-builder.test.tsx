import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    // The shared TemplateBuilder renders the PLO picker for PROGRAM_WIDE
    // templates; jsdom has no matchMedia, so stub a desktop viewport.
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

  test("shows success modal and redirects to toolsHref on save", async () => {
    const { fireEvent } = await import("@testing-library/react");
    
    render(
      <ManagementTemplateBuilder
        programLabel="Institutional Baseline"
        onSave={vi.fn().mockResolvedValue({ success: true })}
        toolsHref="/secretary/instruments"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await vi.waitFor(() => {
      expect(screen.getByText("Template Saved Successfully")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to Tools" }));

    expect(pushMock).toHaveBeenCalledWith("/secretary/instruments");
  });

  test("redirects Dean save to /dean/instruments via toolsHref prop", async () => {
    const { fireEvent } = await import("@testing-library/react");
    
    render(
      <ManagementTemplateBuilder
        programLabel="Institutional Baseline"
        onSave={vi.fn().mockResolvedValue({ success: true })}
        toolsHref="/dean/instruments"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await vi.waitFor(() => {
      expect(screen.getByText("Template Saved Successfully")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to Tools" }));

    expect(pushMock).toHaveBeenCalledWith("/dean/instruments");
  });
});
