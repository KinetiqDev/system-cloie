import { describe, expect, it } from "vitest";

import {
  SHOWCASE_ALERTS,
  SHOWCASE_DEPARTMENT_OPTIONS,
  SHOWCASE_EMPTY_EXAMPLES,
  SHOWCASE_ERROR_REFERENCE,
  SHOWCASE_KPIS,
  SHOWCASE_OFFLINE_REFERENCE,
  SHOWCASE_PLAN_OPTIONS,
  SHOWCASE_PROGRAMS,
  SHOWCASE_PROGRESS_ITEMS,
  SHOWCASE_ROLE_OPTIONS,
  SHOWCASE_TAB_CONTENT,
} from "@/features/design-system/data/showcase-fixtures";

const COLLECTIONS = [
  SHOWCASE_PROGRAMS,
  SHOWCASE_KPIS,
  SHOWCASE_DEPARTMENT_OPTIONS,
  SHOWCASE_ROLE_OPTIONS,
  SHOWCASE_PLAN_OPTIONS,
  SHOWCASE_PROGRESS_ITEMS,
  SHOWCASE_ALERTS,
  SHOWCASE_EMPTY_EXAMPLES,
  SHOWCASE_TAB_CONTENT,
];

const OBJECTS = [SHOWCASE_OFFLINE_REFERENCE, SHOWCASE_ERROR_REFERENCE];

describe("showcase fixtures", () => {
  it.each(COLLECTIONS.map((collection) => [collection]))(
    "collection is non-empty and each entry serializes without loss",
    (collection: readonly object[]) => {
      expect(collection.length).toBeGreaterThan(0);

      for (const entry of collection) {
        expect(JSON.parse(JSON.stringify(entry))).toEqual(entry);
      }
    }
  );

  it("all entries survive a JSON round-trip without functions or undefined values", () => {
    for (const collection of COLLECTIONS) {
      for (const entry of collection) {
        const serialized = JSON.stringify(entry);
        expect(serialized).toBeDefined();
        expect(serialized).not.toContain("undefined");
      }
    }

    for (const object of OBJECTS) {
      expect(JSON.parse(JSON.stringify(object))).toEqual(object);
    }
  });

  it("uses only reference copy (no real user or institutional records)", () => {
    const allText = [
      ...COLLECTIONS.flatMap((collection) => JSON.stringify(collection)),
      ...OBJECTS.map((object) => JSON.stringify(object)),
    ].join(" ");

    expect(allText.toLowerCase()).not.toContain("@");
    expect(allText.toLowerCase()).not.toContain("student");
    expect(allText).not.toContain("undefined");
  });

  it("uses stable unique ids across collections", () => {
    const identifiers = COLLECTIONS.flatMap((collection) =>
      collection.map((entry) => {
        const record = entry as { id?: string; value?: string };
        return record.id ?? record.value ?? "";
      })
    );
    expect(identifiers.every(Boolean)).toBe(true);
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });
});
