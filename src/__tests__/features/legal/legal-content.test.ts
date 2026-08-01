import { describe, expect, it } from "vitest";
import { legalDocuments, LEGAL_VERSIONS } from "@/features/legal";

describe("native legal content", () => {
  it("contains typed Privacy Notice and Terms of Use documents", () => {
    expect(legalDocuments.privacy.title).toBe("System CLOIE Privacy Notice");
    expect(legalDocuments.terms.title).toBe("System CLOIE Terms of Use");
    expect(legalDocuments.privacy.sections.length).toBeGreaterThan(10);
    expect(legalDocuments.terms.sections.length).toBeGreaterThan(10);
    expect(LEGAL_VERSIONS).toEqual({ privacy: "1.0", terms: "1.0" });
  });

  it("keeps unresolved publication values visible", () => {
    for (const document of Object.values(legalDocuments)) {
      expect(document.approvalStatus.toLowerCase()).toContain("draft");
      expect(document.effectiveDate).toContain("Pending");
      expect(document.lastUpdated).toContain("Pending");
    }
  });

  it("has unique stable section anchors and no Markdown source dependency", async () => {
    const ids = Object.values(legalDocuments).flatMap((document) =>
      document.sections.map((section) => section.id)
    );
    expect(new Set(ids).size).toBe(ids.length);

    const source = await import("fs/promises").then((fs) =>
      Promise.all([
        fs.readFile("src/features/legal/content.ts", "utf8"),
        fs.readFile("src/features/legal/components/legal-page-shell.tsx", "utf8"),
      ])
    );
    expect(source.join("\n")).not.toContain("docs/privacy-and-ToS/");
  });

  it("barrel re-exports the canonical LEGAL_VERSIONS module", async () => {
    const { LEGAL_VERSIONS: canonical } = await import("@/features/legal/legal-versions");
    expect(LEGAL_VERSIONS).toBe(canonical);
  });

  it("keeps ticket signing code outside the client acknowledgement boundary", async () => {
    const [ticketSource, dialogSource] = await import("fs/promises").then((fs) =>
      Promise.all([
        fs.readFile("src/features/legal/services/legal-acknowledgement-ticket.ts", "utf8"),
        fs.readFile("src/features/legal/components/legal-acknowledgement-dialog.tsx", "utf8"),
      ])
    );
    expect(ticketSource).toContain('from "node:crypto"');
    expect(dialogSource).not.toContain("legal-acknowledgement-ticket");
  });
});
