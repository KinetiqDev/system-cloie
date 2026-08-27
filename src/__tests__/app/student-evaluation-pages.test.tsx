import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as saveDraftService from "@/features/responses/services/save-student-course-bound-draft";
import * as submitResponseService from "@/features/responses/services/submit-student-course-bound-response";

import {
  saveStudentCourseBoundDraftAction,
  submitStudentCourseBoundResponseAction,
} from "@/lib/actions/student-evaluation-actions";

describe("student evaluation server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the mocked success payload from saveStudentCourseBoundDraftAction", async () => {
    const payload = {
      answers: {
        "section-a:quantitative:q1": 4,
      },
      assignmentId: "assignment-1",
      sectionKey: "section-a",
    };
    const successPayload = {
      responseId: "response-1",
      savedAt: "2026-05-01T10:00:00.000Z",
      success: true,
    } as const;

    const saveDraftSpy = vi
      .spyOn(saveDraftService, "saveStudentCourseBoundDraft")
      .mockResolvedValue(successPayload);

    await expect(saveStudentCourseBoundDraftAction(payload)).resolves.toEqual(successPayload);
    expect(saveDraftSpy).toHaveBeenCalledWith(payload);
  });

  it("resolves the mocked success payload from submitStudentCourseBoundResponseAction", async () => {
    const payload = {
      answers: {
        "section-a:qualitative:remarks": "Clear and helpful explanations.",
        "section-a:quantitative:q1": 5,
      },
      assignmentId: "assignment-1",
    };
    const successPayload = {
      responseId: "response-1",
      status: "SUBMITTED",
      submittedAt: "2026-05-01T10:00:00.000Z",
      success: true,
    } as const;

    const submitResponseSpy = vi
      .spyOn(submitResponseService, "submitStudentCourseBoundResponse")
      .mockResolvedValue(successPayload);

    await expect(submitStudentCourseBoundResponseAction(payload)).resolves.toEqual(successPayload);
    expect(submitResponseSpy).toHaveBeenCalledWith(payload);
  });
});
