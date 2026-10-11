import { describe, expect, it } from "vitest";

import { facetChipLabel, facetValueLabel, type FacetDef } from "@/components/data-table/types";

const courseFacet: FacetDef = {
  id: "courseId",
  label: "Course",
  value: "course-1",
  onChange: () => undefined,
  allLabel: "All courses",
  options: [
    { id: "course-1", label: "CS101", detail: "Introduction to Computing" },
    { id: "course-2", label: "CS102" },
  ],
};

const statusFacet: FacetDef = {
  id: "isActive",
  label: "Status",
  value: null,
  onChange: () => undefined,
  allLabel: "All statuses",
  options: [
    { id: "true", label: "Active" },
    { id: "false", label: "Inactive" },
  ],
};

const rosterFacet: FacetDef = {
  id: "roster",
  label: "Roster",
  kind: "toggle",
  value: "empty",
  onValue: "empty",
  onChange: () => undefined,
  toggleLabel: "Only classes with no active members",
};

describe("facet labels", () => {
  it("names the applied value without repeating the facet", () => {
    expect(facetValueLabel(courseFacet)).toBe("CS101");
  });

  it("falls back to the clearing label when the facet narrows nothing", () => {
    expect(facetValueLabel(statusFacet)).toBe("All statuses");
  });

  it("reads a toggle by its own action, because a chip's label is the toggle", () => {
    expect(facetValueLabel(rosterFacet)).toBe("Only classes with no active members");
  });

  it("pairs facet and value in a chip so a chip is self-describing", () => {
    expect(facetChipLabel(courseFacet)).toBe("Course: CS101");
    expect(facetChipLabel(rosterFacet)).toBe("Roster");
  });

  it("falls back to the raw value when an option is no longer presentable", () => {
    const stale: FacetDef = {
      ...courseFacet,
      value: "retired-course",
      formatValue: () => "Retired course",
    };
    expect(facetValueLabel(stale)).toBe("Retired course");
    expect(facetValueLabel({ ...courseFacet, value: "gone" })).toBe("gone");
  });
});
