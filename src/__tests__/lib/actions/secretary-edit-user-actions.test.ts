import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("forwards the complete Program Head assignment set to service validation", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");
    formData.set("program_head.present", "1");
    formData.append("program_head.program_ids", "33333333-3333-4333-8333-333333333333");
    formData.append("program_head.program_ids", "44444444-4444-4444-8444-444444444444");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(true);
    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.objectContaining({
        program_head: {
          program_ids: [
            "33333333-3333-4333-8333-333333333333",
            "44444444-4444-4444-8444-444444444444",
          ],
        },
      })
    );
  });

  it("forwards an empty assignment set when the Program Head section is submitted without selections", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");
    formData.set("program_head.present", "1");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(true);
    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.objectContaining({
        program_head: { program_ids: [] },
      })
    );
  });

  it("does not include a Program Head section when the form omits it", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(true);
    expect(editUserBySecretary).toHaveBeenCalledWith(
      expect.not.objectContaining({ program_head: expect.anything() })
    );
  });

  it("rejects duplicate Program IDs before any service call", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");
    formData.set("program_head.present", "1");
    formData.append("program_head.program_ids", "33333333-3333-4333-8333-333333333333");
    formData.append("program_head.program_ids", "33333333-3333-4333-8333-333333333333");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/duplicate programs are not allowed/i);
    expect(editUserBySecretary).not.toHaveBeenCalled();
  });

  it("forwards Alumni fields and confirmation token", async () => {
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");
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
    formData.set("name", "Ana Cruz");
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

  it("rejects self-edit before calling the service", async () => {
    const formData = new FormData();
    formData.set("id", "11111111-1111-4111-8111-111111111111");
    formData.set("name", "Ana Cruz");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(false);
    expect(editUserBySecretary).not.toHaveBeenCalled();
  });

  it("rejects non-Secretary callers before calling the service", async () => {
    resolveAuthSession.mockResolvedValue({ userId: "dean-id", activeRole: "DEAN" });
    const formData = new FormData();
    formData.set("id", "22222222-2222-4222-8222-222222222222");
    formData.set("name", "Ana Cruz");

    const result = await editUserBySecretaryAction(formData);

    expect(result.success).toBe(false);
    expect(editUserBySecretary).not.toHaveBeenCalled();
  });
});
