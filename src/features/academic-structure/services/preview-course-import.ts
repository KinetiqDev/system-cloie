import { CourseScope } from "@prisma/client";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";

import { createCourseSchema, type CreateCourseInput } from "../schemas/course";
import type { CourseImportRequest, CourseImportRequestRow } from "../schemas/course-import";
import type {
  CourseImportCatalogOption,
  CourseImportMode,
  CourseImportPreview,
  CourseImportPreviewRow,
  CourseImportRowStatus,
  CourseImportSummary,
} from "../types/course-import";

export type CourseImportActor =
  | { role: typeof ROLES.SECRETARY }
  | { role: typeof ROLES.GEN_ED_COORDINATOR }
  | {
      role: typeof ROLES.PROGRAM_HEAD;
      userId: string;
      selectedProgram: CourseImportCatalogOption;
    };

type ProgramRecord = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type MajorRecord = {
  id: string;
  name: string;
  program_id: string;
  is_active: boolean;
};

type ImportRowResolution = {
  courseScope: CourseScope;
  courseType: string | null;
  program: ProgramRecord | null;
  major: MajorRecord | null;
  majorName: string;
};

type ResolvedImportRow = {
  preview: CourseImportPreviewRow;
  input: CreateCourseInput | null;
};

type CourseSchemaParseResult =
  | { success: true; data: CreateCourseInput }
  | { success: false; error: { issues: Array<{ message?: string }> } };

const MODE_HEADERS: Record<CourseImportMode, readonly string[]> = {
  secretary: [
    "course_code",
    "course_title",
    "course_scope",
    "program_code",
    "major_name",
    "year_level",
    "semester",
    "term",
  ],
  "program-head": [
    "course_code",
    "course_title",
    "course_type",
    "major_name",
    "year_level",
    "semester",
    "term",
  ],
  "general-education": ["course_code", "course_title", "year_level", "semester", "term"],
};

const INVALID_COLUMNS = "This row does not match the selected Course import template.";

