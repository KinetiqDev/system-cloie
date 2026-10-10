import { describe, expect, it } from "vitest";
import { createPOSchema } from "@/features/outcomes/schemas/po";

const details = {
  programId: "00000000-0000-4000-8000-000000000001",
  code: "PO-1",
  description: "An approved program outcome statement.",
};

describe("Program Head PO classification", () => {
  it("requires an explicit Core or Professional classification", () => {
    expect(createPOSchema.safeParse(details).success).toBe(false);
    expect(createPOSchema.safeParse({ ...details, classification: "CORE" }).success).toBe(true);
    expect(createPOSchema.safeParse({ ...details, classification: "PROFESSIONAL" }).success).toBe(
      true
    );
  });

  it.each(["COMMON", "INSTITUTION_SPECIFIC", "UNCLASSIFIED"])(
    "rejects the administrative category %s",
    (classification) => {
      expect(createPOSchema.safeParse({ ...details, classification }).success).toBe(false);
    }
  );
});
