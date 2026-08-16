/** Readable scope summary for the current analytics view */
export type ProgramHeadAnalyticsScopeSummary = {
  programCode: string;
  programName: string;
  periodLabel: string | null;
};

/** A canonical period option available in the selected Program scope. */
type ProgramHeadAnalyticsPeriodOption = {
  id: string;
  schoolYearId: string;
  schoolYearLabel: string;
  semester: string;
  semesterLabel: string;
  termLabel: string | null;
  label: string;
};

/** Context-aware period filter options; empty arrays omit their controls. */
export type ProgramHeadAnalyticsPeriodOptions = {
  schoolYears: Array<{ id: string; label: string }>;
  semesters: Array<{ value: string; label: string }>;
  termInstances: ProgramHeadAnalyticsPeriodOption[];
};

/** Overview KPI metrics */
export type ProgramHeadOverviewKPI = {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  /** null when evaluationOpportunityCount is 0 (unavailable rate) */
  responseRate: number | null;
  ratingCount: number;
  /** Full precision mean; null when ratingCount is 0 */
  meanRating: number | null;
};

/** Reasons the overview may show an empty or partial state */
export type OverviewEmptyReason = "no-assignments" | "no-submissions" | null;

/** Closed, serializable Overview projection. */
export type ProgramHeadOverviewDTO = {
  scope: ProgramHeadAnalyticsScopeSummary;
  kpi: ProgramHeadOverviewKPI;
  emptyReason: OverviewEmptyReason;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
};