function normalizeText(value: string | undefined): string {
  return (value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function normalizeCode(value: string | undefined): string {
  return normalizeText(value).toUpperCase();
}

function normalizeLookup(value: string | undefined): string {
  return normalizeText(value).toLocaleLowerCase();
}

function readField(row: CourseImportRequestRow, key: string): string {
  return normalizeText(row.input[key]);
}

function expectedColumns(row: CourseImportRequestRow, mode: CourseImportMode): boolean {
  const expected = MODE_HEADERS[mode];
  const actual = Object.keys(row.input);
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

function firstSchemaError(parsed: CourseSchemaParseResult): string {
  return parsed.success ? "" : (parsed.error.issues[0]?.message ?? "Enter valid Course details.");
}

function emptyPreviewRow(
  row: CourseImportRequestRow,
  values: Partial<CourseImportPreviewRow> & { status: CourseImportRowStatus; error: string }
): CourseImportPreviewRow {
  return {
    sourceIndex: row.sourceIndex,
    input: row.input,
    courseCode: values.courseCode ?? readField(row, "course_code"),
    courseTitle: values.courseTitle ?? readField(row, "course_title"),
    courseScope: values.courseScope ?? null,
    courseType: values.courseType ?? null,
    programCode: values.programCode ?? null,
    programName: values.programName ?? null,
    majorName: values.majorName ?? null,
    yearLevel: values.yearLevel ?? null,
    semester: values.semester ?? null,
    term: values.term ?? null,
    status: values.status,
    error: values.error,
  };
}

function invalidRow(
  row: CourseImportRequestRow,
  values: Partial<CourseImportPreviewRow> & { status: CourseImportRowStatus; error: string }
): ResolvedImportRow {
  return { preview: emptyPreviewRow(row, values), input: null };
}

function courseScopeForRow(
  mode: CourseImportMode,
  row: CourseImportRequestRow
): CourseScope | null {
  if (mode === "general-education") return CourseScope.GENERAL_EDUCATION;
  if (mode === "program-head") return CourseScope.PROGRAM_SPECIFIC;

  const scope = readField(row, "course_scope").toUpperCase();
  return scope === CourseScope.GENERAL_EDUCATION || scope === CourseScope.PROGRAM_SPECIFIC
    ? scope
    : null;
}

function courseTypeForRow(mode: CourseImportMode, row: CourseImportRequestRow): string | null {
  if (mode !== "program-head") return null;
  const type = readField(row, "course_type").toUpperCase();
  return type || null;
}

function lookupProgram(programs: ProgramRecord[], code: string): ProgramRecord | null {
  return programs.find((program) => normalizeCode(program.code) === code) ?? null;
}

function lookupMajor(majors: MajorRecord[], programId: string, name: string): MajorRecord | null {
  return (
    majors.find(
      (major) =>
        major.program_id === programId && normalizeLookup(major.name) === normalizeLookup(name)
    ) ?? null
  );
}

function buildCourseInput(
  row: CourseImportRequestRow,
  resolution: ImportRowResolution,
  programId: string | null,
  majorId: string | null
) {
  return {
    code: readField(row, "course_code"),
    title: readField(row, "course_title"),
    course_scope: resolution.courseScope,
    program_id: programId ?? undefined,
    major_id: majorId ?? undefined,
    default_year_level: readField(row, "year_level") || undefined,
    default_semester: readField(row, "semester") || undefined,
    default_term: readField(row, "term") || undefined,
  };
}

function readyRow(
  row: CourseImportRequestRow,
  resolution: ImportRowResolution,
  parsed: Extract<CourseSchemaParseResult, { success: true }>
): ResolvedImportRow {
  const { data } = parsed;
  return {
    preview: {
      sourceIndex: row.sourceIndex,
      input: row.input,
      courseCode: data.code,
      courseTitle: data.title,
      courseScope: resolution.courseScope,
      courseType: resolution.courseType,
      programCode: resolution.program?.code ?? null,
      programName: resolution.program?.name ?? null,
      majorName: resolution.major?.name ?? (resolution.majorName || null),
      yearLevel: data.default_year_level ?? null,
      semester: data.default_semester ?? null,
      term: data.default_term ?? null,
      status: "READY",
      error: null,
    },
    input: data,
  };
}

function resolveRowContext(
  row: CourseImportRequestRow,
  mode: CourseImportMode,
  actor: CourseImportActor,
  programs: ProgramRecord[],
  majors: MajorRecord[]
): ResolvedImportRow | ImportRowResolution {
  if (!expectedColumns(row, mode)) {
    return invalidRow(row, { status: "INVALID", error: INVALID_COLUMNS });
  }

  const courseScope = courseScopeForRow(mode, row);
  const courseType = courseTypeForRow(mode, row);
  const majorName = readField(row, "major_name");
  const programCode = normalizeCode(row.input.program_code);

  if (!courseScope) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseType,
      status: "INVALID",
      error: "Course scope must be GENERAL_EDUCATION or PROGRAM_SPECIFIC.",
    });
  }

  if (mode === "general-education") {
    return { courseScope, courseType, program: null, major: null, majorName };
  }

  if (mode === "program-head") {
    if (courseType !== "PROGRAM_WIDE" && courseType !== "MAJOR_SPECIFIC") {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        status: "INVALID",
        error: "Course type must be PROGRAM_WIDE or MAJOR_SPECIFIC.",
      });
    }

    if (actor.role !== ROLES.PROGRAM_HEAD) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        status: "OUT_OF_SCOPE",
        error: "This import is outside your Course scope.",
      });
    }

    const program: ProgramRecord = {
      ...actor.selectedProgram,
      is_active: true,
    };
    if (courseType === "PROGRAM_WIDE" && majorName) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        programCode: program.code,
        programName: program.name,
        majorName,
        status: "INVALID",
        error: "Program-wide Courses cannot include a Major.",
      });
    }
    if (courseType === "MAJOR_SPECIFIC" && !majorName) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        programCode: program.code,
        programName: program.name,
        status: "INVALID",
        error: "Major-specific Courses require a Major name.",
      });
    }

    const major = majorName ? lookupMajor(majors, program.id, majorName) : null;
    if (majorName && !major) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        programCode: program.code,
        programName: program.name,
        majorName,
        status: "UNKNOWN_MAJOR",
        error: `Major "${majorName}" was not found in ${program.code}.`,
      });
    }
    if (major && !major.is_active) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        courseType,
        programCode: program.code,
        programName: program.name,
        majorName: major.name,
        status: "INACTIVE_MAJOR",
        error: `Major "${major.name}" is inactive in ${program.code}.`,
      });
    }

    return { courseScope, courseType, program, major, majorName };
  }

  if (courseScope === CourseScope.GENERAL_EDUCATION) {
    if (programCode || majorName) {
      return invalidRow(row, {
        courseCode: normalizeCode(row.input.course_code),
        courseTitle: readField(row, "course_title"),
        courseScope,
        programCode: programCode || null,
        majorName: majorName || null,
        status: "OUT_OF_SCOPE",
        error: "General Education Courses cannot be tied to a Program or Major.",
      });
    }
    return { courseScope, courseType, program: null, major: null, majorName };
  }

  if (!programCode) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope,
      status: "INVALID",
      error: "Program-specific Courses require a Program code.",
    });
  }

  const program = lookupProgram(programs, programCode);
  if (!program) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope,
      programCode,
      status: "UNKNOWN_PROGRAM",
      error: `Program "${programCode}" was not found.`,
    });
  }
  if (!program.is_active) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope,
      programCode: program.code,
      programName: program.name,
      status: "INACTIVE_PROGRAM",
      error: `Program "${program.code}" is inactive.`,
    });
  }

  const major = majorName ? lookupMajor(majors, program.id, majorName) : null;
  if (majorName && !major) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope,
      programCode: program.code,
      programName: program.name,
      majorName,
      status: "UNKNOWN_MAJOR",
      error: `Major "${majorName}" was not found in ${program.code}.`,
    });
  }
  if (major && !major.is_active) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope,
      programCode: program.code,
      programName: program.name,
      majorName: major.name,
      status: "INACTIVE_MAJOR",
      error: `Major "${major.name}" is inactive in ${program.code}.`,
    });
  }

  return { courseScope, courseType, program, major, majorName };
}

