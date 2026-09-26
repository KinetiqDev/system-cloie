import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSubmittedResponseSections,
  getStudentSubmittedResponseReview,
} from "@/features/responses/services/get-student-submitted-response-review";

const { findFirstMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("buildSubmittedResponseSections", () => {
  it("shapes submitted review sections from a structure snapshot plus saved answers", () => {
    expect(
      buildSubmittedResponseSections({
        answers: {
          "section-a:qualitative:remarks": "More examples would help.",
          "section-a:quantitative:q1": 4,
          "section-b:quantitative:q2": 5,
        },
        structureSnapshot: [
          {
            key: "section-a",
            items: [
              { kind: "qualitative", key: "remarks", prompt: "Remarks" },
              {
                kind: "quantitative",
                key: "q1",
                prompt: "Clarity of instruction",
                scale: [1, 2, 3, 4, 5],
              },
            ],
            title: "Section A",
          },
          {
            key: "section-b",
            items: [
              {
                kind: "quantitative",
                key: "q2",
                prompt: "Usefulness of activities",
                scale: [1, 2, 3, 4, 5],
              },
            ],
            title: "Section B",
          },
        ],
      })
    ).toEqual([
      {
        id: "section-a",
        name: "Section A",
        description: "",
        items: [
          {
            kind: "qualitative",
            promptKey: "remarks",
            prompt: "Remarks",
            answer: "More examples would help.",
          },
          {
            kind: "quantitative",
            itemKey: "q1",
            prompt: "Clarity of instruction",
            answer: 4,
            scale: [1, 2, 3, 4, 5],
          },
        ],
      },
      {
        id: "section-b",
        name: "Section B",
        description: "",
        items: [
          {
            kind: "quantitative",
            itemKey: "q2",
            prompt: "Usefulness of activities",
            answer: 5,
            scale: [1, 2, 3, 4, 5],
          },
        ],
      },
    ]);
  });

  it("treats blank qualitative answers as missing in the submitted review", () => {
    expect(
      buildSubmittedResponseSections({
        answers: {
          "section-a:qualitative:remarks": "   ",
        },
        structureSnapshot: [
          {
            key: "section-a",
            items: [{ kind: "qualitative", key: "remarks", prompt: "Remarks" }],
            title: "Section A",
          },
        ],
      })
    ).toEqual([
      {
        id: "section-a",
        name: "Section A",
        description: "",
        items: [
          { kind: "qualitative", promptKey: "remarks", prompt: "Remarks", answer: undefined },
        ],
      },
    ]);
  });

  it("supports legacy snapshot arrays when building submitted review sections", () => {
    expect(
      buildSubmittedResponseSections({
        answers: {
          "section-a:qualitative:remarks": "Legacy remarks",
          "section-a:quantitative:q1": 5,
        },
        structureSnapshot: [
          {
            key: "section-a",
            qualitative_prompts: [{ key: "remarks", prompt: "Remarks" }],
            quantitative_items: [{ key: "q1", prompt: "Question 1" }],
            title: "Section A",
          },
        ],
      })
    ).toEqual([
      {
        description: "",
        id: "section-a",
        items: [
          {
            answer: 5,
            itemKey: "q1",
            kind: "quantitative",
            prompt: "Question 1",
            scale: [],
          },
          {
            answer: "Legacy remarks",
            kind: "qualitative",
            prompt: "Remarks",
            promptKey: "remarks",
          },
        ],
        name: "Section A",
      },
    ]);
  });

  it("supports current questions[] snapshots when building submitted review sections", () => {
    expect(
      buildSubmittedResponseSections({
        answers: {
          "section-a:qualitative:remarks": "Very reflective.",
          "section-a:quantitative:q1": 3,
        },
        structureSnapshot: [
          {
            key: "section-a",
            questions: [
              { key: "q1", prompt: "How clear was the lesson?", type: "likert" },
              { key: "remarks", prompt: "Additional comments", type: "guided_open_ended" },
            ],
            title: "Section A",
          },
        ],
      })
    ).toEqual([
      {
        description: "",
        id: "section-a",
        items: [
          {
            answer: 3,
            itemKey: "q1",
            kind: "quantitative",
            prompt: "How clear was the lesson?",
            scale: [],
          },
          {
            answer: "Very reflective.",
            kind: "qualitative",
            prompt: "Additional comments",
            promptKey: "remarks",
          },
        ],
        name: "Section A",
      },
    ]);
  });
});

describe("getStudentSubmittedResponseReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads a submitted response review for the current user", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue({
      assignment: {
        course_bound: {
          course_assignment: {
            course: { title: "Capstone 1" },
            program: { name: "BSIT", id: "program-1" },
          },
          instrument: {
            structure_snapshot: [
              {
                items: [
                  { key: "q1", kind: "quantitative", prompt: "Question 1", scale: [1, 2, 3, 4, 5] },
                ],
                key: "section-a",
                title: "Section A",
              },
            ],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
        },
      },
      id: "response-1",
      qual_items: [],
      quant_items: [{ item_key: "q1", rating_value: 5, section_key: "section-a" }],
      submitted_at: new Date("2026-05-20T10:00:00.000Z"),
    });

    await expect(getStudentSubmittedResponseReview("response-1")).resolves.toEqual(
      expect.objectContaining({
        courseTitle: "Capstone 1",
        evaluationTitle: "Post-Term CILO Evaluation Tool",
        responseId: "response-1",
        sections: [
          {
            description: "",
            id: "section-a",
            items: [
              {
                answer: 5,
                itemKey: "q1",
                kind: "quantitative",
                prompt: "Question 1",
                scale: [1, 2, 3, 4, 5],
              },
            ],
            name: "Section A",
          },
        ],
      })
    );
  });

  it("keeps the frozen Course and program labels after the live catalog drifts", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue({
      assignment: {
        course_bound: {
          course_assignment: {
            course: { title: "Renamed Live Course", major: { name: "Renamed Live Major" } },
            program: { name: "Renamed Live Program", id: "program-1" },
          },
          course_info_snapshot: {
            courseTitle: "Capstone 1",
            majorName: "Information Technology",
            programCode: "BSIT",
            programName: "BS Information Technology",
            snapshotSchemaVersion: 2,
          },
          instrument: {
            structure_snapshot: [
              {
                items: [
                  { key: "q1", kind: "quantitative", prompt: "Question 1", scale: [1, 2, 3, 4, 5] },
                ],
                key: "section-a",
                title: "Section A",
              },
            ],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
        },
      },
      id: "response-1",
      qual_items: [],
      quant_items: [{ item_key: "q1", rating_value: 5, section_key: "section-a" }],
      submitted_at: new Date("2026-05-20T10:00:00.000Z"),
    });

    await expect(getStudentSubmittedResponseReview("response-1")).resolves.toEqual(
      expect.objectContaining({
        courseTitle: "Capstone 1",
        programLabel: "Information Technology",
      })
    );
  });

  it("falls back to live catalog labels for legacy responses with no course info snapshot", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue({
      assignment: {
        course_bound: {
          course_assignment: {
            course: { title: "Capstone 1", major: { name: "Information Technology" } },
            program: { name: "BSIT", id: "program-1" },
          },
          course_info_snapshot: null,
          instrument: {
            structure_snapshot: [],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
        },
      },
      id: "response-1",
      qual_items: [],
      quant_items: [],
      submitted_at: new Date("2026-05-20T10:00:00.000Z"),
    });

    await expect(getStudentSubmittedResponseReview("response-1")).resolves.toEqual(
      expect.objectContaining({
        courseTitle: "Capstone 1",
        programLabel: "Information Technology",
      })
    );
  });
});
