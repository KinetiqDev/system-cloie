import crypto from "node:crypto";
import { DeploymentType, ResponseStatus, SystemRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { D } from "../../../../prisma/seed/constants/ids";

/**
 * Response lifecycle invariants: one-response enforcement, atomic submission,
 * rollback on failure, and concurrent second-submission behavior (§61, issue
 * #544).
 *
 * Every test creates disposable rows (respondent user, evaluation assignment,
 * response items) within the seeded fixture and cleans up its owned rows in
 * the finally block. The seeded GESTECH evaluation (D.CB_BSIT_GESTECH) is used
 * as the deployment target because it is the designated zero-response
 * fixture, but each assignment is owned by a fresh test user so the seeded
 * catalog is never mutated.
 */

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

async function seedTestAssignment() {
  const suffix = randomSuffix();
  const userId = crypto.randomUUID();
  const evalAssignmentId = crypto.randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      email: `db-test-${suffix}--lifecycle-invariant-test@cloie.test`,
      name: "Lifecycle Invariant Test",
    },
  });
  await prisma.userRole.create({
    data: { user_id: userId, role: SystemRole.STUDENT },
  });

  // Linked to the seeded GESTECH zero-response evaluation.
  await prisma.evaluationAssignment.create({
    data: {
      id: evalAssignmentId,
      course_bound_id: D.CB_BSIT_GESTECH,
      respondent_id: userId,
    },
  });

  return { evalAssignmentId, userId };
}

