export type LegalDocumentKind = "privacy" | "terms";

export type LegalTable = {
  headers: string[];
  rows: string[][];
};

export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "table"; table: LegalTable };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalSummary = {
  paragraphs: string[];
  acknowledgementLabel: string;
};

export type LegalDocument = {
  kind: LegalDocumentKind;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  approvalStatus: string;
  approvalNote: string;
  summary: LegalSummary;
  sections: LegalSection[];
};
