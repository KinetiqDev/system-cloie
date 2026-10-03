/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveFacultyAccessRequest,
  createFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";

const {
  findUniqueRequestMock,
  updateRequestMock,
  upsertAffiliationMock,
  updateManyAffiliationMock,
  deleteManyAffiliationMock,
  upsertUserRoleMock,
  findFirstAffiliationMock,
  upsertRequestMock,
  findUniqueProgramMock,
  transactionMock,
} = vi.hoisted(() => ({
  findUniqueRequestMock: vi.fn(),
  updateRequestMock: vi.fn(),
  upsertAffiliationMock: vi.fn(),
  updateManyAffiliationMock: vi.fn(),
  deleteManyAffiliationMock: vi.fn(),
  upsertUserRoleMock: vi.fn(),
  findFirstAffiliationMock: vi.fn(),
  upsertRequestMock: vi.fn(),
  findUniqueProgramMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: { findUnique: findUniqueProgramMock },
    facultyAccessRequest: { findUnique: findUniqueRequestMock, upsert: upsertRequestMock },
    $transaction: transactionMock,
  },
}));

const FACULTY_ID = "faculty-1";
const PROGRAM_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_PROGRAM_ID = "660e8400-e29b-41d4-a716-446655441111";

describe("createFacultyAccessRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        facultyAccessRequest: { upsert: upsertRequestMock },
        facultyProgramAffiliation: { findFirst: findFirstAffiliationMock },
        userRole: { upsert: upsertUserRoleMock },
      })
    );
    upsertRequestMock.mockResolvedValue({ status: "PENDING" });
    findUniqueProgramMock.mockResolvedValue({ id: PROGRAM_ID, is_active: true });
    findFirstAffiliationMock.mockResolvedValue(null);
  });

  it("writes a PENDING request and no program affiliation", async () => {
    const result = await createFacultyAccessRequest({
      userId: FACULTY_ID,
      programId: PROGRAM_ID,
    });

    expect(result).toEqual({ success: true, status: "PENDING" });
    expect(upsertUserRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ create: { user_id: FACULTY_ID, role: "FACULTY" } })
    );
    // The affiliation is deliberately absent: approval is what grants it, so a
    // self-request never reaches an active Faculty workspace on its own.
    expect(upsertAffiliationMock).not.toHaveBeenCalled();
    expect(upsertRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { user_id: FACULTY_ID, program_id: PROGRAM_ID },
        update: expect.objectContaining({ status: "PENDING", decided_by: null }),
      })
    );
  });

  it("refuses an archived program without opening a transaction", async () => {
    findUniqueProgramMock.mockResolvedValue({ id: PROGRAM_ID, is_active: false });

    const result = await createFacultyAccessRequest({
      userId: FACULTY_ID,
      programId: PROGRAM_ID,
    });

    expect(result.success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuses an account that already holds an active affiliation", async () => {
    findFirstAffiliationMock.mockResolvedValue({ id: "affiliation-1" });

    const result = await createFacultyAccessRequest({
      userId: FACULTY_ID,
      programId: PROGRAM_ID,
    });

    expect(result.success).toBe(false);
    expect(upsertRequestMock).not.toHaveBeenCalled();
  });
});

describe("rejectFacultyAccessRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        facultyAccessRequest: { findUnique: findUniqueRequestMock, update: updateRequestMock },
        facultyProgramAffiliation: {
          upsert: upsertAffiliationMock,
          updateMany: updateManyAffiliationMock,
          deleteMany: deleteManyAffiliationMock,
        },
        userRole: { upsert: upsertUserRoleMock },
      })
    );
  });

  it("deactivates only the approved affiliation, never deleting a row", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "APPROVED",
      user: { is_active: true },
    });

    const result = await rejectFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
      note: "Not eligible this term",
    });

    expect(result).toEqual({ success: true, status: "REJECTED" });
    // Deactivation, not deletion: affiliation history stays on the account.
    expect(deleteManyAffiliationMock).not.toHaveBeenCalled();
    // Scoped to the one program this request approved, so a Secretary-managed
    // primary or additional program is untouched.
    expect(updateManyAffiliationMock).toHaveBeenCalledWith({
      where: { faculty_id: FACULTY_ID, program_id: PROGRAM_ID, is_active: true },
      data: { is_active: false, is_primary: false },
    });
  });

  it("leaves every affiliation untouched when the request was still pending", async () => {
    // A PENDING request never created an affiliation, so rejecting it must not
    // touch affiliations at all — previously it deleted all active ones.
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: true },
    });

    const result = await rejectFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result).toEqual({ success: true, status: "REJECTED" });
    expect(updateManyAffiliationMock).not.toHaveBeenCalled();
    expect(deleteManyAffiliationMock).not.toHaveBeenCalled();
  });

  it("records the decision on the request", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: true },
    });

    await rejectFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
      note: "No teaching assignment",
    });

    expect(updateRequestMock).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({ status: "REJECTED", decided_by: "secretary-1" }),
    });
  });

  it("fails closed when the request does not exist", async () => {
    findUniqueRequestMock.mockResolvedValue(null);

    const result = await rejectFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result.success).toBe(false);
    expect(updateRequestMock).not.toHaveBeenCalled();
  });
});

