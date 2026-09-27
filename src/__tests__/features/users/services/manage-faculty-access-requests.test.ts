/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveFacultyAccessRequest,
  rejectFacultyAccessRequest,
} from "@/features/users/services/manage-faculty-access-requests";
import { prisma } from "@/lib/db/prisma";

const {
  findUniqueRequestMock,
  updateRequestMock,
  upsertAffiliationMock,
  updateManyAffiliationMock,
  deleteManyAffiliationMock,
  upsertUserRoleMock,
  findFirstAffiliationMock,
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
  findUniqueProgramMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    program: { findUnique: findUniqueProgramMock },
    facultyAccessRequest: { findUnique: findUniqueRequestMock },
    facultyProgramAffiliation: { findFirst: findFirstAffiliationMock },
    $transaction: transactionMock,
  },
}));

const FACULTY_ID = "faculty-1";
const PROGRAM_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_PROGRAM_ID = "660e8400-e29b-41d4-a716-446655441111";

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

  it("is idempotent for an already approved request and leaves other programs alone", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "APPROVED",
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

  it("does not touch a program the request never named", async () => {
    findUniqueRequestMock.mockResolvedValue({
      id: "request-1",
      program_id: PROGRAM_ID,
      status: "APPROVED",
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
