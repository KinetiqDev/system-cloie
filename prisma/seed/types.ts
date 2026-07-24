export interface LikertDescriptor {
  value: number;
  label: string;
}

export interface TemplateQuestion {
  key: string;
  prompt: string;
  type: "likert" | "guided_open_ended";
  order: number;
  required: boolean;
  likertDescriptors?: LikertDescriptor[];
  suggestedResponses?: string[];
}

export interface TemplateSection {
  key: string;
  title: string;
  description?: string;
  order: number;
  questions: TemplateQuestion[];
}

export type TemplateStructure = TemplateSection[];

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
  ciloMap: Map<string, { id: string; description: string; order: number }[]>;
}

export interface EvaluationContext {
  cbEval1: { id: string };
  cbEval2: { id: string };
  newCbEvals: Map<string, { id: string }>;
}
