import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScopedRosterStudentSearch } from "@/features/course-assignments/components/scoped-roster-student-search";
import { searchScopedRosterStudentsAction } from "@/lib/actions/course-roster-actions";

vi.mock("@/lib/actions/course-roster-actions", () => ({
  searchScopedRosterStudentsAction: vi.fn(),
}));

const assignmentId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ScopedRosterStudentSearch", () => {
  it("does not request a one-character query", () => {
    render(<ScopedRosterStudentSearch assignmentId={assignmentId} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "J" } });

    expect(searchScopedRosterStudentsAction).not.toHaveBeenCalled();
    expect(screen.getByText("Enter at least 2 characters to search Students.")).toBeInTheDocument();
  });

  it("debounces query requests by 300ms and renders the bounded candidates", async () => {
    vi.useFakeTimers();
    vi.mocked(searchScopedRosterStudentsAction).mockResolvedValue({
      success: true,
      data: {
        assignmentId,
        candidates: [
          {
            userId: "student-1",
            name: "John Paul Cruz",
            email: "john.cruz@ac.edu",
            programId: "program-1",
            programCode: "BSCS",
            programName: "BS Computer Science",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<ScopedRosterStudentSearch assignmentId={assignmentId} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    expect(searchScopedRosterStudentsAction).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(searchScopedRosterStudentsAction).toHaveBeenCalledWith({
      assignmentId,
      programId: undefined,
      query: "John",
    });
    expect(screen.getByRole("button", { name: /john paul cruz/i })).toBeInTheDocument();
  });

  it("ignores a stale search response after the manager changes the query", async () => {
    vi.useFakeTimers();
    let resolveFirst: (value: Awaited<ReturnType<typeof searchScopedRosterStudentsAction>>) => void =
      () => undefined;
    vi.mocked(searchScopedRosterStudentsAction)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({
        success: true,
        data: {
          assignmentId,
          candidates: [
            {
              userId: "student-2",
              name: "John Paul Cruz",
              email: "john.cruz@ac.edu",
              programId: "program-1",
              programCode: null,
              programName: null,
              yearLevel: null,
              section: null,
              majorName: null,
              selectable: true,
              reason: null,
            },
          ],
        },
      });
    render(<ScopedRosterStudentSearch assignmentId={assignmentId} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Jo" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      resolveFirst({
        success: true,
        data: {
          assignmentId,
          candidates: [
            {
              userId: "stale-student",
              name: "Jo Student",
              email: "jo@ac.edu",
              programId: "program-1",
              programCode: null,
              programName: null,
              yearLevel: null,
              section: null,
              majorName: null,
              selectable: true,
              reason: null,
            },
          ],
        },
      });
    });

    expect(screen.getByRole("button", { name: /john paul cruz/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /jo student/i })).not.toBeInTheDocument();
  });
});
