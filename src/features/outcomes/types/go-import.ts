export const GO_IMPORT_MAX_ROWS = 20;

export type GOImportSourceRow = {
  sourceIndex: number;
  input: { go_code: string; description: string };
};

export type GOImportRowStatus =
  | "READY"
  | "INVALID"
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING_ACTIVE"
  | "DUPLICATE_EXISTING_ARCHIVED";
export type GOImportOutcome = Exclude<GOImportRowStatus, "READY"> | "CREATED";

export type GOImportPreviewRow = {
  sourceIndex: number;
  input: GOImportSourceRow["input"];
  goCode: string;
  description: string;
  status: GOImportRowStatus;
  error: string | null;
};

export type GOImportSummary = {
  total: number;
  ready: number;
  attention: number;
  existing: number;
  created: number;
  notCreated: number;
};

export type GOImportPreview = { rows: GOImportPreviewRow[]; summary: GOImportSummary };
export type GOImportResultRow = GOImportPreviewRow & { outcome: GOImportOutcome };
export type GOImportResult = { rows: GOImportResultRow[]; summary: GOImportSummary };
