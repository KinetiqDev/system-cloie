import { describe, expect, it } from "vitest";

import { assertSafeDemoUserReuse } from "../../../scripts/bootstrap-outline-defense-demo";

describe("bootstrap outline defense demo", () => {
  it("rejects reusing an existing account that does not match the demo marker", () => {
    expect(() =>
      assertSafeDemoUserReuse(
        {
          email: "faculty@acd.edu.ph",
          name: "Alice Santos",
        },
        {
          email: "faculty@acd.edu.ph",
          name: "Outline Demo Faculty",
        }
      )
    ).toThrowError(
      "Refusing to reuse existing user faculty@acd.edu.ph because it does not match the outline defense demo marker."
    );
  });

  it("allows reruns when the existing account already matches the demo marker", () => {
    expect(() =>
      assertSafeDemoUserReuse(
        {
          email: "faculty@acd.edu.ph",
          name: "Outline Demo Faculty",
        },
        {
          email: "faculty@acd.edu.ph",
          name: "Outline Demo Faculty",
        }
      )
    ).not.toThrow();
  });

  it("compares the complete canonical name rather than split first/last fields", () => {
    expect(() =>
      assertSafeDemoUserReuse(
        {
          email: "dean@acd.edu.ph",
          name: "Outline Demo Dean",
        },
        {
          email: "dean@acd.edu.ph",
          name: "Outline Demo Faculty",
        }
      )
    ).toThrowError(/does not match the outline defense demo marker/);
  });
});