async function cleanup({
  evalAssignmentIds,
  userId,
}: {
  evalAssignmentIds: string[];
  userId: string;
}) {
  // Deleting the assignment cascades to its response and response items.
  await prisma.evaluationAssignment.deleteMany({ where: { id: { in: evalAssignmentIds } } });
  await prisma.userRole.deleteMany({ where: { user_id: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function createResponse(
  assignmentId: string,
  respondentId: string,
  deploymentId: string,
  status: ResponseStatus = ResponseStatus.IN_PROGRESS
): Promise<{ id: string }> {
  return prisma.response.create({
    data: {
      assignment_id: assignmentId,
      deployment_id: deploymentId,
      deployment_type: DeploymentType.COURSE_BOUND,
      respondent_id: respondentId,
      status,
    },
  });
}

async function addQuantItems(responseId: string, count: number) {
  const items = Array.from({ length: count }, (_, i) => ({
    item_key: `test-item-${i}`,
    rating_value: 4,
    response_id: responseId,
    section_key: "test-section",
  }));
  await prisma.quantitativeResponseItem.createMany({ data: items });
  return items;
}

async function addQualItem(responseId: string) {
  const item = {
    prompt_key: `test-qual-${randomSuffix()}`,
    response_id: responseId,
    section_key: "test-section",
    text_content: "Test qualitative content",
  };
  await prisma.qualitativeResponseItem.createMany({ data: [item] });
  return item;
}

/**
 * Mirrors the app's submission transaction (submit-student-evaluation-response):
 * resolve the response by assignment, reject a SUBMITTED response, replace all
 * answer items, then flip status and freeze submitted_at.
 */
function simulateSubmissionTransaction(
  assignmentId: string,
  items: Array<{ item_key: string; rating_value: number; response_id: string; section_key: string }>
) {
  return prisma.$transaction(async (tx) => {
    const response = await tx.response.findUnique({
      where: { assignment_id: assignmentId },
    });

    if (!response) throw new Error("RESPONSE_NOT_FOUND");
    if (response.status === ResponseStatus.SUBMITTED) throw new Error("ALREADY_SUBMITTED");

    await tx.quantitativeResponseItem.deleteMany({ where: { response_id: response.id } });
    await tx.qualitativeResponseItem.deleteMany({ where: { response_id: response.id } });

    if (items.length > 0) {
      await tx.quantitativeResponseItem.createMany({ data: items });
    }

    await tx.response.update({
      where: { id: response.id },
      data: { status: ResponseStatus.SUBMITTED, submitted_at: new Date() },
    });
  });
}

function errorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Response lifecycle invariants",
  () => {
    it("enforces one response per assignment via the unique assignment_id constraint", async () => {
      const { evalAssignmentId, userId } = await seedTestAssignment();
      try {
        await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);

        let duplicateError: unknown;
        try {
          await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);
        } catch (error) {
          duplicateError = error;
        }
        expect(
          errorCode(duplicateError),
          "second response row must violate the unique constraint"
        ).toBe("P2002");

        const count = await prisma.response.count({
          where: { assignment_id: evalAssignmentId },
        });
        expect(count).toBe(1);
      } finally {
        await cleanup({ evalAssignmentIds: [evalAssignmentId], userId });
      }
    }, 30000);

    it("commits the submission atomically: all items written before status flips to SUBMITTED", async () => {
      const { evalAssignmentId, userId } = await seedTestAssignment();
      try {
        const response = await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);
        const originalItems = await addQuantItems(response.id, 3);
        await addQualItem(response.id);

        const newItems = originalItems.map((item, i) => ({
          ...item,
          rating_value: 5,
          item_key: `test-item-updated-${i}`,
        }));

        await simulateSubmissionTransaction(evalAssignmentId, newItems);

        const saved = await prisma.response.findUnique({
          where: { assignment_id: evalAssignmentId },
          include: { quant_items: true, qual_items: true },
        });

        expect(saved?.status).toBe(ResponseStatus.SUBMITTED);
        expect(saved?.submitted_at).not.toBeNull();
        expect(saved?.quant_items).toHaveLength(newItems.length);
        expect(saved?.quant_items.every((q) => q.rating_value === 5)).toBe(true);
        expect(saved?.qual_items).toHaveLength(0);
      } finally {
        await cleanup({ evalAssignmentIds: [evalAssignmentId], userId });
      }
    }, 30000);

    it("rolls back the transaction on failure, leaving original state intact", async () => {
      const { evalAssignmentId, userId } = await seedTestAssignment();
      try {
        const response = await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);
        await addQuantItems(response.id, 2);
        await addQualItem(response.id);

        // Force an FK violation inside the transaction: insert a
        // quantitative item referencing a non-existent response.
        let submissionError: unknown;
        try {
          await prisma.$transaction(async (tx) => {
            const current = await tx.response.findUnique({
              where: { assignment_id: evalAssignmentId },
            });
            if (!current) throw new Error("RESPONSE_NOT_FOUND");

            await tx.quantitativeResponseItem.deleteMany({ where: { response_id: current.id } });
            await tx.qualitativeResponseItem.deleteMany({ where: { response_id: current.id } });

            // Bad FK — response_id does not exist.
            await tx.quantitativeResponseItem.create({
              data: {
                item_key: "bad-item",
                rating_value: 1,
                response_id: crypto.randomUUID(),
                section_key: "test",
              },
            });

            await tx.response.update({
              where: { id: current.id },
              data: { status: ResponseStatus.SUBMITTED },
            });
          });
        } catch (error) {
          submissionError = error;
        }
        expect(submissionError, "submission with an invalid item FK must fail").toBeDefined();
        expect(errorCode(submissionError)).toBe("P2003");

        // Original state must be unchanged — nothing partially applied.
        const saved = await prisma.response.findUnique({
          where: { assignment_id: evalAssignmentId },
          include: { quant_items: true, qual_items: true },
        });
        expect(saved?.status).toBe(ResponseStatus.IN_PROGRESS);
        expect(saved?.submitted_at).toBeNull();
        expect(saved?.quant_items).toHaveLength(2);
        expect(saved?.qual_items).toHaveLength(1);
      } finally {
        await cleanup({ evalAssignmentIds: [evalAssignmentId], userId });
      }
    }, 30000);

    it("rejects a sequential second submission (ALREADY_SUBMITTED)", async () => {
      const { evalAssignmentId, userId } = await seedTestAssignment();
      try {
        const response = await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);
        const items = await addQuantItems(response.id, 2);

        await simulateSubmissionTransaction(evalAssignmentId, items);

        // Second sequential submission must fail because the guard re-reads
        // the status as SUBMITTED.
        let secondError: unknown;
        try {
          await simulateSubmissionTransaction(evalAssignmentId, items);
        } catch (error) {
          secondError = error;
        }
        expect(secondError).toBeDefined();
        expect((secondError as Error)?.message).toBe("ALREADY_SUBMITTED");

        // Final state: exactly one SUBMITTED response, items unchanged.
        const saved = await prisma.response.findUnique({
          where: { assignment_id: evalAssignmentId },
          include: { quant_items: true, qual_items: true },
        });
        expect(saved?.status).toBe(ResponseStatus.SUBMITTED);
        expect(saved?.quant_items).toHaveLength(items.length);
      } finally {
        await cleanup({ evalAssignmentIds: [evalAssignmentId], userId });
      }
    }, 30000);

    it("concurrent second-submission: one coherent winner per assignment", async () => {
      const { evalAssignmentId, userId } = await seedTestAssignment();
      try {
        const response = await createResponse(evalAssignmentId, userId, D.CB_BSIT_GESTECH);
        await addQuantItems(response.id, 1);

        const itemsA = [
          { item_key: "a-1", rating_value: 5, response_id: response.id, section_key: "t" },
        ];
        const itemsB = [
          { item_key: "b-1", rating_value: 3, response_id: response.id, section_key: "t" },
        ];

        // Launch concurrent submission transactions (two writers racing the
        // same response row). With READ COMMITTED both may read IN_PROGRESS
        // before either commits, or a later reader may observe the committed
        // SUBMITTED status and abort. The invariants that must hold no matter
        // the interleaving:
        //   - exactly one response row survives (unique assignment_id),
        //   - final status is SUBMITTED with a frozen submitted_at,
        //   - the final item set is ONE complete set (all A or all B) — a
        //     transaction either commits wholesale or rolls back, so mixed
        //     item sets are impossible.
        const results = await Promise.allSettled([
          simulateSubmissionTransaction(evalAssignmentId, itemsA),
          simulateSubmissionTransaction(evalAssignmentId, itemsB),
        ]);

        const fulfilled = results.filter((result) => result.status === "fulfilled");
        expect(
          fulfilled.length,
          "at least one concurrent submission must succeed"
        ).toBeGreaterThanOrEqual(1);

        const saved = await prisma.response.findUnique({
          where: { assignment_id: evalAssignmentId },
          include: { quant_items: true, qual_items: true },
        });

        expect(saved?.status).toBe(ResponseStatus.SUBMITTED);
        expect(saved?.submitted_at).not.toBeNull();

        const savedKeys = (saved?.quant_items ?? []).map((q) => q.item_key).sort();
        const allFromA = savedKeys.every((k) => k.startsWith("a-"));
        const allFromB = savedKeys.every((k) => k.startsWith("b-"));
        expect(
          (allFromA || allFromB) && savedKeys.length > 0,
          `final items must be one coherent set (all A or all B), got: ${JSON.stringify(savedKeys)}`
        ).toBe(true);
      } finally {
        await cleanup({ evalAssignmentIds: [evalAssignmentId], userId });
      }
    }, 30000);
  }
);
