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

  it("names every authorized reader of identified submitted responses", () => {
    const confidentiality = legalDocuments.privacy.sections.find(
      (section) => section.id === "confidentiality"
    );
    const text = confidentiality?.blocks
      .map((block) => (block.type === "paragraph" ? block.text : ""))
      .join(" ");

    expect(text).toContain(
      "Authorized Program Heads may review identified submitted responses from Program-specific courses and Central deployments within their assigned programs."
    );
    expect(text).toContain(
      "Authorized General Education Coordinators may review identified submitted responses from General Education courses across programs."
    );
    expect(text).toContain(
      "This access is for quality assurance, accreditation, and continuous-improvement purposes."
    );
    expect(text).not.toContain(
      "Authorized Program Heads may review identified submitted responses within their assigned programs"
    );
  });

  it("has unique stable section anchors", () => {
    const ids = Object.values(legalDocuments).flatMap((document) =>
      document.sections.map((section) => section.id)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
