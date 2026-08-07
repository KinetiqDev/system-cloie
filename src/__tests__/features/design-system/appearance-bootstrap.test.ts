/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { APPEARANCE_STORAGE_KEY } from "@/features/design-system/lib/appearance";
import "../../../../public/appearance-bootstrap.js";

const BOOTSTRAP_SOURCE = readFileSync(
  path.join(process.cwd(), "public/appearance-bootstrap.js"),
  "utf8"
);

function runBootstrap(
  options: {
    stored?: string | null;
    storageThrows?: boolean;
    prefersDark?: boolean;
    matchMediaAvailable?: boolean;
  } = {}
) {
  const bootstrapDocument = window.document.implementation.createHTMLDocument("bootstrap-test");
  const setItem = vi.fn();
  const getItem = options.storageThrows
    ? vi.fn(() => {
        throw new Error("storage blocked");
      })
    : vi.fn(() => options.stored ?? null);
  const matchMedia =
    options.matchMediaAvailable === false
      ? undefined
      : vi.fn(() => ({ matches: options.prefersDark ?? false }));
  const sandboxWindow = { localStorage: { getItem, setItem }, matchMedia };

  new Function("window", "document", BOOTSTRAP_SOURCE)(sandboxWindow, bootstrapDocument);

  return { document: bootstrapDocument, setItem, matchMedia };
}

describe("public/appearance-bootstrap.js", () => {
  it("pins the stable storage key shared with the provider vocabulary", () => {
    expect(BOOTSTRAP_SOURCE).toContain(APPEARANCE_STORAGE_KEY);
  });

  it("applies Dark before paint for an explicit dark preference", () => {
    const { document } = runBootstrap({ stored: "dark", prefersDark: false });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("keeps Light when an explicit light preference overrides a dark operating system", () => {
    const { document } = runBootstrap({ stored: "light", prefersDark: true });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("resolves System from the operating system when nothing is persisted", () => {
    const darkResult = runBootstrap({ stored: null, prefersDark: true });
    expect(darkResult.document.documentElement.classList.contains("dark")).toBe(true);
    expect(darkResult.document.documentElement.style.colorScheme).toBe("dark");

    const lightResult = runBootstrap({ stored: null, prefersDark: false });
    expect(lightResult.document.documentElement.classList.contains("dark")).toBe(false);
    expect(lightResult.document.documentElement.style.colorScheme).toBe("light");
  });

  it("falls back to System for malformed stored values", () => {
    const { document } = runBootstrap({ stored: "rainbow", prefersDark: true });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("stays usable when storage is blocked", () => {
    const { document, setItem } = runBootstrap({ storageThrows: true, prefersDark: true });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("never writes storage", () => {
    const { setItem } = runBootstrap({ stored: "dark" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("resolves Light when matchMedia is unavailable", () => {
    const { document } = runBootstrap({ matchMediaAvailable: false });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("executes against the live document when statically imported", () => {
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
