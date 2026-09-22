import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FacultyTemplateItem } from "@/features/instruments/services/list-faculty-templates";
import type { TemplateStructure } from "@/features/instruments/types";

const {
  getInstitutionalBaselineMock,
  listFacultyTemplatesMock,
  listInstitutionalBaselinesMock,
  listProgramGoOptionsMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  getInstitutionalBaselineMock: vi.fn(),
  listFacultyTemplatesMock: vi.fn(),
  listInstitutionalBaselinesMock: vi.fn(),
  listProgramGoOptionsMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("@/features/instruments/services/list-faculty-templates", () => ({
  listFacultyTemplates: listFacultyTemplatesMock,
}));
vi.mock("@/features/instruments/services/list-institutional-baselines", () => ({
  getInstitutionalBaseline: getInstitutionalBaselineMock,
  listInstitutionalBaselines: listInstitutionalBaselinesMock,
}));
vi.mock("@/features/instruments/services/manage-program-head-templates", () => ({
  listProgramGoOptions: listProgramGoOptionsMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
const programHeadBuilderProps = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/features/instruments/components/program-head-template-builder", () => ({
  ProgramHeadTemplateBuilder: (props: Record<string, unknown>) => {
    programHeadBuilderProps.props = props;
    return null;
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import ProgramHeadNewTemplatePage from "@/app/(app)/program-head/programs/[programId]/tools/new/page";
import ProgramHeadNewFromBaselinePage from "@/app/(app)/program-head/programs/[programId]/tools/new/from/[baselineId]/page";
import FacultyNewTemplatePage from "@/app/(app)/faculty/tools/new/page";

const PROGRAM_ID = "8b69c52b-918f-43db-864b-d5cb09d3b4e8";

const STRUCTURE: TemplateStructure = [
  {
    key: "section-1",
    title: "Outcomes",
    order: 0,
    questions: [
      { key: "question-1", prompt: "Rate your learning", type: "likert", order: 0, required: true },
      {
        key: "question-2",
        prompt: "Comment",
        type: "guided_open_ended",
        order: 1,
        required: false,
      },
    ],
  },
];

function facultyTemplate(overrides: Partial<FacultyTemplateItem>): FacultyTemplateItem {
  return {
    boundCourseCode: null,
    boundCourseId: null,
    boundCourseTitle: null,
    boundMajorId: null,
    boundProgramId: null,
    code: "CILO_EVAL",
    description: "Course-level CILO instrument",
    facultyOwnerId: null,
    id: "baseline-1",
    is_active: true,
    is_faculty_accessible: true,
    name: "Course Evaluation",
    programCode: null,
    programName: null,
    sourceTemplateId: null,
    structure: STRUCTURE,
    templateCiloQuestionBindings: [],
    templateGoQuestionBindings: [],
    templateType: "COURSE_BOUND",
    versionCount: 1,
    ...overrides,
  };
}

describe("Program Head new-template chooser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        selectedProgram: {
          code: "BSIT",
          id: PROGRAM_ID,
          name: "Bachelor of Science in Information Technology",
        },
      },
    });
  });

  it("lists each active baseline with its identifying details beside the blank start", async () => {
    listInstitutionalBaselinesMock.mockResolvedValue([
      {
        code: "CILO_EVAL",
        created_at: new Date("2026-01-01"),
        description: "Course-level CILO instrument",
        id: "baseline-1",
        is_active: true,
        is_faculty_accessible: true,
        name: "CILO Evaluation",
        structure: STRUCTURE,
        template_type: "COURSE_BOUND",
        updated_at: new Date("2026-01-01"),
      },
    ]);

    render(
      await ProgramHeadNewTemplatePage({ params: Promise.resolve({ programId: PROGRAM_ID }) })
    );

    expect(screen.getByText("CILO Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Course-level CILO instrument")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this baseline" })).toHaveAttribute(
      "href",
      `/program-head/programs/${PROGRAM_ID}/tools/new/from/baseline-1`
    );
    expect(screen.getByRole("button", { name: "Start blank" })).toHaveAttribute(
      "href",
      `/program-head/programs/${PROGRAM_ID}/tools/new/blank`
    );
  });
});

describe("Program Head baseline prefill route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    programHeadBuilderProps.props = undefined;
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        selectedProgram: {
          code: "BSIT",
          id: PROGRAM_ID,
          name: "Bachelor of Science in Information Technology",
        },
      },
    });
    listProgramGoOptionsMock.mockResolvedValue({ success: true, data: { gos: [] } });
    getInstitutionalBaselineMock.mockResolvedValue({
      code: "CILO_EVAL",
      created_at: new Date("2026-01-01"),
      description: "Course-level CILO instrument",
      id: "baseline-1",
      is_active: true,
      is_faculty_accessible: true,
      name: "CILO Evaluation",
      structure: STRUCTURE,
      template_type: "COURSE_BOUND",
      updated_at: new Date("2026-01-01"),
    });
  });

  it("seeds the builder from the chosen baseline and leaves the copy to the first save", async () => {
    render(
      await ProgramHeadNewFromBaselinePage({
        params: Promise.resolve({ baselineId: "baseline-1", programId: PROGRAM_ID }),
      })
    );

    const props = programHeadBuilderProps.props;
    expect(props).toMatchObject({
      programId: PROGRAM_ID,
      startingFrom: {
        id: "baseline-1",
        name: "CILO Evaluation",
        origin: "institutional-baseline",
      },
      initialData: {
        description: "Course-level CILO instrument",
        name: "CILO Evaluation",
        template_type: "COURSE_BOUND",
      },
    });
    // No template id: the builder creates the program-owned copy on save.
    expect(props!.initialData).not.toHaveProperty("id");
    expect(props).not.toHaveProperty("onSave");
  });
});

describe("Faculty new-template chooser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers shared templates only, beside the blank start", async () => {
    listFacultyTemplatesMock.mockResolvedValue({
      success: true,
      data: {
        program: { code: "BSIT", id: "program-1", name: "Information Technology" },
        templates: [
          facultyTemplate({}),
          facultyTemplate({
            facultyOwnerId: "faculty-1",
            id: "own-copy-1",
            name: "My CILO Copy",
            sourceTemplateId: "baseline-1",
          }),
        ],
      },
    });

    render(await FacultyNewTemplatePage());

    expect(screen.getByText("Course Evaluation")).toBeInTheDocument();
    expect(screen.queryByText("My CILO Copy")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this template" })).toHaveAttribute(
      "href",
      "/faculty/tools/new/from/baseline-1"
    );
    expect(screen.getByRole("button", { name: "Start blank" })).toHaveAttribute(
      "href",
      "/faculty/tools/new/blank"
    );
  });

  it("keeps the blank start when no template is shared with faculty", async () => {
    listFacultyTemplatesMock.mockResolvedValue({
      success: true,
      data: {
        program: { code: "BSIT", id: "program-1", name: "Information Technology" },
        templates: [facultyTemplate({ facultyOwnerId: "faculty-1", id: "own-copy-1" })],
      },
    });

    render(await FacultyNewTemplatePage());

    expect(screen.getByText("No shared templates available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start blank" })).toHaveAttribute(
      "href",
      "/faculty/tools/new/blank"
    );
  });
});
