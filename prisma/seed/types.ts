export type ProgramSeed = { id: string; code: string };
export type MajorSeed = { id: string };
export type CourseSeed = { id: string; code: string; title: string };

export interface FoundationContext {
  pMap: Map<string, ProgramSeed>;
  mMap: Map<string, MajorSeed>;
  cMap: Map<string, CourseSeed>;
}

export interface AcademicCalendarContext {
  termInstance: { id: string };
  termInstances: {
    ti2025First: { id: string };
    ti2025Second: { id: string };
    ti2026First: { id: string };
    ti2026Second: { id: string };
    ti2027First: { id: string };
    ti2027SecondCancelled: { id: string };
  };
}

export interface CourseAssignmentContext {
  assignmentMap: Map<string, string>;
}

export interface OutcomeContext {
  goMap: Map<string, { id: string }>;
  iloMap: Map<string, { id: string }>;
  ciloMap: Map<string, { id: string; description: string; order: number }[]>;
}

export interface EvaluationContext {
  cbEval1: { id: string };
  cbEval2: { id: string };
  newCbEvals: Map<string, { id: string }>;
}
