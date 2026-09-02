import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/instruments/services/manage-instruments", () => ({
  createBaselineTemplateWithStructure: vi.fn(() =>
    Promise.resolve({ success: true, data: { id: "template-1" } })
  ),
  updateBaselineTemplateWithStructure: vi.fn(() => Promise.resolve({ success: true })),
  deleteBaselineTemplate: vi.fn(() => Promise.resolve({ success: true })),
  duplicateBaselineTemplate: vi.fn(() =>
    Promise.resolve({ success: true, data: { id: "template-dup" } })
  ),
}));

import {
  createDeanTemplateAction,
  updateDeanTemplateAction,
  duplicateDeanTemplateAction,
  deleteDeanTemplateAction,
} from "@/lib/actions/dean-template-actions";

import {
  createAdminTemplateAction,
  updateAdminTemplateAction,
  duplicateAdminTemplateAction,
  deleteAdminTemplateAction,
} from "@/lib/actions/admin-template-actions";

import {
  createBaselineTemplateWithStructure,
  updateBaselineTemplateWithStructure,
  deleteBaselineTemplate,
  duplicateBaselineTemplate,
} from "@/features/instruments/services/manage-instruments";

describe("template-actions security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const secretarySession = createAuthSessionSnapshot({
    userId: "11111111-1111-4111-a111-111111111111",
    roles: [ROLES.SECRETARY],
  });

  const studentSession = createAuthSessionSnapshot({
    userId: "33333333-3333-4333-a333-333333333333",
    roles: [ROLES.STUDENT],
  });

  function makeTemplateFormData(name = "Test Template", withId = false) {
    const structure = JSON.stringify([
      {
        key: "sec-1",
        title: "Section 1",
        description: null,
        order: 0,
        questions: [
          {
            key: "q-1",
            prompt: "Question 1",
            type: "likert" as const,
            order: 0,
            required: true,
          },
        ],
      },
    ]);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", "A test description");
    fd.set("template_type", "COURSE_BOUND");
    fd.set("is_faculty_accessible", "true");
    fd.set("structure", structure);
    if (withId) fd.set("id", "aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa");
    return fd;
  }

  // ─── Dean Actions ──────────────────────────────────────────────────────────

  describe("createDeanTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await createDeanTemplateAction(makeTemplateFormData());
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await createDeanTemplateAction(makeTemplateFormData());
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await createDeanTemplateAction(makeTemplateFormData());
      expect(createBaselineTemplateWithStructure).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, data: { id: "template-1" } });
    });
  });

  describe("updateDeanTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await updateDeanTemplateAction(makeTemplateFormData("Updated", true));
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await updateDeanTemplateAction(makeTemplateFormData("Updated", true));
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("forwards the exact reordered structure", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const reorderedStructure = [
        {
          key: "section-b",
          title: "Section B",
          description: undefined,
          order: 0,
          questions: [
            { key: "question-b", prompt: "Question B", type: "likert", order: 0, required: true },
          ],
        },
        {
          key: "section-a",
          title: "Section A",
          description: undefined,
          order: 1,
          questions: [
            { key: "question-a", prompt: "Question A", type: "likert", order: 0, required: true },
          ],
        },
      ];
      const formData = makeTemplateFormData("Updated", true);
      formData.set("structure", JSON.stringify(reorderedStructure));

      const result = await updateDeanTemplateAction(formData);

      expect(result).toEqual({
        success: true,
        data: { id: "aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa" },
      });
      expect(updateBaselineTemplateWithStructure).toHaveBeenCalledWith(
        expect.objectContaining({ structure: reorderedStructure })
      );
    });
  });

  describe("duplicateDeanTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await duplicateDeanTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await duplicateDeanTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await duplicateDeanTemplateAction("any-id");
      expect(duplicateBaselineTemplate).toHaveBeenCalledWith("any-id");
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteDeanTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await deleteDeanTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await deleteDeanTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteDeanTemplateAction("any-id");
      expect(deleteBaselineTemplate).toHaveBeenCalledWith("any-id");
      expect(result).toEqual({ success: true });
    });
  });

  // ─── Admin Actions ─────────────────────────────────────────────────────────

  describe("createAdminTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await createAdminTemplateAction(makeTemplateFormData());
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await createAdminTemplateAction(makeTemplateFormData());
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await createAdminTemplateAction(makeTemplateFormData());
      expect(createBaselineTemplateWithStructure).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, data: { id: "template-1" } });
    });
  });

  describe("updateAdminTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await updateAdminTemplateAction(makeTemplateFormData("Updated", true));
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await updateAdminTemplateAction(makeTemplateFormData("Updated", true));
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("forwards the exact reordered structure", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const reorderedStructure = [
        {
          key: "section-b",
          title: "Section B",
          description: undefined,
          order: 0,
          questions: [
            { key: "question-b", prompt: "Question B", type: "likert", order: 0, required: true },
          ],
        },
        {
          key: "section-a",
          title: "Section A",
          description: undefined,
          order: 1,
          questions: [
            { key: "question-a", prompt: "Question A", type: "likert", order: 0, required: true },
          ],
        },
      ];
      const formData = makeTemplateFormData("Updated", true);
      formData.set("structure", JSON.stringify(reorderedStructure));

      const result = await updateAdminTemplateAction(formData);

      expect(result).toEqual({
        success: true,
        data: { id: "aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa" },
      });
      expect(updateBaselineTemplateWithStructure).toHaveBeenCalledWith(
        expect.objectContaining({ structure: reorderedStructure })
      );
    });
  });

  describe("duplicateAdminTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await duplicateAdminTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await duplicateAdminTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await duplicateAdminTemplateAction("any-id");
      expect(duplicateBaselineTemplate).toHaveBeenCalledWith("any-id");
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteAdminTemplateAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await deleteAdminTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await deleteAdminTemplateAction("any-id");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("accepts right role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteAdminTemplateAction("any-id");
      expect(deleteBaselineTemplate).toHaveBeenCalledWith("any-id");
      expect(result).toEqual({ success: true });
    });
  });
});
