import { describe, expect, it } from "vitest";
import { resolveGoogleAccountName } from "@/features/auth/services/resolve-google-account-name";

describe("resolveGoogleAccountName", () => {
  it("prefers user_metadata.name over full_name and given/family parts", () => {
    expect(
      resolveGoogleAccountName({
        name: "Jane Doe",
        full_name: "Ignored Full",
        given_name: "Ignored",
        family_name: "Parts",
      })
    ).toEqual({ ok: true, name: "Jane Doe" });
  });

  it("uses full_name when name is absent or blank", () => {
    expect(
      resolveGoogleAccountName({
        name: "   ",
        full_name: "Juan Dela Cruz",
        given_name: "Juan",
        family_name: "Cruz",
      })
    ).toEqual({ ok: true, name: "Juan Dela Cruz" });
  });

  it("combines complete given_name and family_name only as the final fallback", () => {
    expect(
      resolveGoogleAccountName({
        given_name: "Maria",
        family_name: "Santos",
      })
    ).toEqual({ ok: true, name: "Maria Santos" });
  });

  it("trims only outer whitespace and preserves internal spacing, casing, and punctuation", () => {
    expect(resolveGoogleAccountName({ name: "  Mary   Jane O'Neil  " })).toEqual({
      ok: true,
      name: "Mary   Jane O'Neil",
    });
    expect(resolveGoogleAccountName({ full_name: "  José  Núñez  " })).toEqual({
      ok: true,
      name: "José  Núñez",
    });
  });

  it("accepts a single-word provider name", () => {
    expect(resolveGoogleAccountName({ name: "Madonna" })).toEqual({
      ok: true,
      name: "Madonna",
    });
    expect(resolveGoogleAccountName({ full_name: "Cher" })).toEqual({
      ok: true,
      name: "Cher",
    });
  });

  it("fails closed when given_name or family_name is incomplete", () => {
    expect(resolveGoogleAccountName({ given_name: "OnlyGiven" })).toEqual({
      ok: false,
      reason: "missing-name",
    });
    expect(resolveGoogleAccountName({ family_name: "OnlyFamily" })).toEqual({
      ok: false,
      reason: "missing-name",
    });
    expect(resolveGoogleAccountName({ given_name: "  ", family_name: "Family" })).toEqual({
      ok: false,
      reason: "missing-name",
    });
  });

  it("never derives a name from email-like claims or empty metadata", () => {
    expect(
      resolveGoogleAccountName({
        email: "jane.doe@gmail.com",
        preferred_username: "jane.doe",
      })
    ).toEqual({ ok: false, reason: "missing-name" });
    expect(resolveGoogleAccountName(null)).toEqual({ ok: false, reason: "missing-name" });
    expect(resolveGoogleAccountName(undefined)).toEqual({ ok: false, reason: "missing-name" });
    expect(resolveGoogleAccountName({})).toEqual({ ok: false, reason: "missing-name" });
  });
});
