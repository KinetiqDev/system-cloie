export const COURSE_INFO_SNAPSHOT_SCHEMA_VERSION = 2;

export type CourseInfoSnapshotSource = "PUBLICATION" | "BACKFILLED_CURRENT_STATE";

export type CourseInfoSnapshotV2 = {
  snapshotSchemaVersion: typeof COURSE_INFO_SNAPSHOT_SCHEMA_VERSION;
  courseAssignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseScope: string;
  programId: string;
  programCode: string;
  programName: string;
  majorId: string | null;
  majorName: string | null;
  termInstanceId: string;
  schoolYearCode: string;
  semester: string;
  term: string | null;
  yearLevel: string;
  section: string;
  facultyId: string;
  facultyName: string;
  capturedAt: string;
  assignmentContextSource: CourseInfoSnapshotSource;
};

export interface BuildCourseInfoSnapshotInput {
  courseAssignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseScope: string;
  programId: string;
  programCode: string;
  programName: string;
  majorId?: string | null;
  majorName?: string | null;
  termInstanceId: string;
  schoolYearCode: string;
  semester: string;
  term?: string | null;
  yearLevel: string;
  section: string;
  facultyId: string;
  facultyName: string;
  capturedAt?: Date;
  assignmentContextSource?: CourseInfoSnapshotSource;
}

export interface ParsedCourseInfoSnapshot {
  snapshotSchemaVersion: number | null;
  courseCode: string | null;
  courseTitle: string | null;
  courseScope: string | null;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  schoolYearCode: string | null;
  semester: string | null;
  term: string | null;
  yearLevel: string | null;
  section: string | null;
  facultyName: string | null;
  capturedAt: string | null;
  assignmentContextSource: CourseInfoSnapshotSource | null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableText(value: unknown): string | null {
  return value === null || typeof value === "string" ? (value as string | null) : null;
}

function asSnapshotVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asSnapshotSource(value: unknown): CourseInfoSnapshotSource | null {
  return value === "PUBLICATION" || value === "BACKFILLED_CURRENT_STATE" ? value : null;
}

export function buildCourseInfoSnapshotV2(
  input: BuildCourseInfoSnapshotInput
): CourseInfoSnapshotV2 {
  return {
    snapshotSchemaVersion: COURSE_INFO_SNAPSHOT_SCHEMA_VERSION,
    courseAssignmentId: input.courseAssignmentId,
    courseId: input.courseId,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    courseScope: input.courseScope,
    programId: input.programId,
    programCode: input.programCode,
    programName: input.programName,
    majorId: input.majorId ?? null,
    majorName: input.majorName ?? null,
    termInstanceId: input.termInstanceId,
    schoolYearCode: input.schoolYearCode,
    semester: input.semester,
    term: input.term ?? null,
    yearLevel: input.yearLevel,
    section: input.section,
    facultyId: input.facultyId,
    facultyName: input.facultyName,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    assignmentContextSource: input.assignmentContextSource ?? "PUBLICATION",
  };
}

export function parseCourseInfoSnapshot(value: unknown): ParsedCourseInfoSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;

  return {
    snapshotSchemaVersion: asSnapshotVersion(snapshot.snapshotSchemaVersion),
    courseCode: asText(snapshot.courseCode ?? snapshot.code),
    courseTitle: asText(snapshot.courseTitle ?? snapshot.title),
    courseScope: asText(snapshot.courseScope),
    programCode: asText(snapshot.programCode),
    programName: asText(snapshot.programName),
    majorName: asNullableText(snapshot.majorName),
    schoolYearCode: asText(snapshot.schoolYearCode),
    semester: asText(snapshot.semester),
    term: asNullableText(snapshot.term),
    yearLevel: asNullableText(snapshot.yearLevel),
    section: asNullableText(snapshot.section),
    facultyName: asNullableText(snapshot.facultyName),
    capturedAt: asText(snapshot.capturedAt),
    assignmentContextSource: asSnapshotSource(snapshot.assignmentContextSource),
  };
}
