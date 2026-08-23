import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createTemplateMock,
  duplicateMock,
  toggleMock,
  deleteMock,
  baselineMock,
  publishMock,
  closeMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createTemplateMock: vi.fn(),
  duplicateMock: vi.fn(),
  toggleMock: vi.fn(),
  deleteMock: vi.fn(),
  baselineMock: vi.fn(),
  publishMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/instruments/services/manage-program-head-templates", () => ({
  createProgramHeadTemplate: createTemplateMock,
  updateProgramHeadTemplate: createTemplateMock,
  duplicateTemplate: duplicateMock,
  toggleTemplateActive: toggleMock,
  deleteProgramHeadTemplate: deleteMock,
  toggleFacultyAccessible: toggleMock,
}));
vi.mock("@/features/instruments/services/create-baseline-copy", () => ({ createBaselineCopy: baselineMock }));
vi.mock("@/features/evaluations/services/publish-central-deployment", () => ({
  publishCentralDeployment: publishMock,
  closeCentralDeployment: closeMock,
}));

const PROGRAM_ID = "00000000-0000-4000-8000-000000000001";

describe("Program Head Tools action freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTemplateMock.mockResolvedValue({ success: true, data: { id: "template-1" } });
    duplicateMock.mockResolvedValue({ success: true, data: { id: "copy-1" } });
    toggleMock.mockResolvedValue({ success: true, data: undefined });
    deleteMock.mockResolvedValue({ success: true, data: undefined });
    baselineMock.mockResolvedValue({ success: true, data: { id: "copy-1" } });
    publishMock.mockResolvedValue({
      success: true,
      data: { deploymentId: "deployment-1", assignmentCount: 1, status: "ACTIVE" },
    });
    closeMock.mockResolvedValue({ success: true, data: undefined });
  });

  it("revalidates the exact selected Tools path and never the obsolete deployment path", async () => {
    const { duplicateTemplateAction } = await import("@/lib/actions/program-head-template-actions");
    await duplicateTemplateAction(PROGRAM_ID, "template-1");

    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/tools`
    );
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/program-head/deployments");
  });

  it("revalidates the selected Tools path after a baseline copy", async () => {
    const { createBaselineCopyAction } = await import("@/lib/actions/program-head-baseline-actions");
    await createBaselineCopyAction(PROGRAM_ID, "baseline-1", "Copy", [], []);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/tools`
    );
  });

  it("revalidates the literal selected Tools pathname for deployment publish and close", async () => {
    const { publishCentralDeploymentAction, closeCentralDeploymentAction } = await import(
      "@/lib/actions/central-deployment-actions"
    );
    const formData = new FormData();
    formData.set("programId", PROGRAM_ID);
    formData.set("template_id", "00000000-0000-4000-8000-000000000002");
    formData.set("deployment_name", "BSED Tool");
    formData.set("target_stakeholder", "ALUMNI");
    formData.set("term_instance_id", "00000000-0000-4000-8000-000000000003");

    await publishCentralDeploymentAction(formData);
    await closeCentralDeploymentAction(PROGRAM_ID, "deployment-1");

    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/tools`
    );
    expect(revalidatePathMock).not.toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/tools?tab=published`
    );
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/program-head/deployments");
  });
});
