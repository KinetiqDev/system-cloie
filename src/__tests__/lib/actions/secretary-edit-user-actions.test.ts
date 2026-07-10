import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";

const { resolveAuthSession, editUserBySecretary } = vi.hoisted(() => ({
  resolveAuthSession: vi.fn(),
  editUserBySecretary: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession }));
vi.mock("@/features/users/services/edit-user-by-secretary", () => ({ editUserBySecretary }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { editUserBySecretaryAction } from "@/lib/actions/secretary-edit-user-actions";

describe("editUserBySecretaryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSession.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      activeRole: "SECRETARY",
    });
    editUserBySecretary.mockResolvedValue({ success: true, data: { id: "user-id" } });
  });

  it("forwards Program Head assignment fields to service validation", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("role", SystemRole.PROGRAM_HEAD);
    formData.set("first_name", "Ana");
    formData.set("last_name", "Cruz");
    formData.set("program_head.program_id", "33333333-3333-4333-8333-333333333333");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(true);
    expect(editUserBySecretary).toHaveBeenCalledWith(expect.objectContaining({
      program_head: { program_id: "33333333-3333-4333-8333-333333333333" },
    }));
  });
});
