import { describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_VALUES,
  parseAppearance,
  readStoredAppearance,
  resolveAppearance,
  writeStoredAppearance,
} from "@/features/design-system/lib/appearance";

describe("appearance vocabulary and parsing", () => {
  it("exposes the stable serializable vocabulary", () => {
    expect(APPEARANCE_VALUES).toEqual(["light", "dark", "system"]);
  });

  it("parses the three supported preferences", () => {
    expect(parseAppearance("light")).toBe("light");
    expect(parseAppearance("dark")).toBe("dark");
    expect(parseAppearance("system")).toBe("system");
  });

  it("rejects missing, empty, and malformed persisted values", () => {
    expect(parseAppearance(undefined)).toBeNull();
    expect(parseAppearance(null)).toBeNull();
    expect(parseAppearance("")).toBeNull();
    expect(parseAppearance("auto")).toBeNull();
    expect(parseAppearance("LIGHT")).toBeNull();
    expect(parseAppearance("light dark system")).toBeNull();
  });
});

describe("appearance resolution rules", () => {
  it("resolves System from the operating-system preference", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
  });

  it("resolves an explicit preference over the operating system", () => {
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });

  it("defaults a first-use or missing preference to System", () => {
    expect(resolveAppearance(null, true)).toBe("dark");
    expect(resolveAppearance(undefined, false)).toBe("light");
  });
});

describe("appearance browser storage", () => {
  it("reads a valid persisted preference under the stable key", () => {
    const storage = { getItem: () => "dark" };
    expect(readStoredAppearance(storage)).toBe("dark");
  });

  it("treats malformed stored values as unusable", () => {
    const storage = { getItem: () => "rainbow" };
    expect(readStoredAppearance(storage)).toBeNull();
  });

  it("falls back safely when storage is unavailable or throws", () => {
    expect(readStoredAppearance(null)).toBeNull();
    expect(readStoredAppearance({ getItem: () => "dark" })).toBe("dark");

    const throwingStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };
    expect(() => readStoredAppearance(throwingStorage)).not.toThrow();
    expect(readStoredAppearance(throwingStorage)).toBeNull();
  });

  it("persists only an explicit preference under the stable key", () => {
    const setItem = (key: string, value: string) => {
      expect(key).toBe(APPEARANCE_STORAGE_KEY);
      expect(value).toBe("dark");
    };
    expect(writeStoredAppearance({ setItem }, "dark")).toBe(true);
  });

  it("reports failure without throwing when storage cannot be written", () => {
    const throwingStorage = {
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(() => writeStoredAppearance(throwingStorage, "light")).not.toThrow();
    expect(writeStoredAppearance(throwingStorage, "light")).toBe(false);
    expect(writeStoredAppearance(null, "light")).toBe(false);
  });
});
