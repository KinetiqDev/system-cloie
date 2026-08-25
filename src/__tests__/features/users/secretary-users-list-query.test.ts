import { describe, expect, it } from "vitest";
import {
  parseSecretaryUsersListQuery,
  serializeSecretaryUsersListQuery,
} from "@/features/users/schemas/secretary-users-list";
import { ROLES } from "@/lib/constants/roles";

describe("Secretary Users list URL", () => {
  it.each([
    ["defaults missing values", {}, { page: 1, sort: "name", direction: "asc" }],
    [
      "uses the first non-empty repeated value",
      { page: ["2", "3"], q: ["  ada ", "grace"] },
      { page: 2, q: "ada", sort: "name", direction: "asc" },
    ],
    [
      "drops malformed values independently",
      { page: "0", role: "NOT_A_ROLE", sort: "createdAt", dir: "sideways" },
      { page: 1, sort: "name", direction: "asc" },
    ],
    [
      "trims supported filters",
      { role: ROLES.STUDENT, program: " BSCE ", major: " Structural ", q: " Jane " },
      {
        page: 1,
        role: ROLES.STUDENT,
        program: "BSCE",
        major: "Structural",
        q: "Jane",
        sort: "name",
        direction: "asc",
      },
    ],
  ])("%s", (_name, raw, expected) => {
    expect(parseSecretaryUsersListQuery(raw)).toEqual(expected);
  });

  it("serializes defaults canonically and preserves explicit list state", () => {
    expect(
      serializeSecretaryUsersListQuery({
        page: 3,
        role: ROLES.STUDENT,
        program: "BSCE",
        major: "Structural",
        q: "Jane",
        sort: "email",
        direction: "desc",
      })
    ).toBe("page=3&role=STUDENT&program=BSCE&major=Structural&q=Jane&sort=email&dir=desc");
    expect(serializeSecretaryUsersListQuery({ page: 1, sort: "name", direction: "asc" })).toBe(
      ""
    );
  });

  it("round-trips actionable dashboard filters", () => {
    const awaitingPlacement = parseSecretaryUsersListQuery({ state: "awaiting-term-placement" });
    expect(awaitingPlacement).toMatchObject({ state: "awaiting-term-placement" });
    expect(serializeSecretaryUsersListQuery(awaitingPlacement)).toBe(
      "state=awaiting-term-placement"
    );

    const pendingVerification = parseSecretaryUsersListQuery({ verification: "pending" });
    expect(pendingVerification).toMatchObject({ verification: "pending" });
    expect(serializeSecretaryUsersListQuery(pendingVerification)).toBe("verification=pending");
  });

  it("drops unsupported dashboard filter values", () => {
    expect(
      parseSecretaryUsersListQuery({ state: "inactive", verification: "approved" })
    ).toEqual({ page: 1, sort: "name", direction: "asc" });
  });

  it("bounds the maximum page value", () => {
    expect(parseSecretaryUsersListQuery({ page: "10001" })).toEqual({
      page: 1,
      sort: "name",
      direction: "asc",
    });
  });

  it("does not accept non-allowlisted sort fields", () => {
    expect(parseSecretaryUsersListQuery({ sort: "programLabel" })).toMatchObject({
      sort: "name",
      direction: "asc",
    });
  });

  it.each([
    ["firstName", "desc"],
    ["lastName", "asc"],
    ["firstName", "asc"],
    ["lastName", "desc"],
  ] as const)("canonicalizes legacy sort=%s to complete name without surname semantics", (legacy, dir) => {
    expect(parseSecretaryUsersListQuery({ sort: legacy, dir })).toEqual({
      page: 1,
      sort: "name",
      direction: dir,
    });
  });

  it("serializes complete-name default without embedding legacy first/last sort keys", () => {
    expect(
      serializeSecretaryUsersListQuery({ page: 1, sort: "name", direction: "asc" })
    ).toBe("");
    expect(
      serializeSecretaryUsersListQuery({ page: 2, sort: "name", direction: "desc" })
    ).toBe("page=2&sort=name&dir=desc");
    const serialized = serializeSecretaryUsersListQuery({
      page: 1,
      sort: "name",
      direction: "desc",
    });
    expect(serialized).not.toMatch(/firstName|lastName/);
  });
});
