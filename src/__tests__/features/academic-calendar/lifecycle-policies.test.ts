import { describe, expect, it } from "vitest";
import { canTransitionPeriod } from "@/features/academic-calendar/policies";

describe("academic-calendar/policies / canTransitionPeriod", () => {
  it("allows PLANNED -> ACTIVE", () => {
    expect(canTransitionPeriod("PLANNED", "ACTIVE").allowed).toBe(true);
  });

  it("allows PLANNED -> CANCELLED", () => {
    expect(canTransitionPeriod("PLANNED", "CANCELLED").allowed).toBe(true);
  });

  it("allows ACTIVE -> COMPLETED", () => {
    expect(canTransitionPeriod("ACTIVE", "COMPLETED").allowed).toBe(true);
  });

  it("allows ACTIVE -> CANCELLED", () => {
    expect(canTransitionPeriod("ACTIVE", "CANCELLED").allowed).toBe(true);
  });

  it("rejects PLANNED -> COMPLETED (must pass through ACTIVE)", () => {
    const r = canTransitionPeriod("PLANNED", "COMPLETED");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/transition/i);
  });

  it("rejects COMPLETED -> anything (terminal)", () => {
    for (const target of ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const) {
      const r = canTransitionPeriod("COMPLETED", target);
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.reason).toMatch(/immutable|already/i);
    }
  });

  it("rejects CANCELLED -> anything (terminal)", () => {
    for (const target of ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const) {
      const r = canTransitionPeriod("CANCELLED", target);
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.reason).toMatch(/immutable|already/i);
    }
  });

  it("rejects same-status transition", () => {
    const r = canTransitionPeriod("ACTIVE", "ACTIVE");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/already/i);
  });
});
