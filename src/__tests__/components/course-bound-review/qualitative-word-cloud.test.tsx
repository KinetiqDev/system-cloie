import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const singletonTokens: WordCloudToken[] = [
  { text: "alpha", value: 1 },
  { text: "bravo", value: 1 },
  { text: "charlie", value: 1 },
  { text: "delta", value: 1 },
  { text: "echo", value: 1 },
  { text: "foxtrot", value: 1 },
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

  it("shows the cloud view by default with the ranked exact values one toggle away", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    expect(screen.getByRole("region", { name: "Qualitative Feedback" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Word cloud of the most frequent terms/ })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));

    expect(screen.getByRole("table", { name: "Exact word frequency values" })).toBeInTheDocument();
    expect(screen.getByText("7 terms from 3 qualitative answers")).toBeInTheDocument();
    expect(wordCloudPropsMock).not.toHaveBeenCalled();
  });

  it("bounds the ranked table and groups the singleton tail", () => {
    const manyTokens = [
      ...Array.from({ length: 12 }, (_, index) => ({
        text: `word${index}`,
        value: 40 - index,
      })),
      ...singletonTokens,
    ];

    const { container } = render(
      <QualitativeWordCloud title="Qualitative Feedback" tokens={manyTokens} answerCount={3} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));

    const tableRegion = container.querySelector('[data-slot="table-container"]');
    expect(tableRegion).not.toBeNull();
    expect(tableRegion!.className).toContain("overflow-y-auto");

    const rows = screen.getAllByRole("row");
    // Header + twelve repeated terms + the singleton group row; no individual
    // singleton rows.
    expect(rows).toHaveLength(14);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("foxtrot")).toBeInTheDocument();
  });

  it("keeps singleton rows when too few to group", () => {
    render(
      <QualitativeWordCloud
        title="Qualitative Feedback"
        tokens={[{ text: "clarity", value: 4 }, ...singletonTokens.slice(0, 2)]}
        answerCount={2}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));

    const rows = screen.getAllByRole("row");
    // Header + clarity + two ungrouped singletons.
    expect(rows).toHaveLength(4);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("bravo")).toBeInTheDocument();
  });

  it("renders the cloud through the view toggle", async () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));

    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenCalled();
    });

    const cloudProps = wordCloudPropsMock.mock.calls.at(-1)![0] as {
      words: WordCloudToken[];
      fill: (word: WordCloudToken, index: number) => string;
      fontSize: (word: WordCloudToken) => number;
      width: number;
      height: number;
    };
    // Cloud shows the slider-default slice; the ranked view holds every term.
    expect(cloudProps.words.length).toBeLessThanOrEqual(28);
    expect(cloudProps.words.length).toBeGreaterThan(0);
    expect(cloudProps.words[0]).toEqual({ text: "clarity", value: 12 });

    // Fill cycles the approved five chart tokens as solid colors, no hatch.
    expect(cloudProps.fill(tokens[0], 0)).toBe("var(--chart-1)");
    expect(cloudProps.fill(tokens[4], 4)).toBe("var(--chart-5)");
    expect(cloudProps.fill(tokens[5], 5)).toBe("var(--chart-1)");

    // Font scale resolves over the full token list, not the rendered slice.
    const fullScale = cloudProps.fontSize(tokens[0]);
    const smallScale = cloudProps.fontSize({ text: "rare", value: 1 });
    expect(fullScale).toBeGreaterThan(smallScale);
    expect(cloudProps.fontSize({ text: "peak", value: 12 })).toBe(48);
    expect(cloudProps.fontSize({ text: "floor", value: 1 })).toBe(16);
  });

  it("adjusts cloud density with an accessible word-count slider", async () => {
    const manyTokens = Array.from({ length: 40 }, (_, index) => ({
      text: `word${index}`,
      value: 40 - index,
    }));

    render(
      <QualitativeWordCloud title="Qualitative Feedback" tokens={manyTokens} answerCount={3} />
    );

    // Cloud is the default; the slider is immediately present.
    const slider = screen.getByRole("slider", { name: /Words shown in the cloud/ });
    expect(slider).toHaveAttribute("min", "10");
    expect(slider).toHaveAttribute("max", "40");
    expect(slider).toHaveAttribute("step", "5");
    expect(slider).toHaveValue("28");

    fireEvent.change(slider, { target: { value: "10" } });
    await waitFor(() => {
      expect(wordCloudPropsMock.mock.calls.at(-1)?.[0].words).toHaveLength(10);
    });

    fireEvent.change(slider, { target: { value: "40" } });
    await waitFor(() => {
      expect(wordCloudPropsMock.mock.calls.at(-1)?.[0].words).toHaveLength(40);
    });
  });

  it("caps the slider at the available term count", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));

    const slider = screen.getByRole("slider", { name: /Words shown in the cloud/ });
    // Seven tokens: the slider max is the list itself, not 70.
    expect(slider).toHaveAttribute("max", "7");
  });

  it("marks the term frame unselectable so slider drags cannot extend a text selection", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    const region = screen.getByRole("region", { name: "Qualitative Feedback" });
    expect(region.className).toContain("select-none");
  });

  it("derives cloud density from the canvas width", async () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));
    await waitFor(() => {
      expect(resizeCallback).not.toBeNull();
    });

    act(() => {
      resizeCallback?.([{ contentRect: { width: 220 } }]);
    });
    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 220, height: 220 })
      );
    });

    act(() => {
      resizeCallback?.([{ contentRect: { width: 640 } }]);
    });
    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 640, height: 352 })
      );
    });

    act(() => {
      resizeCallback?.([{ contentRect: { width: 1440 } }]);
    });
    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 960, height: 420 })
      );
    });

    // Same term keeps one size regardless of slice width.
    const firstCall = wordCloudPropsMock.mock.calls.at(-2)![0] as {
      fontSize: (word: WordCloudToken) => number;
    };
    const lastCall = wordCloudPropsMock.mock.calls.at(-1)![0] as {
      fontSize: (word: WordCloudToken) => number;
    };
    expect(firstCall.fontSize(tokens[0])).toBe(lastCall.fontSize(tokens[0]));
  });

  it("renders empty-state text when no tokens exist", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={[]} answerCount={3} />);
    expect(screen.getByText("No qualitative responses yet")).toBeInTheDocument();
    expect(screen.getByText("No qualitative response data available yet.")).toBeInTheDocument();
  });

  it("names the cloud region from its title and insight", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    const region = screen.getByRole("region", { name: "Qualitative Feedback" });
    expect(region).toBeInTheDocument();
    const insightId = region.getAttribute("aria-describedby");
    expect(insightId).not.toBeNull();
    expect(document.getElementById(insightId!)!.textContent).toMatch(
      /Most frequent term: clarity \(12\)\./
    );
    expect(document.getElementById(insightId!)!.textContent).toContain(
      "7 of 7 terms appear more than once"
    );
  });

  it("pluralizes the answer count", () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={1} />);
    expect(screen.getByText("7 terms from 1 qualitative answer")).toBeInTheDocument();
  });

  it("keeps exact counts stable outside the visible cloud slice", async () => {
    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    const rankedCell = () => {
      const rows = screen.getAllByRole("row");
      const match = rows.find((row) => row.textContent?.startsWith("patient"));
      return match?.textContent ?? "";
    };

    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));
    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));

    expect(rankedCell()).toContain("patient");
    expect(rankedCell()).toContain("4");
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("disables word transitions under prefers-reduced-motion", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }))
    );

    render(<QualitativeWordCloud title="Qualitative Feedback" tokens={tokens} answerCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Cloud" }));

    await waitFor(() => {
      expect(wordCloudPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ transition: "none" })
      );
    });
  });
});
