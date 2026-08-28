import { describe, expect, it, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import {
  previewCourseImportAction,
  confirmCourseImportAction,
} from "@/lib/actions/course-import-actions";
import { previewCourseImport } from "@/features/academic-structure/services/preview-course-import";
import { confirmCourseImport } from "@/features/academic-structure/services/confirm-course-import";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/academic-structure/services/preview-course-import", () => ({
  previewCourseImport: vi.fn(),
}));

vi.mock("@/features/academic-structure/services/confirm-course-import", () => ({
  confirmCourseImport: vi.fn(),
}));

describe("Course Import Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("previewCourseImportAction", () => {
    it("validates input schema and calls previewCourseImport", async () => {
      vi.mocked(previewCourseImport).mockResolvedValue({
        success: true,
        data: {
          rows: [],
          summary: { total: 0, ready: 0, attention: 0, created: 0, notCreated: 0, notProcessed: 0 },
        },
      });

      const result = await previewCourseImportAction({
        mode: "general-education",
        rows: [{ sourceIndex: 2, input: { course_code: "GEMATH" } }],
      });

      expect(result.success).toBe(true);
      expect(previewCourseImport).toHaveBeenCalledWith({
        mode: "general-education",
        rows: [{ sourceIndex: 2, input: { course_code: "GEMATH" } }],
      });
    });

    it("rejects invalid schema inputs before service execution", async () => {
      const result = await previewCourseImportAction({
        mode: "invalid-mode",
        rows: [],
      });

      expect(result.success).toBe(false);
      expect(previewCourseImport).not.toHaveBeenCalled();
    });
  });

  describe("confirmCourseImportAction", () => {
    it("revalidates secretary path when secretary courses created", async () => {
      vi.mocked(confirmCourseImport).mockResolvedValue({
        success: true,
        data: {
          rows: [],
          summary: { total: 1, ready: 0, attention: 0, created: 1, notCreated: 0, notProcessed: 0 },
        },
      });

      const result = await confirmCourseImportAction({
        mode: "secretary",
        rows: [{ sourceIndex: 2, input: { course_code: "IT 101" } }],
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/secretary/courses");
    });

    it("revalidates general-education path when Gen Ed courses created", async () => {
      vi.mocked(confirmCourseImport).mockResolvedValue({
        success: true,
        data: {
          rows: [],
          summary: { total: 1, ready: 0, attention: 0, created: 1, notCreated: 0, notProcessed: 0 },
        },
      });

      const result = await confirmCourseImportAction({
        mode: "general-education",
        rows: [{ sourceIndex: 2, input: { course_code: "GEMATH" } }],
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/gen-ed-coordinator/courses");
    });

    it("revalidates program head courses path when program head courses created", async () => {
      const programId = "11111111-1111-4111-8111-111111111111";
      vi.mocked(confirmCourseImport).mockResolvedValue({
        success: true,
        data: {
          rows: [],
          summary: { total: 1, ready: 0, attention: 0, created: 1, notCreated: 0, notProcessed: 0 },
        },
      });

      const result = await confirmCourseImportAction({
        mode: "program-head",
        selectedProgramId: programId,
        rows: [{ sourceIndex: 2, input: { course_code: "IT 101" } }],
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith(`/program-head/programs/${programId}/courses`);
    });
  });
});
