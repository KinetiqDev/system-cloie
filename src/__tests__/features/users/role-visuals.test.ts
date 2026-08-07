import { describe, expect, it } from "vitest";
import { SystemRole } from "@prisma/client";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";

const ALL_ROLES = Object.values(SystemRole);

describe("formatRole", () => {
  it.each([
    [SystemRole.SECRETARY, "Secretary"],
    [SystemRole.DEAN, "Dean"],
    [SystemRole.PROGRAM_HEAD, "Program Head"],
    [SystemRole.FACULTY, "Faculty"],
    [SystemRole.STUDENT, "Student"],
    [SystemRole.ALUMNI, "Alumni"],
    [SystemRole.INDUSTRY_PARTNER, "Industry Partner"],
  ])("formats %s as %s", (role, expected) => {
    expect(formatRole(role)).toBe(expected);
  });
});

describe("getRoleBadgeClass", () => {
  it("covers every SystemRole", () => {
    for (const role of ALL_ROLES) {
      expect(getRoleBadgeClass(role)).toBeTruthy();
    }
  });

  it("uses theme-resolved chart tokens only", () => {
    for (const role of ALL_ROLES) {
      const className = getRoleBadgeClass(role);
      expect(className).toMatch(/chart-[1-5]/);
      expect(className).not.toMatch(
        /bg-(red|blue|green|amber|purple|indigo|emerald|sky|slate)-\d+/
      );
      expect(className).not.toMatch(
        /text-(red|blue|green|amber|purple|indigo|emerald|sky|slate)-\d+/
      );
    }
  });

  it("keeps badge labels on the foreground for contrast in both themes", () => {
    for (const role of ALL_ROLES) {
      expect(getRoleBadgeClass(role)).toContain("text-foreground");
    }
  });
});
