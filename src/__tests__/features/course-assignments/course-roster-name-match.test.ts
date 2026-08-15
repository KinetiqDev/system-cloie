import { describe, expect, it } from "vitest";

import {
  matchRosterName,
  normalizeRosterNameKey,
} from "@/features/course-assignments/services/course-roster-name-match";

function candidate(id: string, name: string) {
  return { id, name };
}

describe("course roster name matching", () => {
  it("treats NFKC, case fold, trim, and whitespace collapse as exact", () => {
    const uploaded = " ANDY   ZANE EGUT ";
    const account = candidate("andy", "Andy Zane Egut");

    expect(matchRosterName(uploaded, [account])).toEqual({
      status: "EXACT_MATCH",
      reason: "EXACT",
      matchedIds: ["andy"],
    });
    expect(matchRosterName("ＡＮＤＹ   ＺＡＮＥ ＥＧＵＴ", [account])).toEqual({
      status: "EXACT_MATCH",
      reason: "EXACT",
      matchedIds: ["andy"],
    });
    expect(normalizeRosterNameKey(uploaded)).toBe(normalizeRosterNameKey(account.name));
  });

  it("treats case-folded equivalents as exact, not just locale lowercase", () => {
    expect(
      matchRosterName("ANNA STRASSE", [candidate("anna", "Anna Straße")])
    ).toEqual({
      status: "EXACT_MATCH",
      reason: "EXACT",
      matchedIds: ["anna"],
    });
    expect(
      matchRosterName("TURGUT İNAN", [candidate("turgut", "Turgut Inan")])
    ).toEqual({
      status: "EXACT_MATCH",
      reason: "EXACT",
      matchedIds: ["turgut"],
    });
    expect(
      matchRosterName("TURGUT I\u0307NAN", [candidate("turgut", "Turgut Inan")])
    ).toEqual({
      status: "EXACT_MATCH",
      reason: "EXACT",
      matchedIds: ["turgut"],
    });
  });

  it("suggests a unique extra or omitted middle-token subsequence", () => {
    expect(
      matchRosterName("ANDY ZANE BAUTISTA EGUT", [candidate("andy", "Andy Zane Egut")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "MIDDLE_TOKEN",
      matchedIds: ["andy"],
    });

    expect(
      matchRosterName("MARIA THERESE ANN GONZALES REYES", [
        candidate("maria", "Maria Therese Reyes"),
      ])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "MIDDLE_TOKEN",
      matchedIds: ["maria"],
    });
  });

  it("suggests a unique punctuation-normalized initial expansion", () => {
    expect(
      matchRosterName("Juan P. Santos", [candidate("juan", "Juan Paul Santos")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "INITIAL",
      matchedIds: ["juan"],
    });
    expect(
      matchRosterName("Juan Paul Santos", [candidate("juan", "Juan P. Santos")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "INITIAL",
      matchedIds: ["juan"],
    });
  });

  it("does not expand an initial that the other token does not start with", () => {
    expect(
      matchRosterName("Juan Q. Santos", [candidate("juan", "Juan Paul Santos")])
    ).toEqual({
      status: "NO_MATCH",
      reason: "NO_EVIDENCE",
      matchedIds: [],
    });
  });

  it("suggests a unique separator-punctuation variant", () => {
    expect(
      matchRosterName("Anne-Marie Cruz", [candidate("anne", "Anne Marie Cruz")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "SEPARATOR_PUNCTUATION",
      matchedIds: ["anne"],
    });

    expect(
      matchRosterName("O'Brien", [candidate("obrien", "OBrien")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "SEPARATOR_PUNCTUATION",
      matchedIds: ["obrien"],
    });
  });

  it("suggests a unique recognized suffix difference", () => {
    expect(
      matchRosterName("Juan Santos Jr.", [candidate("juan", "Juan Santos")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "SUFFIX",
      matchedIds: ["juan"],
    });
  });

  it("suggests a unique diacritic-only variant", () => {
    expect(
      matchRosterName("José Santos", [candidate("jose", "Jose Santos")])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "DIACRITIC",
      matchedIds: ["jose"],
    });
  });

  it("keeps equal-tier same-name candidates ambiguous", () => {
    expect(
      matchRosterName("John Paul Santos", [
        candidate("john-a", "John Paul Santos"),
        candidate("john-b", "JOHN   PAUL SANTOS"),
      ])
    ).toEqual({
      status: "AMBIGUOUS",
      reason: "EQUAL_TIER",
      matchedIds: ["john-a", "john-b"],
    });
  });

  it("keeps equal-tier suggestions ambiguous and does not weaken to pick one", () => {
    expect(
      matchRosterName("Maria Therese Ann Gonzales Reyes", [
        candidate("short", "Maria Reyes"),
        candidate("mid", "Maria Ann Reyes"),
      ])
    ).toEqual({
      status: "AMBIGUOUS",
      reason: "EQUAL_TIER",
      matchedIds: ["short", "mid"],
    });
  });

  it("uses the strongest unique tier instead of a weaker competitor", () => {
    expect(
      matchRosterName("Maria Therese Reyes", [
        candidate("middle", "Maria Reyes"),
        candidate("accent", "María Therese Reyes"),
      ])
    ).toEqual({
      status: "SUGGESTED_MATCH",
      reason: "MIDDLE_TOKEN",
      matchedIds: ["middle"],
    });
  });

  it("does not treat prototype-inherited keys as recognized suffixes", () => {
    expect(
      matchRosterName("John Constructor", [candidate("john", "John")])
    ).toEqual({
      status: "NO_MATCH",
      reason: "NO_EVIDENCE",
      matchedIds: [],
    });
  });

  it("does not invent a match from unrelated tokens", () => {
    expect(
      matchRosterName("Andy Egut", [candidate("other", "Maria Santos")])
    ).toEqual({
      status: "NO_MATCH",
      reason: "NO_EVIDENCE",
      matchedIds: [],
    });
  });

  it("leaves uploaded and canonical names unchanged and omits any score", () => {
    const uploaded = " ANDY   ZANE EGUT ";
    const account = candidate("andy", "Andy Zane Egut");

    const result = matchRosterName(uploaded, [account]);

    expect(uploaded).toBe(" ANDY   ZANE EGUT ");
    expect(account.name).toBe("Andy Zane Egut");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("percent");
  });
});
