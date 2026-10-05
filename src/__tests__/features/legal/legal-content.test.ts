import { describe, expect, it } from "vitest";
import { legalDocuments, LEGAL_VERSIONS } from "@/features/legal";

describe("native legal content", () => {
  it("contains typed Privacy Notice and Terms of Use documents", () => {
    expect(legalDocuments.privacy.title).toBe("System CLOIE Privacy Notice");
    expect(legalDocuments.terms.title).toBe("System CLOIE Terms of Use");
    expect(legalDocuments.privacy.sections.length).toBeGreaterThan(10);
    expect(legalDocuments.terms.sections.length).toBeGreaterThan(10);
    expect(legalDocuments.privacy.version).toBe(LEGAL_VERSIONS.privacy);
    expect(legalDocuments.terms.version).toBe(LEGAL_VERSIONS.terms);
  });

  it("keeps unresolved publication values visible", () => {
    for (const document of Object.values(legalDocuments)) {
      expect(document.approvalStatus.toLowerCase()).toContain("draft");
      expect(document.effectiveDate).toContain("Pending");
      expect(document.lastUpdated).toContain("Pending");
    }
  });

  it("has unique stable section anchors", () => {
    const ids = Object.values(legalDocuments).flatMap((document) =>
      document.sections.map((section) => section.id)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
