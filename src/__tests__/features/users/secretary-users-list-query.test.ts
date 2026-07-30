import { describe, expect, it } from "vitest";
import {
  parseSecretaryUsersListQuery,
  serializeSecretaryUsersListQuery,
} from "@/features/users/schemas/secretary-users-list";
import { ROLES } from "@/lib/constants/roles";

describe("Secretary Users list URL", () => {
  it.each([
    ["defaults missing values", {}, { page: 1, sort: "lastName", direction: "asc" }],
    [
      "uses the first non-empty repeated value",
      { page: ["2", "3"], q: ["  ada ", "grace"] },
      { page: 2, q: "ada", sort: "lastName", direction: "asc" },
    ],
    [
      "drops malformed values independently",
      { page: "0", role: "NOT_A_ROLE", sort: "createdAt", dir: "sideways" },
      { page: 1, sort: "lastName", direction: "asc" },
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
        sort: "lastName",
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
    expect(serializeSecretaryUsersListQuery({ page: 1, sort: "lastName", direction: "asc" })).toBe(
      ""
    );
  });

  it("bounds the maximum page value", () => {
    expect(parseSecretaryUsersListQuery({ page: "10001" })).toEqual({
      page: 1,
      sort: "lastName",
      direction: "asc",
    });
  });

  it("does not accept non-allowlisted sort fields", () => {
    expect(parseSecretaryUsersListQuery({ sort: "programLabel" })).toMatchObject({
      sort: "lastName",
      direction: "asc",
    });
  });
});
