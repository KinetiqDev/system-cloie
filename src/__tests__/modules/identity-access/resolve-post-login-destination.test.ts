import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

describe("resolvePostLoginDestination", () => {
  it("sends a roleless student signup to student onboarding", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "student",
        activeRole: null,
        profileGate: { status: "ROLE_SELECTION_REQUIRED" },
      })
    ).toBe("/onboarding?intent=student");
  });

  it("sends a roleless alumni signup to alumni onboarding", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "alumni",
        activeRole: null,
        profileGate: { status: "ROLE_SELECTION_REQUIRED" },
      })
    ).toBe("/onboarding?intent=alumni");
  });

  it("sends a roleless industry partner signup to industry partner onboarding (dash)", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "industry-partner",
        activeRole: null,
        profileGate: { status: "ROLE_SELECTION_REQUIRED" },
      })
    ).toBe("/onboarding?intent=industry-partner");
  });

  it("sends a roleless faculty signup to faculty onboarding", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "faculty",
        activeRole: null,
        profileGate: { status: "ROLE_SELECTION_REQUIRED" },
      })
    ).toBe("/onboarding?intent=faculty");
  });

  it("sends a roleless industry partner signup to industry partner onboarding (underscore)", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "industry_partner",
        activeRole: null,
        profileGate: { status: "ROLE_SELECTION_REQUIRED" },
      })
    ).toBe("/onboarding?intent=industry-partner");
  });

  it("sends an incomplete student profile back to onboarding", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.STUDENT,
        profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
      })
    ).toBe("/onboarding?intent=student");
  });

  it("sends an incomplete faculty profile back to onboarding", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.FACULTY,
        profileGate: { status: "FACULTY_ONBOARDING_REQUIRED", intent: "faculty" },
      })
    ).toBe("/onboarding?intent=faculty");
  });

  it("routes complete internal and external roles to their dashboards", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.STUDENT,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/student/dashboard");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.ALUMNI,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/alumni/dashboard");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.INDUSTRY_PARTNER,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/industry-partner/dashboard");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.FACULTY,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/faculty/dashboard");
  });

  it("routes inactive, rejected external accounts, and deferred enrollments correctly", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.STUDENT,
        profileGate: { status: "INACTIVE" },
      })
    ).toBe("/status/inactive");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.ALUMNI,
        profileGate: { status: "REJECTED_EXTERNAL_ACCOUNT" },
      })
    ).toBe("/status/rejected");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: null,
        activeRole: ROLES.STUDENT,
        profileGate: { status: "DEFERRED_ENROLLMENT" },
      })
    ).toBe("/student/dashboard");
  });

  it("preserves explicit non-onboarding destinations", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "/profile",
        intent: null,
        activeRole: ROLES.SECRETARY,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/profile");
  });

  it("ignores invalid requested paths", () => {
    expect(
      resolvePostLoginDestination({
        requestedPath: "profile",
        intent: null,
        activeRole: ROLES.SECRETARY,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/secretary/dashboard");

    expect(
      resolvePostLoginDestination({
        requestedPath: "/onboarding?intent=student",
        intent: null,
        activeRole: ROLES.FACULTY,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/faculty/dashboard");

    expect(
      resolvePostLoginDestination({
        requestedPath: "//evil.example",
        intent: "faculty",
        activeRole: ROLES.FACULTY,
        profileGate: { status: "COMPLETE" },
      })
    ).toBe("/faculty/dashboard");
  });
});
