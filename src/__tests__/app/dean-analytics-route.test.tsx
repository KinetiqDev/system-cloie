import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeanAnalyticsPage from "@/app/(app)/dean/analytics/page";
import { DeanEvidenceView } from "@/features/analytics/components/dean-evidence-view";
import { DeanAiInsight } from "@/features/analytics/components/dean-ai-insight";
const { read, action } = vi.hoisted(() => ({ read: vi.fn(), action: vi.fn() }));
vi.mock("@/features/analytics/services/dean-evidence", () => ({ getDeanEvidence: read }));
vi.mock("@/lib/actions/dean-analytics-actions", () => ({
  generateDeanAnalyticsInsightAction: action,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));
const college = {
  programs: [],
  periods: [],
  evidence: [],
  programRows: [],
  invalidPeriod: false,
  summary: {
    opportunities: 0,
    submitted: 0,
    rate: null,
    deployments: 0,
    active: 0,
    closedIncomplete: 0,
  },
};
describe("Dean analytics route and evidence views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    read.mockResolvedValue({ kind: "college", college, invalidProgram: false });
  });
  it("renders no-evidence state and native filters without inventing a score", async () => {
    render(await DeanAnalyticsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeVisible();
    expect(screen.getByLabelText("Academic period")).toBeVisible();
    expect(screen.getByText(/No evaluations match this view/)).toBeVisible();
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });
  it("denies direct route data when unauthorized", async () => {
    read.mockResolvedValue(null);
    await expect(DeanAnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NOT_FOUND"
    );
  });
  it("canonicalizes manipulated unknown filter keys", async () => {
    await expect(
      DeanAnalyticsPage({ searchParams: Promise.resolve({ role: "DEAN" }) })
    ).rejects.toThrow("REDIRECT:/dean/analytics");
  });
  it("handles missing program evidence", () => {
    render(
      <DeanEvidenceView
        filters={{ view: "outcomes" }}
        evidence={{
          kind: "outcomes",
          college,
          program: { id: "p", code: "A", name: "Program", is_active: true },
          data: null,
          catalog: [],
          alignment: null,
          alignmentUnavailable: false,
          alignmentBasis: "Live active-period readiness",
        }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Evidence could not be authorized");
  });
  it("renders institutional empty evidence without attainment", () => {
    render(
      <DeanEvidenceView
        filters={{ view: "institutional" }}
        evidence={{
          kind: "institutional",
          college,
          outcomes: null,
          courses: null,
          trends: null,
          feedback: null,
        }}
      />
    );
    expect(screen.getByText(/ILOs are not classified as attainment/)).toBeVisible();
  });
  it("keeps AI optional and does not call a provider on mount", () => {
    render(<DeanAiInsight filters={{ view: "college" }} />);
    expect(screen.getByRole("button", { name: "Interpret current evidence" })).toBeEnabled();
    expect(action).not.toHaveBeenCalled();
  });
});
