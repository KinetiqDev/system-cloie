export const PO_IMPORT_MAX_ROWS = 20;

export type POImportSourceRow = {
  sourceIndex: number;
  input: { po_code: string; description: string };
};

export type POImportRowStatus =
  | "READY"
  | "INVALID"
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING_ACTIVE"
  | "DUPLICATE_EXISTING_ARCHIVED";
export type POImportOutcome = Exclude<POImportRowStatus, "READY"> | "CREATED";

export type POImportPreviewRow = {
  sourceIndex: number;
  input: POImportSourceRow["input"];
  poCode: string;
  description: string;
  status: POImportRowStatus;
  error: string | null;
};

export type POImportSummary = {
  total: number;
  ready: number;
  attention: number;
  existing: number;
  created: number;
  notCreated: number;
};

export type POImportPreview = { rows: POImportPreviewRow[]; summary: POImportSummary };
export type POImportResultRow = POImportPreviewRow & { outcome: POImportOutcome };
export type POImportResult = { rows: POImportResultRow[]; summary: POImportSummary };
