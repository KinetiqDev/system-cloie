import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { TemplateBuilderProps } from "@/features/instruments/components/template-builder";
import { ProgramHeadTemplateBuilder } from "@/features/instruments/components/program-head-template-builder";

const {
  createBaselineCopyActionMock,
  createProgramHeadTemplateActionMock,
  pushMock,
  updateProgramHeadTemplateActionMock,
} = vi.hoisted(() => ({
  createBaselineCopyActionMock: vi.fn(),
  createProgramHeadTemplateActionMock: vi.fn(),
  pushMock: vi.fn(),
  updateProgramHeadTemplateActionMock: vi.fn(),
}));

let templateBuilderProps: TemplateBuilderProps | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/actions/program-head-baseline-actions", () => ({
  createBaselineCopyAction: createBaselineCopyActionMock,
}));
vi.mock("@/lib/actions/program-head-template-actions", () => ({
  createProgramHeadTemplateAction: createProgramHeadTemplateActionMock,
  updateProgramHeadTemplateAction: updateProgramHeadTemplateActionMock,
}));
vi.mock("@/features/instruments/components/template-builder", () => ({
  TemplateBuilder: (props: TemplateBuilderProps) => {
    templateBuilderProps = props;
    return null;
  },
}));

const PROGRAM_ID = "8b69c52b-918f-43db-864b-d5cb09d3b4e8";
const TEMPLATE_ID = "40aaf343-60ca-48a4-ad6d-9a6510313bd7";

describe("ProgramHeadTemplateBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templateBuilderProps = undefined;
    createBaselineCopyActionMock.mockResolvedValue({ success: true, data: { id: "copy-1" } });
    createProgramHeadTemplateActionMock.mockResolvedValue({ success: true });
    updateProgramHeadTemplateActionMock.mockResolvedValue({ success: true });
  });

  it("creates a template in the route-selected Program", async () => {
    render(<ProgramHeadTemplateBuilder programId={PROGRAM_ID} programLabel="BSIT" />);

    const formData = new FormData();
    formData.set("programId", "untrusted-program-id");
    await templateBuilderProps!.onSave(formData);

    expect(createProgramHeadTemplateActionMock).toHaveBeenCalledWith(formData);
    expect(updateProgramHeadTemplateActionMock).not.toHaveBeenCalled();
    expect(formData.get("programId")).toBe(PROGRAM_ID);
  });

  it("updates an existing Program-owned template in the route-selected Program", async () => {
    render(
      <ProgramHeadTemplateBuilder
        programId={PROGRAM_ID}
        programLabel="BSIT"
        initialData={initialData()}
      />
    );

    const formData = new FormData();
    await templateBuilderProps!.onSave(formData);

    expect(updateProgramHeadTemplateActionMock).toHaveBeenCalledWith(formData);
    expect(createProgramHeadTemplateActionMock).not.toHaveBeenCalled();
    expect(formData.get("programId")).toBe(PROGRAM_ID);
  });

  it("uses the dedicated baseline-copy action instead of create or update", async () => {
    render(
      <ProgramHeadTemplateBuilder
        programId={PROGRAM_ID}
        programLabel="BSIT"
        isInstitutionalBaseline
        initialData={initialData()}
      />
    );

    const structure = initialData().structure;
    await templateBuilderProps!.onSaveAsCopy!(TEMPLATE_ID, "BSIT copy", structure, []);

    expect(createBaselineCopyActionMock).toHaveBeenCalledWith(
      PROGRAM_ID,
      TEMPLATE_ID,
      "BSIT copy",
      structure,
      []
    );
    expect(createProgramHeadTemplateActionMock).not.toHaveBeenCalled();
    expect(updateProgramHeadTemplateActionMock).not.toHaveBeenCalled();
  });

  it("routes the saved instrument template to publication", () => {
    render(
      <ProgramHeadTemplateBuilder
        programId={PROGRAM_ID}
        programLabel="BSIT"
        initialData={initialData()}
      />
    );

    templateBuilderProps!.onPublish!(TEMPLATE_ID);

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining(TEMPLATE_ID));
  });
});

function initialData(): NonNullable<TemplateBuilderProps["initialData"]> {
  return {
    id: TEMPLATE_ID,
    name: "Institutional baseline",
    description: "",
    template_type: "PROGRAM_WIDE",
    is_active: true,
    is_faculty_accessible: false,
    structure: [],
  };
}