describe("approveFacultyAccessRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        facultyAccessRequest: { findUnique: findUniqueRequestMock, update: updateRequestMock },
        facultyProgramAffiliation: {
          upsert: upsertAffiliationMock,
          updateMany: updateManyAffiliationMock,
          deleteMany: deleteManyAffiliationMock,
        },
        userRole: { upsert: upsertUserRoleMock },
      })
    );
  });

  it("grants the requested program and never deletes other affiliations", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: true },
      program: { is_active: true },
    });

    const result = await approveFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result).toEqual({ success: true, status: "APPROVED" });
    expect(upsertAffiliationMock).toHaveBeenCalledWith({
      where: { faculty_id_program_id: { faculty_id: FACULTY_ID, program_id: PROGRAM_ID } },
      update: { is_active: true, is_primary: true },
      create: {
        faculty_id: FACULTY_ID,
        program_id: PROGRAM_ID,
        is_active: true,
        is_primary: true,
      },
    });
    expect(deleteManyAffiliationMock).not.toHaveBeenCalled();
    expect(updateManyAffiliationMock).not.toHaveBeenCalled();
  });

  it("refuses to approve a deactivated applicant", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: false },
      program: { is_active: true },
    });

    const result = await approveFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result.success).toBe(false);
    expect(upsertAffiliationMock).not.toHaveBeenCalled();
    expect(updateRequestMock).not.toHaveBeenCalled();
  });

  it("is idempotent for an already approved request and leaves other programs alone", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "APPROVED",
      user: { is_active: true },
      program: { is_active: true },
    });

    const result = await approveFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result).toEqual({ success: true, status: "APPROVED" });
    // Already approved: no second decision write, no affiliation rewrite, and
    // certainly no removal of an unrelated additional program.
    expect(updateRequestMock).not.toHaveBeenCalled();
    expect(upsertAffiliationMock).not.toHaveBeenCalled();
    expect(deleteManyAffiliationMock).not.toHaveBeenCalled();
    expect(updateManyAffiliationMock).not.toHaveBeenCalled();
  });

  it("refuses a program archived while the request waited for review", async () => {
    // The request-time check saw an active program. Program activity is
    // re-read inside this transaction, so an archived program can never
    // receive a new active affiliation through a stale PENDING row.
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: true },
      program: { is_active: false },
    });

    const result = await approveFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    expect(result.success).toBe(false);
    expect(upsertAffiliationMock).not.toHaveBeenCalled();
    expect(updateRequestMock).not.toHaveBeenCalled();
  });

  it("reads the program inside the decision transaction, not before it", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "PENDING",
      user: { is_active: true },
      program: { is_active: true },
    });

    await approveFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    const selected = findUniqueRequestMock.mock.calls[0]?.[0] as {
      select: { program: { select: { is_active: boolean } } };
    };
    expect(selected.select.program.select.is_active).toBe(true);
  });

  it("does not touch a program the request never named", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "APPROVED",
      user: { is_active: true },
    });

    await rejectFacultyAccessRequest({
      requestUserId: FACULTY_ID,
      decidedByUserId: "secretary-1",
    });

    const revoked = updateManyAffiliationMock.mock.calls[0]?.[0] as {
      where: { program_id: string };
    };
    expect(revoked.where.program_id).toBe(PROGRAM_ID);
    expect(revoked.where.program_id).not.toBe(OTHER_PROGRAM_ID);
  });
});
