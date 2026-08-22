import { beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  TemplateBuilder,
  filteredContainerCollisionDetection,
  sameContainerKeyboardCoordinates,
} from "@/features/instruments/components/template-builder";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
const dndCapture = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown) => void>(),
}));

const sortableCapture = vi.hoisted(() => ({
  contexts: new Map<string, string[]>(),
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();

  return {
    ...actual,
    DndContext: ({
      children,
      id,
      onDragEnd,
    }: {
      children: ReactNode;
      id?: string;
      onDragEnd?: (event: unknown) => void;
    }) => {
      if (id && onDragEnd) {
        dndCapture.handlers.set(id, onDragEnd);
      }

      return <div>{children}</div>;
    },
  };
});

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/sortable")>();

  return {
    ...actual,
    SortableContext: ({
      children,
      id,
      items,
    }: {
      children: ReactNode;
      id?: string;
      items: Array<string | number | { id: string | number }>;
    }) => {
      if (id) {
        sortableCapture.contexts.set(
          id,
          items.map((item) => String(typeof item === "object" ? item.id : item))
        );
      }

      return <div data-sortable-context-id={id}>{children}</div>;
    },
  };
});

describe("TemplateBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    dndCapture.handlers.clear();
    sortableCapture.contexts.clear();
  });

  test("renders without facultyConfig on admin-style pages", () => {
    render(
      <TemplateBuilder
        programLabel="Institutional Baseline"
        onSave={vi.fn().mockResolvedValue({ success: true })}
      />
    );

    expect(screen.getByText("Template Settings")).toBeInTheDocument();
    expect(screen.queryByText("CILO Binding")).not.toBeInTheDocument();
  });

  test("blocks adding duplicate predefined responses within the same question", () => {
    render(
      <TemplateBuilder
        programLabel="BSIT"
        onSave={vi.fn().mockResolvedValue({ success: true })}
        initialData={{
          id: "template-1",
          name: "Guided Tool",
          description: "",
          template_type: "PROGRAM_WIDE",
          is_active: true,
          is_faculty_accessible: false,
          structure: [
            {
              key: "section-1",
              title: "Feedback",
              description: undefined,
              order: 0,
              questions: [
                {
                  key: "question-1",
                  prompt: "Remarks",
                  type: "guided_open_ended",
                  order: 0,
                  required: true,
                  suggestedResponses: ["Alpha"],
                },
              ],
            },
          ],
        }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Add a predefined response/i), {
      target: { value: " Alpha " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      screen.getByText("Predefined responses must be unique within a question.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Alpha")).toHaveLength(1);
  });

  test("loads faculty course cilos and includes bindings in save payload", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });

    render(
      <TemplateBuilder
        programLabel="BSIT"
        onSave={onSave}
        toolsHref="/faculty/tools"
        initialData={{
          id: "template-1",
          name: "CILO Tool",
          description: "",
          template_type: "COURSE_BOUND",
          is_active: true,
          is_faculty_accessible: true,
          bound_course_id: "course-1",
          bound_major_id: null,
          bound_program_id: "program-1",
          structure: [
            {
              key: "section-1",
              title: "Outcomes",
              description: undefined,
              order: 0,
              questions: [
                {
                  key: "question-1",
                  prompt: "Evaluate CILO 1",
                  type: "likert",
                  order: 0,
                  required: true,
                  likertDescriptors: [
                    { label: "Poor", value: 1 },
                    { label: "Fair", value: 2 },
                    { label: "Good", value: 3 },
                    { label: "Very Good", value: 4 },
                    { label: "Excellent", value: 5 },
                  ],
                },
              ],
            },
          ],
        }}
        facultyConfig={{
          courseContexts: [
            {
              courseCode: "IT401",
              courseId: "course-1",
              courseTitle: "Capstone 1",
              courseType: "PROGRAM_SPECIFIC",
              majorId: null,
              majorName: null,
              programCode: "BSIT",
              programId: "program-1",
              programName: "Information Technology",
              scopeLabel: "BSIT - Shared Program Course",
            },
          ],
          initialBindings: [
            {
              ciloId: "cilo-1",
              itemKey: "question-1",
              sectionKey: "section-1",
            },
          ],
          loadManagedCilosAction: vi.fn().mockResolvedValue({
            success: true,
            data: {
              hasSavedCilos: true,
              items: [{ description: "Apply project planning principles", id: "cilo-1" }],
            },
          }),
          validatePublishReadinessAction: vi.fn().mockResolvedValue({
            success: true,
            data: { id: "template-1" },
          }),
        }}
        saveSuccessConfig={{
          redirectTo: "/faculty/tools",
          toastMessage: "Template saved successfully.",
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/saved cilo\(s\) available for binding/i)).toBeInTheDocument();
    });
    expect(screen.getByText("CILO Binding")).toBeInTheDocument();
    expect(screen.getByDisplayValue("IT401 - Capstone 1 (BSIT - Shared Program Course)")).toBeInTheDocument();
    expect(screen.getByText("CILO 1: Apply project planning principles")).toBeInTheDocument();
    expect(screen.queryByText("program-1")).not.toBeInTheDocument();
    expect(screen.queryByText("course-1")).not.toBeInTheDocument();
    expect(screen.queryByText("cilo-1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const formData = onSave.mock.calls[0][0] as FormData;
    expect(formData.get("bound_course_id")).toBe("course-1");
    expect(formData.get("bound_program_id")).toBe("program-1");
    expect(formData.get("cilo_question_bindings")).toBe(
      JSON.stringify([
        {
          ciloId: "cilo-1",
          itemKey: "question-1",
          sectionKey: "section-1",
        },
      ])
    );
    expect(pushMock).toHaveBeenCalledWith("/faculty/tools");
  });

  test("redirects program head saves back to tools with a success toast", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });

    render(
      <TemplateBuilder
        programLabel="BSBA"
        onSave={onSave}
        saveSuccessConfig={{
          redirectTo: "/program-head/tools",
          toastMessage: "Template saved successfully.",
        }}
        initialData={{
          id: "template-1",
          name: "BSBA Tool",
          description: "",
          template_type: "COURSE_BOUND",
          is_active: true,
          is_faculty_accessible: true,
          structure: [
            {
              key: "section-1",
              title: "Outcomes",
              description: undefined,
              order: 0,
              questions: [
                {
                  key: "question-1",
                  prompt: "Evaluate outcome",
                  type: "likert",
                  order: 0,
                  required: true,
                  likertDescriptors: [
                    { label: "Poor", value: 1 },
                    { label: "Fair", value: 2 },
                    { label: "Good", value: 3 },
                    { label: "Very Good", value: 4 },
                    { label: "Excellent", value: 5 },
                  ],
                },
              ],
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/program-head/tools");
    });
    expect(screen.queryByText("Template saved successfully.")).not.toBeInTheDocument();
  });

  test("does not redirect program head saves on failure and shows the error", async () => {
    const onSave = vi.fn().mockResolvedValue({
      success: false,
      error: "Section title is required.",
    });

    render(
      <TemplateBuilder
        programLabel="BSBA"
        onSave={onSave}
        saveSuccessConfig={{
          redirectTo: "/program-head/tools",
          toastMessage: "Template saved successfully.",
        }}
        initialData={{
          id: "template-1",
          name: "Broken Tool",
          description: "",
          template_type: "COURSE_BOUND",
          is_active: true,
          is_faculty_accessible: true,
          structure: [
            {
              key: "section-1",
              title: "",
              description: undefined,
              order: 0,
              questions: [
                {
                  key: "question-1",
                  prompt: "Evaluate outcome",
                  type: "likert",
                  order: 0,
                  required: true,
                  likertDescriptors: [
                    { label: "Poor", value: 1 },
                    { label: "Fair", value: 2 },
                    { label: "Good", value: 3 },
                    { label: "Very Good", value: 4 },
                    { label: "Excellent", value: 5 },
                  ],
                },
              ],
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByText("Section title is required.")).toBeInTheDocument();
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  test("forces faculty-edited templates to remain course-bound on save", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });

    render(
      <TemplateBuilder
        programLabel="BSIT"
        onSave={onSave}
        toolsHref="/faculty/tools"
        initialData={{
          id: "template-1",
          name: "Faculty Tool",
          description: "",
          template_type: "PROGRAM_WIDE",
          is_active: true,
          is_faculty_accessible: true,
          structure: [
            {
              key: "section-1",
              title: "Outcomes",
              description: undefined,
              order: 0,
              questions: [
                {
                  key: "question-1",
                  prompt: "Evaluate CILO 1",
                  type: "likert",
                  order: 0,
                  required: true,
                  likertDescriptors: [
                    { label: "Poor", value: 1 },
                    { label: "Fair", value: 2 },
                    { label: "Good", value: 3 },
                    { label: "Very Good", value: 4 },
                    { label: "Excellent", value: 5 },
                  ],
                },
              ],
            },
          ],
        }}
        facultyConfig={{
          courseContexts: [],
          initialBindings: [],
          loadManagedCilosAction: vi.fn().mockResolvedValue({
            success: true,
            data: {
              hasSavedCilos: false,
              items: [],
            },
          }),
          validatePublishReadinessAction: vi.fn().mockResolvedValue({
            success: true,
            data: { id: "template-1" },
          }),
        }}
      />
    );

    expect(screen.getByDisplayValue("COURSE_BOUND")).toBeDisabled();
    expect(screen.queryByText("Program-wide Evaluation Tool")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const formData = onSave.mock.calls[0][0] as FormData;
    expect(formData.get("template_type")).toBe("COURSE_BOUND");
  });

  test("reorders sections and normalizes every persisted order", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });
    const structure = [
      {
        key: "section-a:opaque",
        title: "Section A",
        description: undefined,
        order: 7,
        questions: [
          { key: "question-a-1", prompt: "A1", type: "likert" as const, order: 9, required: true },
          { key: "question-a-2", prompt: "A2", type: "likert" as const, order: 4, required: true },
        ],
      },
      {
        key: "section-b",
        title: "Section B",
        description: undefined,
        order: 22,
        questions: [
          { key: "question-b-1", prompt: "B1", type: "likert" as const, order: 3, required: true },
        ],
      },
    ];

    render(
      <TemplateBuilder
        initialData={{
          id: "template-1",
          name: "Reorder",
          description: "",
          template_type: "COURSE_BOUND",
          is_active: true,
          is_faculty_accessible: true,
          structure,
        }}
        programLabel="BSIT"
        onSave={onSave}
      />
    );

    const sectionIds = sortableCapture.contexts.get("sections")!;
    act(() =>
      dndCapture.handlers.get("template-builder-sections")?.({
        active: { id: sectionIds[1] },
        over: { id: sectionIds[0] },
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = JSON.parse((onSave.mock.calls[0][0] as FormData).get("structure") as string);
    expect(saved.map((section: { key: string }) => section.key)).toEqual([
      "section-b",
      "section-a:opaque",
    ]);
    expect(saved.map((section: { order: number }) => section.order)).toEqual([0, 1]);
    expect(saved.flatMap((section: { questions: { order: number }[] }) => section.questions.map((q) => q.order))).toEqual([
      0,
      0,
      1,
    ]);
  });

  test("reorders questions only within their section and keeps handles accessible", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true, data: { id: "template-1" } });
    render(
      <TemplateBuilder
        programLabel="BSIT"
        onSave={onSave}
        initialData={{
          id: "template-1",
          name: "Questions",
          description: "",
          template_type: "PROGRAM_WIDE",
          is_active: true,
          is_faculty_accessible: false,
          structure: [
            {
              key: "section-a:opaque",
              title: "Section A",
              description: undefined,
              order: 0,
              questions: [
                { key: "question-a-1", prompt: "A1", type: "likert", order: 0, required: true },
                { key: "question-a-2", prompt: "A2", type: "likert", order: 1, required: true },
              ],
            },
            {
              key: "section-b",
              title: "Section B",
              description: undefined,
              order: 1,
              questions: [{ key: "question-b-1", prompt: "B1", type: "likert", order: 0, required: true }],
            },
          ],
        }}
      />
    );

    const questionIds = [
      JSON.stringify(["question", "section-a:opaque", "question-a-1"]),
      JSON.stringify(["question", "section-a:opaque", "question-a-2"]),
    ];
    act(() =>
      dndCapture.handlers.get("template-builder-sections")?.({
        active: { id: questionIds[1] },
        over: { id: questionIds[0] },
      })
    );
    act(() =>
      dndCapture.handlers.get("template-builder-sections")?.({
        active: { id: questionIds[0] },
        over: { id: JSON.stringify(["question", "section-b", "question-b-1"]) },
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = JSON.parse((onSave.mock.calls[0][0] as FormData).get("structure") as string);
    expect(saved[0].questions.map((q: { key: string }) => q.key)).toEqual([
      "question-a-2",
      "question-a-1",
    ]);
    expect(saved[1].questions.map((q: { key: string }) => q.key)).toEqual(["question-b-1"]);
    expect(screen.getByRole("button", { name: "Drag section: Section A" })).toHaveAttribute(
      "title",
      "Drag section: Section A"
    );
    expect(screen.getByRole("button", { name: "Drag question 1 in section 1" })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Enter question").every((input) => !(input as HTMLInputElement).disabled)).toBe(true);
  });

  test("keeps a failed-save error visible after a rejected reorder", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: "Save failed." });
    render(
      <TemplateBuilder
        programLabel="BSIT"
        onSave={onSave}
        initialData={{
          id: "template-1",
          name: "Error",
          description: "",
          template_type: "PROGRAM_WIDE",
          is_active: true,
          is_faculty_accessible: false,
          structure: [
            {
              key: "section-a",
              title: "Section A",
              description: undefined,
              order: 0,
              questions: [{ key: "question-a", prompt: "A", type: "likert", order: 0, required: true }],
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText("Save failed.")).toBeInTheDocument();
    act(() =>
      dndCapture.handlers.get("template-builder-sections")?.({
        active: { id: JSON.stringify(["section", "unknown"]) },
        over: { id: JSON.stringify(["section", "section-a"]) },
      })
    );
    expect(screen.getByText("Save failed.")).toBeInTheDocument();
  });

  test("filters collision and keyboard targets to the active sortable container", () => {
    const sectionA = JSON.stringify(["section", "a"]);
    const sectionB = JSON.stringify(["section", "b"]);
    const questionA = JSON.stringify(["question", "a", "qa"]);
    const questionA2 = JSON.stringify(["question", "a", "qa2"]);
    const questionB = JSON.stringify(["question", "b", "qb"]);
    const data = (containerId: string) => ({ current: { sortable: { containerId } } });
    const containers = [
      { id: sectionA, data: data("sections"), disabled: false },
      { id: sectionB, data: data("sections"), disabled: false },
      { id: questionA, data: data(sectionA), disabled: false },
      { id: questionA2, data: data(sectionA), disabled: false },
      { id: questionB, data: data(sectionB), disabled: false },
    ];
    const collision = filteredContainerCollisionDetection({
      active: { id: questionA, data: data(sectionA) },
      collisionRect: { top: 0, bottom: 10, left: 0, right: 10, width: 10, height: 10 },
      droppableRects: new Map(),
      droppableContainers: containers,
      pointerCoordinates: null,
    } as never);

    expect(collision.every(({ id }) => id !== questionB)).toBe(true);

    const droppableContainers = {
      get: (id: string) => containers.find((container) => container.id === id),
      getEnabled: () => containers,
    };
    const keyboardTarget = sameContainerKeyboardCoordinates(
      { code: "ArrowDown" } as KeyboardEvent,
      {
        active: questionA,
        currentCoordinates: { x: 0, y: 0 },
        context: {
          active: { id: questionA },
          droppableContainers,
          droppableRects: new Map([
            [questionA, { top: 0, left: 0, width: 10, height: 10 }],
            [questionA2, { top: 20, left: 0, width: 10, height: 10 }],
            [questionB, { top: 40, left: 0, width: 10, height: 10 }],
          ]),
        },
      } as never
    );

    expect(keyboardTarget).toEqual({ x: 0, y: 20 });
  });
});
