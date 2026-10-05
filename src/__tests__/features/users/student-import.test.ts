import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import {
  commitStudentImport,
  previewStudentImport,
} from "@/features/users/services/student-import";
import { STUDENT_IMPORT_TEMPLATE } from "@/features/users/services/student-import-csv";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: { findMany: vi.fn() },
    academicTermInstance: { findFirst: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const bytes = new TextEncoder().encode(
  `${STUDENT_IMPORT_TEMPLATE}Ana,ana@acd.edu.ph,BSIT,,1,Morning\nBen,ben@acd.edu.ph,BSIT,,2,Evening`
);
const tx = {
  program: { findUnique: vi.fn() },
  academicTermInstance: { findFirst: vi.fn() },
  user: { create: vi.fn() },
  userRole: { create: vi.fn() },
  studentAcademicProfile: { create: vi.fn() },
  studentEnrollment: { create: vi.fn() },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.program.findMany).mockResolvedValue([
    { id, code: "BSIT", name: "IT", majors: [] },
  ] as never);
  vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
    id: "term",
    semester: "FIRST",
    term: null,
    school_year: { code: "2025-2026" },
  } as never);
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  tx.program.findUnique.mockResolvedValue({ is_active: true, majors: [] });
  tx.academicTermInstance.findFirst.mockResolvedValue({ id: "term" });
  tx.user.create.mockResolvedValue({ id: "student" });
  vi.mocked(prisma.$transaction).mockImplementation(
    async (callback) => (callback as unknown as (t: typeof tx) => Promise<unknown>)(tx) as never
  );
});
async function token() {
  const result = await previewStudentImport(bytes, "secretary");
  if (!result.success) throw new Error("preview");
  return result.token;
}
describe("Student import preview and commit", () => {
  it("previews without writes and skips all existing emails", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "ana@acd.edu.ph" }] as never);
    const result = await previewStudentImport(bytes, "secretary");
    expect(result).toMatchObject({
      success: true,
      rows: [{ status: "Skipped" }, { status: "Ready" }],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("rejects duplicate existing emails before any writes", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "ana@acd.edu.ph" }] as never);
    const duplicateBytes = new TextEncoder().encode(
      `${STUDENT_IMPORT_TEMPLATE}Ana,ana@acd.edu.ph,BSIT,,1,Morning\nAna,ANA@acd.edu.ph,BSIT,,1,Morning\nBen,ben@acd.edu.ph,BSIT,,2,Evening`
    );
    const preview = await previewStudentImport(duplicateBytes, "secretary");
    expect(preview).toMatchObject({
      success: true,
      rows: [{ status: "Needs correction" }, { status: "Needs correction" }, { status: "Ready" }],
    });
    if (!preview.success) throw new Error("preview");
    expect(await commitStudentImport(duplicateBytes, "secretary", preview.token)).toMatchObject({
      success: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("writes complete students in per-row serializable transactions", async () => {
    const result = await commitStudentImport(bytes, "secretary", await token());
    expect(result).toMatchObject({ rows: [{ status: "Created" }, { status: "Created" }] });
    expect(tx.userRole.create).toHaveBeenCalledWith({
      data: { user_id: "student", role: "STUDENT" },
    });
    expect(tx.studentEnrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "SECRETARY", term_instance_id: "term" }),
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
  it("preserves deferred enrollment", async () => {
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);
    tx.academicTermInstance.findFirst.mockResolvedValue(null);
    expect(await commitStudentImport(bytes, "secretary", await token())).toMatchObject({
      rows: [{ status: "Created" }, { status: "Created" }],
    });
    expect(tx.studentEnrollment.create).not.toHaveBeenCalled();
  });
  it("rejects another actor, changed bytes, forged and expired reviews", async () => {
    const review = await token();
    for (const [file, actor, signed] of [
      [bytes, "dean", review],
      [new TextEncoder().encode("changed"), "secretary", review],
      [bytes, "secretary", review + "x"],
    ] as const)
      expect(await commitStudentImport(file, actor, signed)).toMatchObject({ success: false });
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 16 * 60 * 1000);
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({ success: false });
    vi.restoreAllMocks();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("rejects changed period before writes", async () => {
    const review = await token();
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "different",
      semester: "FIRST",
      term: null,
      school_year: { code: "2025-2026" },
    } as never);
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({ success: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("fails rows when placement changes inside a transaction", async () => {
    const review = await token();
    tx.program.findUnique.mockResolvedValue({ is_active: false, majors: [] });
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({
      rows: [{ status: "Failed" }, { status: "Failed" }],
    });
    expect(tx.user.create).not.toHaveBeenCalled();
  });
  it("explains a period change after an earlier row succeeds", async () => {
    const review = await token();
    tx.academicTermInstance.findFirst
      .mockResolvedValueOnce({ id: "term" })
      .mockResolvedValueOnce({ id: "changed" });
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({
      rows: [
        { status: "Created" },
        { status: "Failed", message: expect.stringContaining("active academic period changed") },
      ],
    });
    expect(tx.user.create).toHaveBeenCalledTimes(1);
  });
  it("skips successful rows on retry and never changes them", async () => {
    const review = await token();
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { email: "ana@acd.edu.ph" },
      { email: "ben@acd.edu.ph" },
    ] as never);
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({
      rows: [{ status: "Skipped" }, { status: "Skipped" }],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("reports a failed transaction while allowing the next row to finish", async () => {
    const review = await token();
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("write failed"));
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({
      rows: [{ status: "Failed" }, { status: "Created" }],
    });
  });
  it("treats a concurrent email conflict as skipped", async () => {
    const review = await token();
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other" } as never);
    expect(await commitStudentImport(bytes, "secretary", review)).toMatchObject({
      rows: [{ status: "Skipped" }, { status: "Created" }],
    });
  });
});
