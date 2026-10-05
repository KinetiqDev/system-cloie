import { beforeEach, describe, expect, it, vi } from "vitest";
import { studentImportAction } from "@/lib/actions/student-import-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  previewStudentImport,
  commitStudentImport,
} from "@/features/users/services/student-import";
import { revalidatePath } from "next/cache";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: vi.fn() }));
vi.mock("@/features/users/services/student-import", () => ({
  previewStudentImport: vi.fn(),
  commitStudentImport: vi.fn(),
}));
const form = () => {
  const value = new FormData();
  value.set("file", new File(["csv"], "students.csv"));
  return value;
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveAuthSession).mockResolvedValue({
    userId: "secretary",
    activeRole: "SECRETARY",
  } as never);
});
describe("Student import authorization boundary", () => {
  it.each([null, "DEAN", "STUDENT", "FACULTY"])(
    "rejects active role %s before reads",
    async (role) => {
      vi.mocked(resolveAuthSession).mockResolvedValue(
        role ? ({ userId: "other", activeRole: role } as never) : null
      );
      expect(await studentImportAction(form())).toMatchObject({ success: false });
      expect(previewStudentImport).not.toHaveBeenCalled();
      expect(commitStudentImport).not.toHaveBeenCalled();
    }
  );
  it("rejects oversized files and nonfiles", async () => {
    expect(await studentImportAction(new FormData())).toMatchObject({ success: false });
    const value = form();
    value.set("file", new File([new Uint8Array(262145)], "students.csv"));
    expect(await studentImportAction(value)).toMatchObject({ success: false });
  });
  it("returns preview without mutation and strips database inputs", async () => {
    vi.mocked(previewStudentImport).mockResolvedValue({
      success: true,
      rows: [{ line: 2, input: {} as never, status: "Ready", message: "New", data: {} as never }],
      termId: null,
      termLabel: null,
      token: "signed",
    });
    const result = await studentImportAction(form());
    expect(result).toMatchObject({ success: true, token: "signed" });
    if (result.success) expect(result.rows[0]).not.toHaveProperty("data");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("revalidates Users and dashboard after commit", async () => {
    vi.mocked(commitStudentImport).mockResolvedValue({ success: true, rows: [] });
    const value = form();
    value.set("token", "signed");
    await studentImportAction(value);
    expect(commitStudentImport).toHaveBeenCalledWith(expect.any(Uint8Array), "secretary", "signed");
    expect(revalidatePath).toHaveBeenCalledWith("/secretary/users");
    expect(revalidatePath).toHaveBeenCalledWith("/secretary");
  });
});
