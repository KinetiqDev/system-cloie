import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordCloudToken } from "@/features/analytics/types";
import { QualitativeWordCloud } from "@/features/analytics/components/qualitative-word-cloud";

const wordCloudPropsMock = vi.fn();
const disconnectMock = vi.fn();
let resizeCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;

vi.mock("@isoterik/react-word-cloud", () => ({
  WordCloud: (props: {
    width: number;
    height: number;
    words: Array<{ text: string; value: number }>;
    fill: (word: { text: string; value: number }, index: number) => string;
  }) => {
    wordCloudPropsMock(props);
    return <div data-testid="word-cloud-mock" />;
  },
}));

const tokens: WordCloudToken[] = [
  { text: "clarity", value: 12 },
  { text: "supportive", value: 9 },
  { text: "engaging", value: 8 },
  { text: "organized", value: 7 },
  { text: "feedback", value: 6 },
  { text: "practical", value: 5 },
  { text: "patient", value: 4 },
];

describe("QualitativeWordCloud", () => {
  beforeEach(() => {
    wordCloudPropsMock.mockClear();
    disconnectMock.mockClear();
    resizeCallback = null;

    function ResizeObserverMock(callback: typeof resizeCallback) {
      resizeCallback = callback;
      return {
        disconnect: disconnectMock,
        observe: vi.fn(),
        unobserve: vi.fn(),
      };
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clamps responsive width between mobile and desktop bounds", async () => {
    wordCloudPropsMock.mockClear();

    render(
      <QualitativeWordCloud
        title="Qualitative Feedback"
        tokens={[{ text: "clarity", value: 3 }]}
        responseCount={3}
      />
    );

    act(() => {
      resizeCallback?.([{ contentRect: { width: 220 } }]);
    });

    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          height: 220,
          width: 280,
        })
      );
    });

    act(() => {
      resizeCallback?.([{ contentRect: { width: 640 } }]);
    });

    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          height: 352,
          width: 640,
        })
      );
    });

    act(() => {
      resizeCallback?.([{ contentRect: { width: 1440 } }]);
    });

    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          height: 420,
          width: 960,
        })
      );
    });
  });

  it("renders empty-state text when no tokens exist", () => {
    render(
      <QualitativeWordCloud title="Qualitative Feedback" tokens={[]} responseCount={3} />
    );
    expect(screen.getByText("No qualitative responses yet")).toBeInTheDocument();
    expect(
      screen.getByText("No qualitative response data available yet.")
    ).toBeInTheDocument();
  });

  it("resolves word fills from semantic tokens and hatches words beyond five", () => {
    render(
      <QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} responseCount={3} />
    );

    const { fill } = wordCloudPropsMock.mock.calls.at(-1)![0] as {
      fill: (word: WordCloudToken, index: number) => string;
    };
    expect(fill(tokens[0], 0)).toBe("var(--chart-1)");
    expect(fill(tokens[4], 4)).toBe("var(--chart-5)");
    expect(fill(tokens[5], 5)).toMatch(/^url\(#word-cloud-[A-Za-z0-9_]+-hatch-0-c1\)$/);
    expect(fill(tokens[6], 6)).toMatch(/^url\(#word-cloud-[A-Za-z0-9_]+-hatch-1-c1\)$/);
    expect(fill(tokens[6], 6)).not.toBe(fill(tokens[5], 5));
  });

  it("namespaces hatch pattern ids per instance", () => {
    const { container } = render(
      <div>
        <QualitativeWordCloud title="First" tokens={tokens} responseCount={3} />
        <QualitativeWordCloud title="Second" tokens={tokens.slice(0, 6)} responseCount={3} />
      </div>
    );

    const patternIds = Array.from(
      container.querySelectorAll('[id*="word-cloud-"][id*="-hatch-"]')
    ).map((pattern) => pattern.id);
    expect(patternIds.length).toBeGreaterThan(0);
    expect(new Set(patternIds).size).toBe(patternIds.length);
  });

  it("names the cloud region from its title and insight", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens}
        responseCount={3} />);

    const region = screen.getByRole("region", { name: "Qualitative Feedback" });
    expect(region).toBeInTheDocument();
    const insightId = region.getAttribute("aria-describedby");
    expect(insightId).not.toBeNull();
    expect(document.getElementById(insightId!)!.textContent).toMatch(
      /Most frequent word: clarity \(12\)\./
    );
  });

  it("shows the frequency summary, insight, and exact-value table", () => {
    const { container } = render(
      <QualitativeWordCloud
        title="Qualitative Feedback"
        tokens={tokens}
        responseCount={9}
      />
    );

    expect(
      screen.getByText("Top 7 words from 9 qualitative responses")
    ).toBeInTheDocument();
    expect(screen.getByText("Most frequent word: clarity (12).")).toBeInTheDocument();

    const exactTable = container.querySelector("table");
    expect(exactTable).not.toBeNull();
    expect(exactTable!.textContent).toContain("clarity");
    expect(exactTable!.textContent).toContain("12");
    expect(exactTable!.textContent).toContain("23.5%");
    expect(exactTable!.textContent).toContain("patient");
    expect(exactTable!.textContent).toContain("7.8%");
  });

  it("pluralizes the response count", () => {
    render(
      <QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} responseCount={1} />
    );
    expect(screen.getByText("Top 7 words from 1 qualitative response")).toBeInTheDocument();
  });
});