function validateRow(
  row: CourseImportRequestRow,
  mode: CourseImportMode,
  actor: CourseImportActor,
  programs: ProgramRecord[],
  majors: MajorRecord[]
): ResolvedImportRow {
  const context = resolveRowContext(row, mode, actor, programs, majors);
  if ("preview" in context) return context;

  const programId = context.program?.id ?? null;
  const majorId = context.major?.id ?? null;
  const parsed = createCourseSchema.safeParse(
    buildCourseInput(row, context, programId, majorId)
  ) as CourseSchemaParseResult;

  if (!parsed.success) {
    return invalidRow(row, {
      courseCode: normalizeCode(row.input.course_code),
      courseTitle: readField(row, "course_title"),
      courseScope: context.courseScope,
      courseType: context.courseType,
      programCode: context.program?.code ?? null,
      programName: context.program?.name ?? null,
      majorName: context.major?.name ?? (context.majorName || null),
      status: "INVALID",
      error: firstSchemaError(parsed),
    });
  }

  return readyRow(row, context, parsed);
}

function summarizePreview(rows: CourseImportPreviewRow[]): CourseImportSummary {
  const ready = rows.filter((row) => row.status === "READY").length;
  return {
    total: rows.length,
    ready,
    attention: rows.length - ready,
    created: 0,
    notCreated: rows.length - ready,
    notProcessed: 0,
  };
}

