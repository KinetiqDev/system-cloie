import { describe, expect, it } from "vitest";
import {
  canEditCurriculumVersion,
  canModifyCurriculumCourse,
  canPublishCurriculumVersion,
  canRetireCurriculumVersion,
  EMPTY_PUBLISH_MESSAGE,
  PUBLISHED_IMMUTABILITY_MESSAGE,
} from "@/features/curriculum/policies";

describe("curriculum policies", () => {
  it("allows editing DRAFT versions", () => {
    expect(canEditCurriculumVersion("DRAFT")).toEqual({ allowed: true });
  });

  it("rejects editing PUBLISHED and RETIRED versions with the immutability message", () => {
    expect(canEditCurriculumVersion("PUBLISHED")).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
    expect(canEditCurriculumVersion("RETIRED")).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
  });

  it("allows publishing a DRAFT version with at least one course", () => {
    expect(canPublishCurriculumVersion("DRAFT", 1)).toEqual({ allowed: true });
    expect(canPublishCurriculumVersion("DRAFT", 5)).toEqual({ allowed: true });
  });

  it("rejects publishing an empty version", () => {
    expect(canPublishCurriculumVersion("DRAFT", 0)).toEqual({
      allowed: false,
      reason: EMPTY_PUBLISH_MESSAGE,
    });
  });

  it("rejects publishing non-DRAFT versions as immutable", () => {
    expect(canPublishCurriculumVersion("PUBLISHED", 3)).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
    expect(canPublishCurriculumVersion("RETIRED", 3)).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
  });

  it("allows retiring a PUBLISHED version only", () => {
    expect(canRetireCurriculumVersion("PUBLISHED")).toEqual({ allowed: true });
  });

  it("rejects retiring a DRAFT version", () => {
    expect(canRetireCurriculumVersion("DRAFT")).toEqual({
      allowed: false,
      reason: "Only published curricula can be retired",
    });
  });

  it("rejects retiring a RETIRED version as immutable", () => {
    expect(canRetireCurriculumVersion("RETIRED")).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
  });

  it("applies the DRAFT-only rule to course modification", () => {
    expect(canModifyCurriculumCourse("DRAFT")).toEqual({ allowed: true });
    expect(canModifyCurriculumCourse("PUBLISHED")).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
    expect(canModifyCurriculumCourse("RETIRED")).toEqual({
      allowed: false,
      reason: PUBLISHED_IMMUTABILITY_MESSAGE,
    });
  });
});
