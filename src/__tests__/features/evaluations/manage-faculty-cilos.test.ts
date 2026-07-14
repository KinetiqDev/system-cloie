import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveFacultyManagedCilos, loadFacultyManagedCilos } from "@/features/evaluations/services/manage-faculty-cilos";

const {
  updateManyCilosMock,
  createManyCilosMock,
  findManyCilosMock,
  updateCiloMock,
  updateManyQuestionBindingsMock,
  resolveAuthSessionMock,
  listFacultyCourseContextsMock,
} = vi.hoisted(() => ({
  updateManyCilosMock: vi.fn(),
  createManyCilosMock: vi.fn(),
  findManyCilosMock: vi.fn(),
  updateCiloMock: vi.fn(),
  updateManyQuestionBindingsMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  listFacultyCourseContextsMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const mockTx = {
    cILO: {
      findMany: findManyCilosMock,
      updateMany: updateManyCilosMock,
      update: updateCiloMock,
      createMany: createManyCilosMock,
    },
    instrumentTemplateCiloQuestionBinding: {
      updateMany: updateManyQuestionBindingsMock,
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((fn) => fn(mockTx)),
      ...mockTx,
    },
  };
});

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/evaluations/services/list-faculty-course-contexts", () => ({
  listFacultyCourseContexts: listFacultyCourseContextsMock,
}));

describe("manage-faculty-cilos", () => {
  const mockContext = {
    courseId: "course-1",
    majorId: "major-1",
    programId: "program-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadFacultyManagedCilos", () => {
    it("rejects unauthorized access", async () => {
      resolveAuthSessionMock.mockResolvedValue(null);

      const result = await loadFacultyManagedCilos(mockContext);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Faculty authentication is required.");
      }
    });

    it("loads CILOs successfully for a valid context", async () => {
      resolveAuthSessionMock.mockResolvedValue({ userId: "faculty-1", roles: ["FACULTY"] });
      listFacultyCourseContextsMock.mockResolvedValue({
        success: true,
        data: [
          {
            courseId: "course-1",
            majorId: "major-1",
            programId: "program-1",
          },
        ],
      });
      findManyCilosMock.mockResolvedValue([
        { id: "cilo-1", description: "CILO 1" },
        { id: "cilo-2", description: "CILO 2" },
      ]);

      const result = await loadFacultyManagedCilos(mockContext);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        expect(result.data.items[0]).toEqual({ id: "cilo-1", description: "CILO 1" });
      }
    });
  });

  describe("saveFacultyManagedCilos", () => {
    it("archives removed CILOs while preserving their mappings", async () => {
      resolveAuthSessionMock.mockResolvedValue({ userId: "faculty-1", roles: ["FACULTY"] });
      listFacultyCourseContextsMock.mockResolvedValue({
        success: true,
        data: [
          {
            courseId: "course-1",
            majorId: "major-1",
            programId: "program-1",
          },
        ],
      });

      // Mock existing CILOs inside transaction
      findManyCilosMock.mockResolvedValueOnce([
        { id: "cilo-existing-1" },
        { id: "cilo-existing-2" },
      ]);

      // Return items on final findMany query
      findManyCilosMock.mockResolvedValueOnce([
        { id: "cilo-existing-1", description: "Updated CILO 1" },
        { id: "cilo-new-1", description: "New CILO" },
      ]);

      const payload = {
        ...mockContext,
        items: [
          { id: "cilo-existing-1", description: "Updated CILO 1" }, // Updated
          { description: "New CILO" },                              // Created
          // "cilo-existing-2" is omitted, so it should be archived
        ],
      };

      const result = await saveFacultyManagedCilos(payload);

      expect(result.success).toBe(true);

      expect(updateManyCilosMock).toHaveBeenCalledWith({
        where: { id: { in: ["cilo-existing-2"] } },
        data: { is_active: false },
      });

      // Verify update of existing CILO
      expect(updateCiloMock).toHaveBeenCalledWith({
        where: { id: "cilo-existing-1" },
        data: { description: "Updated CILO 1", is_active: true },
      });

      // Verify creation of new CILO
      expect(createManyCilosMock).toHaveBeenCalledWith({
        data: [
          {
            course_id: "course-1",
            created_by: "faculty-1",
            description: "New CILO",
          },
        ],
      });

      // Verify template binding snapshot update for modified CILO
      expect(updateManyQuestionBindingsMock).toHaveBeenCalledWith({
        where: { cilo_id: "cilo-existing-1" },
        data: { cilo_description_snapshot: "Updated CILO 1" },
      });
    });

    it("filters out empty or whitespace-only CILOs", async () => {
      resolveAuthSessionMock.mockResolvedValue({ userId: "faculty-1", roles: ["FACULTY"] });
      listFacultyCourseContextsMock.mockResolvedValue({
        success: true,
        data: [
          {
            courseId: "course-1",
            majorId: "major-1",
            programId: "program-1",
          },
        ],
      });
      findManyCilosMock.mockResolvedValueOnce([]); // no existing
      findManyCilosMock.mockResolvedValueOnce([]); // final return

      const payload = {
        ...mockContext,
        items: [
          { description: "   " },
          { description: "" },
        ],
      };

      await saveFacultyManagedCilos(payload);

      expect(createManyCilosMock).not.toHaveBeenCalled();
      expect(updateManyCilosMock).not.toHaveBeenCalled();
    });
  });
});
