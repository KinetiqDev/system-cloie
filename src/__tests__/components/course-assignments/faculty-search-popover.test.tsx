import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { FacultySearchPopover } from "@/features/course-assignments/components/shared/faculty-search-popover";
import { searchFacultyPoolAction } from "@/lib/actions/course-assignment-actions";
import type { FacultySearchResult } from "@/features/course-assignments/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  searchFacultyPoolAction: vi.fn(),
}));

const facultyPool: FacultySearchResult[] = [
  {
    id: "faculty-1",
    name: "Test Faculty",
    email: "test@example.com",
    affiliations: ["BS Computer Science"],
    primaryAffiliation: "BS Computer Science",
    primaryAffiliationCode: "BSCS",
  },
  {
    id: "faculty-2",
    name: "Elena Torres",
    email: "elena@example.com",
    affiliations: ["BS Education"],
    primaryAffiliation: "BS Education",
    primaryAffiliationCode: "BSED",
  },
];

function renderPopover(
  props: Partial<Parameters<typeof FacultySearchPopover>[0]> = {}
) {
  const onSelect = vi.fn();
  render(
    <FacultySearchPopover
      id="assignment-faculty"
      selectedFacultyId={null}
      selectedFacultyName={null}
      onSelect={onSelect}
      {...props}
    />
  );
  return { onSelect };
}

describe("FacultySearchPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the initial faculty pool when opened", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: facultyPool, total: facultyPool.length },
    });
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));

    expect(await screen.findByRole("button", { name: /test faculty/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /elena torres/i })).toBeInTheDocument();
    expect(searchFacultyPoolAction).toHaveBeenCalledWith("", 0, 20);
  });

  it("searches by query and selects a faculty member", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: [facultyPool[1]], total: 1 },
    });
    const { onSelect } = renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));
    const search = await screen.findByPlaceholderText(/search by name or email/i);
    fireEvent.change(search, { target: { value: "Elena" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /elena torres/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /elena torres/i }));

    expect(onSelect).toHaveBeenCalledWith(facultyPool[1]);
    expect(screen.queryByPlaceholderText(/search by name or email/i)).not.toBeInTheDocument();
  });

  it("debounces the query before searching the faculty pool", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(searchFacultyPoolAction).mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      });
      renderPopover();

      fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));
      await act(async () => {});
      const search = screen.getByPlaceholderText(/search by name or email/i);

      fireEvent.change(search, { target: { value: "Elena" } });
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(searchFacultyPoolAction).not.toHaveBeenCalledWith("Elena", 0, 20);

      act(() => {
        vi.advanceTimersByTime(2);
      });
      await act(async () => {});
      expect(searchFacultyPoolAction).toHaveBeenCalledWith("Elena", 0, 20);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flags faculty from a different program with a warning badge", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: facultyPool, total: facultyPool.length },
    });
    renderPopover({ targetProgramId: "prog-1", targetProgramName: "BS Computer Science" });

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));

    const crossProgram = await screen.findByRole("button", { name: /elena torres/i });
    expect(crossProgram).toHaveTextContent(/different program/i);
    expect(
      screen.getByRole("button", { name: /test faculty/i })
    ).not.toHaveTextContent(/different program/i);
  });

  it("shows a loading state while the pool request is pending", async () => {
    let resolvePool: (value: {
      success: true;
      data: { items: FacultySearchResult[]; total: number };
    }) => void = () => {};
    vi.mocked(searchFacultyPoolAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePool = resolve;
        })
    );
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));

    expect(await screen.findByRole("status", { name: /searching faculty/i })).toBeInTheDocument();

    resolvePool({ success: true, data: { items: facultyPool, total: facultyPool.length } });
    expect(await screen.findByRole("button", { name: /test faculty/i })).toBeInTheDocument();
  });

  it("shows an empty message when no faculty match the query", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    });
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));
    await screen.findByPlaceholderText(/search by name or email/i);

    expect(await screen.findByText(/no faculty available/i)).toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    renderPopover({ disabled: true });

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));

    expect(searchFacultyPoolAction).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(/search by name or email/i)).not.toBeInTheDocument();
  });

  it("focuses the search input when opened", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: facultyPool, total: facultyPool.length },
    });
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /search faculty/i }));

    const search = await screen.findByPlaceholderText(/search by name or email/i);
    await waitFor(() => {
      expect(search).toHaveFocus();
    });
  });

  it("marks the currently selected faculty with aria-pressed", async () => {
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: { items: facultyPool, total: facultyPool.length },
    });
    renderPopover({
      selectedFacultyId: "faculty-1",
      selectedFacultyName: "Test Faculty",
    });

    fireEvent.click(screen.getByRole("button", { name: /selected faculty: test faculty/i }));

    const selected = await screen.findByRole("button", { name: /test faculty/i, pressed: true });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /elena torres/i, pressed: false })
    ).not.toHaveAttribute("aria-pressed", "true");
  });
});
