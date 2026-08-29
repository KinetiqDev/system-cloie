export const PLO_IMPORT_MAX_ROWS = 20;

export type PLOImportSourceRow = {
  sourceIndex: number;
  input: { plo_code: string; description: string };
};

export type PLOImportRowStatus =
  | "READY"
  | "INVALID"
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING_ACTIVE"
  | "DUPLICATE_EXISTING_ARCHIVED";
export type PLOImportOutcome = Exclude<PLOImportRowStatus, "READY"> | "CREATED";

export type PLOImportPreviewRow = {
  sourceIndex: number;
  input: PLOImportSourceRow["input"];
  ploCode: string;
  description: string;
  status: PLOImportRowStatus;
  error: string | null;
};

export type PLOImportSummary = {
  total: number;
  ready: number;
  attention: number;
  existing: number;
  created: number;
  notCreated: number;
};

export type PLOImportPreview = { rows: PLOImportPreviewRow[]; summary: PLOImportSummary };
export type PLOImportResultRow = PLOImportPreviewRow & { outcome: PLOImportOutcome };
export type PLOImportResult = { rows: PLOImportResultRow[]; summary: PLOImportSummary };
