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
    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.objectContaining({
        program_head: { program_id: "33333333-3333-4333-8333-333333333333" },
      })
    );
  });

  it("forwards Alumni fields and confirmation token", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("role", SystemRole.ALUMNI);
    formData.set("first_name", "Ana");
    formData.set("last_name", "Cruz");
    formData.set("alumni.program_id", "33333333-3333-4333-8333-333333333333");
    formData.set("alumni.graduation_year", "2020");
    formData.set("alumni.verification_status", "APPROVED");
    formData.set("confirmationToken", "token");

    await editUserBySecretaryAction(formData);

    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmationToken: "token",
        alumni: {
          graduation_year: 2020,
          program_id: "33333333-3333-4333-8333-333333333333",
          major_id: null,
          verification_status: "APPROVED",
        },
      })
    );
  });

  it("forwards Industry Partner fields and confirmation token", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("role", SystemRole.INDUSTRY_PARTNER);
    formData.set("first_name", "Ana");
    formData.set("last_name", "Cruz");
    formData.set("industry_partner.company_name", "CLOIE Labs");
    formData.set("industry_partner.position", "Hiring Manager");
    formData.set("industry_partner.program_id", "33333333-3333-4333-8333-333333333333");
    formData.set("industry_partner.verification_status", "APPROVED");
    formData.set("confirmationToken", "token");

    await editUserBySecretaryAction(formData);

    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmationToken: "token",
        industry_partner: {
          company_name: "CLOIE Labs",
          position: "Hiring Manager",
          program_id: "33333333-3333-4333-8333-333333333333",
          verification_status: "APPROVED",
        },
      })
    );
  });
});
