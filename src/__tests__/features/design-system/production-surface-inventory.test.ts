import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  PRODUCTION_SURFACE_INVENTORY,
  InventoryEntry,
  validateInventory,
  validateInventoryEntry,
} from "@/features/design-system/data/production-surface-inventory";

function walkDir(dir: string, extension: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath, extension));
    } else {
      if (filePath.endsWith(extension)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

describe("production-surface-inventory", () => {
  it("discovers all production UI surfaces and asserts exact bidirectional inventory parity", () => {
    const discoveredTsx = [
      ...walkDir("src/app", ".tsx"),
      ...walkDir("src/components", ".tsx"),
      ...walkDir("src/features", ".tsx"),
    ].filter((f) => !f.includes("/features/design-system/"));

    const extraMetadataFiles = [
      "src/styles/tokens.css",
      "src/app/globals.css",
      "src/app/manifest.ts",
    ];

    const allDiscovered = Array.from(new Set([...discoveredTsx, ...extraMetadataFiles])).sort();
    const discoveredSet = new Set(allDiscovered);
    const inventoryPaths = PRODUCTION_SURFACE_INVENTORY.map((entry) => entry.path);
    const inventorySet = new Set(inventoryPaths);

    const missingFromInventory = allDiscovered.filter((surfacePath) => !inventorySet.has(surfacePath));
    const extraInInventory = inventoryPaths.filter((inventoryPath) => !discoveredSet.has(inventoryPath));

    expect(
      missingFromInventory,
      `Discovered surfaces missing from inventory: ${missingFromInventory.join(", ")}`
    ).toEqual([]);

    expect(
      extraInInventory,
      `Inventory entries absent from discovered production surface set: ${extraInInventory.join(", ")}`
    ).toEqual([]);
  });

  it("passes comprehensive validation for full production surface inventory", () => {
    const errors = validateInventory(PRODUCTION_SURFACE_INVENTORY);
    expect(errors).toEqual([]);
  });

  it("contains no duplicate paths", () => {
    const seenPaths = new Set<string>();
    const duplicates: string[] = [];

    PRODUCTION_SURFACE_INVENTORY.forEach((entry) => {
      if (seenPaths.has(entry.path)) {
        duplicates.push(entry.path);
      }
      seenPaths.add(entry.path);
    });

    expect(duplicates, `Duplicate paths found in inventory: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("contains no stale paths (every inventory path exists on disk)", () => {
    const stalePaths: string[] = [];

    PRODUCTION_SURFACE_INVENTORY.forEach((entry) => {
      if (!fs.existsSync(entry.path)) {
        stalePaths.push(entry.path);
      }
    });

    expect(stalePaths, `Stale inventory paths that do not exist on disk: ${stalePaths.join(", ")}`).toEqual([]);
  });

  it("enforces deterministic disposition and task ownership rules", () => {
    PRODUCTION_SURFACE_INVENTORY.forEach((entry: InventoryEntry) => {
      const entryErrors = validateInventoryEntry(entry);
      expect(entryErrors, `Validation errors for ${entry.path}`).toEqual([]);
    });
  });

  it("properly classifies layout.tsx entries as category layout", () => {
    const programHeadLayout = PRODUCTION_SURFACE_INVENTORY.find(
      (e) => e.path === "src/app/(app)/program-head/programs/[programId]/layout.tsx"
    );
    expect(programHeadLayout?.category).toBe("layout");

    const legalLayout = PRODUCTION_SURFACE_INVENTORY.find(
      (e) => e.path === "src/app/(legal)/layout.tsx"
    );
    expect(legalLayout?.category).toBe("layout");
  });

  it("properly classifies redirect and compatibility routes", () => {
    const redirects = PRODUCTION_SURFACE_INVENTORY.filter(
      (entry) => entry.disposition === "redirect"
    );

    const redirectPaths = redirects.map((entry) => entry.path);
    expect(redirectPaths).toContain("src/app/(app)/dashboard/page.tsx");
    expect(redirectPaths).toContain("src/app/(app)/dean/page.tsx");
    expect(redirectPaths).toContain("src/app/(app)/program-head/page.tsx");
    expect(redirectPaths).toContain(
      "src/app/(app)/program-head/programs/[programId]/[...path]/page.tsx"
    );
  });

  describe("validation rules edge cases", () => {
    const mockFileExists = (p: string) => !p.includes("nonexistent");

    it("rejects duplicate paths", () => {
      const sample: InventoryEntry[] = [
        { path: "src/app/page.tsx", disposition: "task", taskId: 23, category: "route" },
        { path: "src/app/page.tsx", disposition: "task", taskId: 23, category: "route" },
      ];
      const errors = validateInventory(sample, mockFileExists);
      expect(errors).toContain("Duplicate inventory entry path: src/app/page.tsx");
    });

    it("rejects stale paths", () => {
      const sample: InventoryEntry[] = [
        { path: "src/app/nonexistent-file.tsx", disposition: "already_compliant", category: "route" },
      ];
      const errors = validateInventory(sample, mockFileExists);
      expect(errors).toContain("Stale inventory path does not exist on disk: src/app/nonexistent-file.tsx");
    });

    it("rejects task disposition with missing or invalid taskId", () => {
      const sampleMissing = {
        path: "src/app/page.tsx",
        disposition: "task",
        category: "route",
      } as unknown as InventoryEntry;
      expect(validateInventoryEntry(sampleMissing, mockFileExists)).toContain(
        "Task-owned entry at src/app/page.tsx must have a valid taskId"
      );

      const sampleInvalid = {
        path: "src/app/page.tsx",
        disposition: "task",
        taskId: 99,
        category: "route",
      } as InventoryEntry;
      expect(validateInventoryEntry(sampleInvalid, mockFileExists)).toContain(
        "Task ID 99 for src/app/page.tsx must be between 1 and 27"
      );
    });

    it("rejects non-task disposition with a taskId", () => {
      const sample = {
        path: "src/app/page.tsx",
        disposition: "already_compliant",
        taskId: 5,
        category: "route",
      } as unknown as InventoryEntry;
      expect(validateInventoryEntry(sample, mockFileExists)).toContain(
        "Non-task entry at src/app/page.tsx must not have a taskId"
      );
    });

    it("rejects redirect, placeholder, generated, or exception disposition without notes", () => {
      const sampleRedirect: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "redirect",
        category: "route",
      };
      expect(validateInventoryEntry(sampleRedirect, mockFileExists)).toContain(
        'Entry with disposition "redirect" at src/app/page.tsx must include non-empty explanatory notes'
      );

      const samplePlaceholder: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "not_found_placeholder",
        category: "route",
        notes: "   ",
      };
      expect(validateInventoryEntry(samplePlaceholder, mockFileExists)).toContain(
        'Entry with disposition "not_found_placeholder" at src/app/page.tsx must include non-empty explanatory notes'
      );

      const sampleGenerated: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "generated",
        category: "generated",
      };
      expect(validateInventoryEntry(sampleGenerated, mockFileExists)).toContain(
        'Entry with disposition "generated" at src/app/page.tsx must include non-empty explanatory notes'
      );

      const sampleException: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "approved_exception",
        category: "route",
      };
      expect(validateInventoryEntry(sampleException, mockFileExists)).toContain(
        'Entry with disposition "approved_exception" at src/app/page.tsx must include non-empty explanatory notes'
      );
    });

    it("validates placeholder, generated, and approved_exception entries correctly when notes are provided", () => {
      const validPlaceholder: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "not_found_placeholder",
        category: "route",
        notes: "Returns notFound() under primary production",
      };
      expect(validateInventoryEntry(validPlaceholder, mockFileExists)).toEqual([]);

      const validGenerated: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "generated",
        category: "generated",
        notes: "Generated build asset",
      };
      expect(validateInventoryEntry(validGenerated, mockFileExists)).toEqual([]);

      const validException: InventoryEntry = {
        path: "src/app/page.tsx",
        disposition: "approved_exception",
        category: "route",
        notes: "Approved legacy contrast exception per design doc section 15",
      };
      expect(validateInventoryEntry(validException, mockFileExists)).toEqual([]);
    });
  });
});
