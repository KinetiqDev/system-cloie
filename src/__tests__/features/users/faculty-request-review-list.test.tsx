import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FacultyAccessRequestListItem } from "@/features/users/services/list-faculty-access-requests";

const { approveActionMock, rejectActionMock, refreshMock } = vi.hoisted(() => ({
  approveActionMock: vi.fn(),
  rejectActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/lib/actions/faculty-approval-actions", () => ({
  approveFacultyRequestAction: approveActionMock,
  rejectFacultyRequestAction: rejectActionMock,
}));

import { FacultyRequestReviewList } from "@/features/users/components/faculty-request-review-list";

function request(
  overrides: Partial<FacultyAccessRequestListItem> = {}
): FacultyAccessRequestListItem {
  return {
    userId: "applicant-1",
    name: "Amara Reyes",
    email: "amara@example.test",
    programCode: "BSIT",
    programName: "Bachelor of Science in Information Technology",
    status: "PENDING",
    submittedAt: "2026-03-01T00:00:00.000Z",
    decidedAt: null,
    decisionNote: null,
    isActive: true,
    ...overrides,
  } as FacultyAccessRequestListItem;
}

function renderList(requests: FacultyAccessRequestListItem[], pendingCount = 1) {
  return render(
    <FacultyRequestReviewList
      requests={requests}
      pendingCount={pendingCount}
      currentUserId="sec-1"
    />
  );
}

describe("Faculty request review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("states that a pending request grants no access yet", () => {
    renderList([request()]);

    expect(screen.getByTestId("pending-count")).toHaveTextContent("1 awaiting review");
    expect(screen.getByText(/grants no Faculty access until you approve it/i)).toBeInTheDocument();
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(
      screen.getByText("BSIT — Bachelor of Science in Information Technology")
    ).toBeInTheDocument();
  });

  it("explains an empty queue instead of rendering decision controls", () => {
    renderList([], 0);

    expect(screen.getByText("No Faculty requests yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Approve Faculty access/i })
    ).not.toBeInTheDocument();
  });

  it("approves with the decision note the Secretary typed", async () => {
    approveActionMock.mockResolvedValue({ success: true });
    renderList([request()]);

    fireEvent.change(screen.getByLabelText("Decision note (optional)"), {
      target: { value: "Confirmed teaching load" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Approve Faculty access/i }));

    await waitFor(() =>
      expect(approveActionMock).toHaveBeenCalledWith({
        userId: "applicant-1",
        note: "Confirmed teaching load",
      })
    );
    expect(rejectActionMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("surfaces a refused decision and keeps the request open", async () => {
    approveActionMock.mockResolvedValue({
      success: false,
      error: "This applicant's requested program is archived or inactive.",
    });
    renderList([request()]);

    fireEvent.click(screen.getByRole("button", { name: /Approve Faculty access/i }));

    expect(
      await screen.findByText("This applicant's requested program is archived or inactive.")
    ).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("declines a request without a note", async () => {
    rejectActionMock.mockResolvedValue({ success: true });
    renderList([request()]);

    fireEvent.click(screen.getByRole("button", { name: /Do not approve/i }));

    await waitFor(() =>
      expect(rejectActionMock).toHaveBeenCalledWith({ userId: "applicant-1", note: undefined })
    );
  });

  it("closes a decided request to history only", () => {
    renderList(
      [
        request({
          status: "APPROVED",
          decidedAt: "2026-03-05T00:00:00.000Z",
          decisionNote: "Teaching load confirmed",
        }),
      ],
      0
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Teaching load confirmed")).toBeInTheDocument();
    expect(screen.getByText("2026-03-05")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Approve Faculty access/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/This request is closed/i)).toBeInTheDocument();
  });

  it("marks a deactivated applicant so approval is not made blind", () => {
    renderList([request({ isActive: false, status: "REJECTED" })], 0);

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByText("Not approved")).toBeInTheDocument();
  });
});