function applyDuplicateStatuses(
  rows: ResolvedImportRow[],
  existingCodes: Set<string>
): CourseImportPreviewRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.preview.status === "READY" && row.input) {
      const code = normalizeCode(row.input.code);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  return rows.map((row) => {
    if (row.preview.status !== "READY" || !row.input) return row.preview;

    const code = normalizeCode(row.input.code);
    if ((counts.get(code) ?? 0) > 1) {
      return {
        ...row.preview,
        status: "DUPLICATE_IN_FILE",
        error: `Course code "${code}" appears more than once in this file. Keep one row.`,
      };
    }
    if (existingCodes.has(code)) {
      return {
        ...row.preview,
        status: "DUPLICATE_EXISTING",
        error: `A Course with code "${code}" already exists in System CLOIE.`,
      };
    }
    return row.preview;
  });
}

async function requireCourseImportActor(
  mode: CourseImportMode,
  selectedProgramId: string | undefined
): Promise<ServiceResult<CourseImportActor>> {
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Authentication is required." };

  if (mode === "secretary") {
    if (session.activeRole !== ROLES.SECRETARY) {
      return { success: false, error: "Secretary access is required for this import." };
    }
    return { success: true, data: { role: ROLES.SECRETARY } };
  }

  if (mode === "general-education") {
    if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
      return {
        success: false,
        error: "General Education Coordinator access is required for this import.",
      };
    }
    return { success: true, data: { role: ROLES.GEN_ED_COORDINATOR } };
  }

  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { success: false, error: "Program Head access is required for this import." };
  }
  if (!selectedProgramId) {
    return { success: false, error: "Select a Program before importing Courses." };
  }

  const context = await resolveProgramHeadContext(selectedProgramId);
  if (!context.success) return context;

  return {
    success: true,
    data: {
      role: ROLES.PROGRAM_HEAD,
      userId: context.data.userId,
      selectedProgram: {
        id: context.data.selectedProgram.id,
        code: context.data.selectedProgram.code,
        name: context.data.selectedProgram.name,
      },
    },
  };
}

export async function previewCourseImport(
  input: CourseImportRequest
): Promise<ServiceResult<CourseImportPreview>> {
  const actorResult = await requireCourseImportActor(input.mode, input.selectedProgramId);
  if (!actorResult.success) return actorResult;

  const actor = actorResult.data;
  const courseCodes = input.rows.map((row) => normalizeCode(row.input.course_code)).filter(Boolean);
  const programCodes =
    input.mode === "secretary"
      ? input.rows.map((row) => normalizeCode(row.input.program_code)).filter(Boolean)
      : [];

  const [existingCourses, programs] = await Promise.all([
    prisma.course.findMany({
      where: { code: { in: courseCodes } },
      select: { code: true },
    }),
    input.mode === "secretary"
      ? prisma.program.findMany({
          where: { code: { in: programCodes } },
          select: { id: true, code: true, name: true, is_active: true },
        })
      : Promise.resolve([] as ProgramRecord[]),
  ]);

  const programIds =
    actor.role === ROLES.PROGRAM_HEAD
      ? [actor.selectedProgram.id]
      : programs.map((program) => program.id);
  const majors =
    programIds.length > 0
      ? await prisma.major.findMany({
          where: { program_id: { in: programIds } },
          select: { id: true, name: true, program_id: true, is_active: true },
        })
      : [];

  const resolvedRows = input.rows.map((row) =>
    validateRow(row, input.mode, actor, programs, majors)
  );
  const rows = applyDuplicateStatuses(
    resolvedRows,
    new Set(existingCourses.map((course) => normalizeCode(course.code)))
  );

  return { success: true, data: { rows, summary: summarizePreview(rows) } };
}

export { MODE_HEADERS, requireCourseImportActor };
