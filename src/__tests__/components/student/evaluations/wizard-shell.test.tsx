import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WizardShell } from "@/features/responses/components/wizard-shell";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: pushMock,
  }),
}));

describe("WizardShell", () => {
  const mockSections = [
    {
      id: "section-1",
      name: "Section 1 Name",
      description: "First part",
      items: [
        {
          kind: "quantitative" as const,
          itemKey: "q1",
          prompt: "Question 1",
          scale: [1, 2, 3, 4, 5],
        },
      ],
    },
    {
      id: "section-2",
      name: "Section 2 Name",
      description: "Second part",
      items: [
        {
          kind: "quantitative" as const,
          itemKey: "q2",
          prompt: "Question 2",
          scale: [1, 2, 3, 4, 5],
        },
      ],
    },
  ];

  test("renders the wizard shell with sections", () => {
    render(<WizardShell assignmentId="test" title="Test Eval" sections={mockSections} />);

    expect(screen.getByText("Test Eval")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Section 1 Name" })).toBeDefined();
    expect(screen.getByText("Question 1")).toBeDefined();
  });

  test("shows progress indicator", () => {
    render(<WizardShell assignmentId="test" title="Test Eval" sections={mockSections} />);

    expect(screen.getByText(/Section 1 of 2/i)).toBeDefined();
  });

  test("does not render a save draft button in the evaluation footer", () => {
    render(<WizardShell assignmentId="test" title="Test Eval" sections={mockSections} />);

    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
  });

  test("saves forward navigation answers using workflow answer keys", async () => {
    const onSaveDraft = vi
      .fn()
      .mockResolvedValue({ savedAt: "2026-04-20T10:00:00.000Z", success: true });

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        onSaveDraft={onSaveDraft}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next Section/i }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith({
        answers: {
          "section-1:quantitative:q1": 4,
        },
        assignmentId: "assignment-1",
        sectionKey: "section-1",
      });
    });
  });

  test("saves when navigating to the previous section", async () => {
    const onSaveDraft = vi
      .fn()
      .mockResolvedValue({ savedAt: "2026-04-20T10:00:00.000Z", success: true });
    const sections = [
      mockSections[0],
      {
        id: "section-2",
        name: "Section 2 Name",
        description: "Second part",
        items: [{ kind: "qualitative" as const, promptKey: "remarks", prompt: "Remarks" }],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        onSaveDraft={onSaveDraft}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next Section/i }));

    await screen.findByText("Remarks");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Needs more lab time." } });
    fireEvent.click(screen.getByRole("button", { name: /Previous/i }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenLastCalledWith({
        answers: {
          "section-2:qualitative:remarks": "Needs more lab time.",
        },
        assignmentId: "assignment-1",
        sectionKey: "section-2",
      });
    });
  });

  test("inserts a suggested response into an empty qualitative answer", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={[
          {
            id: "section-1",
            name: "Qualitative Section",
            description: "Feedback",
            items: [
              {
                kind: "qualitative" as const,
                promptKey: "remarks",
                prompt: "Remarks",
                suggestedResponses: ["It is educational"],
              },
            ],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "It is educational" }));

    expect(screen.getByRole("textbox")).toHaveValue("It is educational");
  });

  test("appends suggested responses to existing qualitative answers with a comma", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={[
          {
            id: "section-1",
            name: "Qualitative Section",
            description: "Feedback",
            items: [
              {
                kind: "qualitative" as const,
                promptKey: "remarks",
                prompt: "Remarks",
                suggestedResponses: ["It is educational"],
              },
            ],
          },
        ]}
        initialAnswers={{
          "section-1:qualitative:remarks": "The course is good",
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "It is educational" }));

    expect(screen.getByRole("textbox")).toHaveValue("The course is good, It is educational");
  });

  test("keeps free typing intact after a suggested response is selected", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={[
          {
            id: "section-1",
            name: "Qualitative Section",
            description: "Feedback",
            items: [
              {
                kind: "qualitative" as const,
                promptKey: "remarks",
                prompt: "Remarks",
                suggestedResponses: ["It is educational"],
              },
            ],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "It is educational" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "It is educational and practical." },
    });

    expect(screen.getByRole("textbox")).toHaveValue("It is educational and practical.");
  });

  test("deduplicates repeated suggested responses and avoids duplicate-key warnings", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={[
          {
            id: "section-1",
            name: "Qualitative Section",
            description: "Feedback",
            items: [
              {
                kind: "qualitative" as const,
                promptKey: "remarks",
                prompt: "Remarks",
                suggestedResponses: [
                  "test response 1",
                  "test response 2",
                  "test response 2",
                  "test response 2 ",
                ],
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getAllByRole("button", { name: "test response 2" })).toHaveLength(1);
    expect(
      consoleErrorSpy.mock.calls.some(([message]) =>
        String(message).includes("Encountered two children with the same key")
      )
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });
  test("resumes at the first incomplete section when a draft exists", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        initialAnswers={{ "section-1:quantitative:q1": 4 }}
      />
    );

    expect(screen.getByText(/Section 2 of 2/i)).toBeDefined();
  });

  test("resumes at the last section when every section is complete", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        initialAnswers={{
          "section-1:quantitative:q1": 4,
          "section-2:quantitative:q2": 2,
        }}
      />
    );

    expect(screen.getByText(/Section 2 of 2/i)).toBeDefined();
  });

  test("shows Draft restored while a restored draft has not been re-saved yet", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        initialAnswers={{ "section-1:quantitative:q1": 4 }}
      />
    );

    expect(screen.getByText(/Draft restored/i)).toBeDefined();
  });

  test("navigates back to the dashboard using the explicit return route", () => {
    render(
      <WizardShell
        assignmentId="test"
        title="Test Eval"
        sections={mockSections}
        returnRoute="/student/dashboard"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(pushMock).toHaveBeenCalledWith("/student/dashboard");
  });

  test("marks completed sections in the section mini-map", () => {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        initialAnswers={{ "section-1:quantitative:q1": 4 }}
      />
    );

    expect(screen.getByRole("list", { name: /section completion/i })).toBeDefined();
    expect(screen.getByText("Section 1 completed")).toBeDefined();
    expect(screen.getByText("Section 2 in progress")).toBeDefined();
  });

  test("blocks forward navigation until qualitative responses are completed", async () => {
    const onSaveDraft = vi
      .fn()
      .mockResolvedValue({ savedAt: "2026-04-20T10:00:00.000Z", success: true });
    const sections = [
      mockSections[0],
      {
        id: "section-2",
        name: "Section 2 Name",
        description: "Second part",
        items: [
          { kind: "qualitative" as const, promptKey: "remarks", prompt: "Remarks", required: true },
        ],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        onSaveDraft={onSaveDraft}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /next section/i }));

    await screen.findByText("Remarks");
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    expect(await screen.findByText(/complete the written response/i)).toBeDefined();
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onSaveDraft.mock.calls[0][0]).toMatchObject({ sectionKey: "section-1" });

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    expect(await screen.findByText(/complete the written response/i)).toBeDefined();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Great course overall." } });
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith({
        answers: { "section-2:qualitative:remarks": "Great course overall." },
        assignmentId: "assignment-1",
        sectionKey: "section-2",
      });
    });
  });

  test("reports a combined remaining count when both kinds are unanswered", async () => {
    const sections = [
      {
        id: "section-1",
        name: "Section 1 Name",
        description: "First part",
        items: [
          {
            kind: "quantitative" as const,
            itemKey: "q1",
            prompt: "Question 1",
            scale: [1, 2, 3, 4, 5],
          },
          { kind: "qualitative" as const, promptKey: "remarks", prompt: "Remarks", required: true },
        ],
      },
    ];

    render(<WizardShell assignmentId="assignment-1" title="Test Eval" sections={sections} />);

    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    expect(
      await screen.findByText(
        /including the written responses?, before proceeding \(2 remaining\)/i
      )
    ).toBeDefined();
  });

  test("does not block forward navigation on optional qualitative items", async () => {
    const onSaveDraft = vi
      .fn()
      .mockResolvedValue({ savedAt: "2026-04-20T10:00:00.000Z", success: true });
    const sections = [
      mockSections[0],
      {
        id: "section-2",
        name: "Section 2 Name",
        description: "Second part",
        items: [
          {
            kind: "qualitative" as const,
            promptKey: "remarks",
            prompt: "Remarks",
            required: false,
          },
        ],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        onSaveDraft={onSaveDraft}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /next section/i }));

    await screen.findByText("Remarks");
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    expect(await screen.findByRole("dialog", { name: "Review Your Answers" })).toBeDefined();
  });

  test("treats sections with only optional qualitative items as complete for resume", () => {
    const sections = [
      mockSections[0],
      {
        id: "section-2",
        name: "Section 2 Name",
        description: "Second part",
        items: [
          {
            kind: "qualitative" as const,
            promptKey: "remarks",
            prompt: "Remarks",
            required: false,
          },
        ],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        initialAnswers={{ "section-1:quantitative:q1": 4 }}
      />
    );

    expect(screen.getByText(/Section 2 of 2/i)).toBeDefined();
    expect(screen.getByText("Section 2 completed")).toBeDefined();
  });

  test("blocks forward navigation on legacy qualitative items without required flag", async () => {
    const onSaveDraft = vi
      .fn()
      .mockResolvedValue({ savedAt: "2026-04-20T10:00:00.000Z", success: true });
    const sections = [
      mockSections[0],
      {
        id: "section-2",
        name: "Section 2 Name",
        description: "Second part",
        items: [
          {
            kind: "qualitative" as const,
            promptKey: "remarks",
            prompt: "Remarks",
          },
        ],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        onSaveDraft={onSaveDraft}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /next section/i }));

    await screen.findByText("Remarks");
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    expect(await screen.findByText(/complete the written response/i)).toBeDefined();
  });

  test("surfaces submission errors from the review dialog", async () => {
    const onSubmitResponse = vi.fn().mockResolvedValue({
      success: false,
      error: "Missing required answers: section-a:qualitative:remarks",
    });
    const sections = [
      {
        id: "section-1",
        name: "Section 1 Name",
        description: "First part",
        items: [
          {
            kind: "quantitative" as const,
            itemKey: "q1",
            prompt: "Question 1",
            scale: [1, 2, 3, 4, 5],
          },
        ],
      },
    ];

    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={sections}
        onSubmitResponse={onSubmitResponse}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    const dialog = await screen.findByRole("dialog", { name: "Review Your Answers" });
    fireEvent.click(within(dialog).getByRole("button", { name: /confirm & submit/i }));

    expect(await within(dialog).findByText(/missing required answers/i)).toBeDefined();
  });

  type WizardShellProps = Parameters<typeof WizardShell>[0];

  async function completeAndSubmit(overrides: Partial<WizardShellProps> = {}) {
    render(
      <WizardShell
        assignmentId="assignment-1"
        title="Test Eval"
        sections={mockSections}
        {...overrides}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /next section/i }));
    await screen.findByText("Question 2");
    fireEvent.click(screen.getByRole("radio", { name: /2/i }));
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    const dialog = await screen.findByRole("dialog", { name: "Review Your Answers" });
    fireEvent.click(within(dialog).getByRole("button", { name: /confirm & submit/i }));
  }

  test("shows first-section guidance explaining the rating scale, written responses, and chips", () => {
    render(<WizardShell assignmentId="test" title="Test Eval" sections={mockSections} />);

    expect(screen.getByText("How to answer")).toBeDefined();
    expect(screen.getByText(/rate each statement on the scale provided/i)).toBeDefined();
    expect(screen.getByText(/written-response questions must be answered/i)).toBeDefined();
    expect(screen.getByText(/suggested response chips are optional/i)).toBeDefined();
  });

  test("hides first-section guidance on later sections", async () => {
    render(<WizardShell assignmentId="test" title="Test Eval" sections={mockSections} />);

    fireEvent.click(screen.getByRole("radio", { name: /4/i }));
    fireEvent.click(screen.getByRole("button", { name: /next section/i }));

    await screen.findByText("Question 2");
    expect(screen.queryByText("How to answer")).not.toBeInTheDocument();
  });

  test("shows a submission receipt with response reference and server timestamp", async () => {
    await completeAndSubmit({
      onSubmitResponse: vi.fn().mockResolvedValue({
        success: true,
        responseId: "resp-abc-123",
        submittedAt: "2026-04-20T12:00:00.000Z",
      }),
    });

    expect(await screen.findByText("Evaluation Submitted!")).toBeDefined();
    expect(screen.getByText("Submission receipt")).toBeDefined();
    expect(screen.getByText("resp-abc-123")).toBeDefined();
    expect(screen.getByText("Submitted")).toBeDefined();
    expect(screen.getByText(/2026/)).toBeDefined();
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeDefined();
  });

  test("renders a view-submission link from the submitted history route", async () => {
    await completeAndSubmit({
      submittedHistoryRoute: "/student/history",
      onSubmitResponse: vi.fn().mockResolvedValue({
        success: true,
        responseId: "resp-abc-123",
      }),
    });

    const viewButton = await screen.findByRole("button", {
      name: /view submitted response/i,
    });
    fireEvent.click(viewButton);

    expect(pushMock).toHaveBeenCalledWith("/student/history/resp-abc-123");
  });

  test("omits the view-submission link when no history route is provided", async () => {
    await completeAndSubmit({
      onSubmitResponse: vi.fn().mockResolvedValue({
        success: true,
        responseId: "resp-abc-123",
      }),
    });

    expect(await screen.findByText("Evaluation Submitted!")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /view submitted response/i })
    ).not.toBeInTheDocument();
  });

  test("renders the success state safely without receipt data and no client timestamp", async () => {
    await completeAndSubmit({
      onSubmitResponse: vi.fn().mockResolvedValue({ success: true }),
    });

    expect(await screen.findByText("Evaluation Submitted!")).toBeDefined();
    expect(screen.queryByText("Submission receipt")).not.toBeInTheDocument();
    expect(screen.queryByText("Submitted")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to dashboard/i })).toBeDefined();
  });

  test("does not surface raw technical error text from submission failures", async () => {
    await completeAndSubmit({
      onSubmitResponse: vi.fn().mockResolvedValue({
        success: false,
        error: "Error: constraint violation on responses table",
      }),
    });

    const dialog = await screen.findByRole("dialog", { name: "Review Your Answers" });
    expect(await within(dialog).findByText(/couldn't submit your response/i)).toBeDefined();
    expect(within(dialog).queryByText(/constraint violation/i)).not.toBeInTheDocument();
  });

  test("falls back to a generic message when submission throws", async () => {
    await completeAndSubmit({
      onSubmitResponse: vi
        .fn()
        .mockRejectedValue(new Error("PrismaClientKnownRequestError: unique constraint")),
    });

    const dialog = await screen.findByRole("dialog", { name: "Review Your Answers" });
    expect(await within(dialog).findByText(/couldn't submit your response/i)).toBeDefined();
    expect(within(dialog).queryByText(/unique constraint/i)).not.toBeInTheDocument();
  });
});
