#!/usr/bin/env tsx
/**
 * Link legacy CourseAssignments to one unambiguous CurriculumCourse.
 *
 * Matching uses the assignment's course, program, year level, semester, and
 * term. Summer assignments match CurriculumCourses with a null term.
 *
 * Run with: pnpm exec tsx scripts/backfill-course-assignment-curriculum.ts
 */

import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";
import { Prisma, type PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db/prisma";

type BackfillModels = Pick<PrismaClient, "courseAssignment" | "curriculumCourse">;
type BackfillDb = BackfillModels & Pick<PrismaClient, "$transaction">;

type CourseAssignmentCurriculumBackfillCounts = {
  totalAssignments: number;
  linked: number;
  unmatched: number;
  ambiguous: number;
};

type AssignmentForBackfill = {
  id: string;
  curriculum_course_id: string | null;
  course_id: string;
  program_id: string;
  year_level: string;
  term_instance: {
    semester: string;
    term: string | null;
    school_year: { id: string; start_date: Date | null };
  };
};

type CurriculumCourseForBackfill = {
  id: string;
  course_id: string;
  year_level: string;
  semester: string;
  term: string | null;
  curriculum_version: {
    program_id: string;
    status: string;
    effective_from_school_year_id: string | null;
    effective_from_year: { id: string; start_date: Date | null } | null;
  };
};

function placementKey(input: {
  courseId: string;
  programId: string;
  yearLevel: string;
  semester: string;
  term: string | null;
}) {
  return [
    input.courseId,
    input.programId,
    input.yearLevel,
    input.semester,
    input.term ?? "SUMMER",
  ].join(":");
}

function isApplicableToSchoolYear(
  curriculumCourse: CurriculumCourseForBackfill,
  assignment: AssignmentForBackfill
) {
  const version = curriculumCourse.curriculum_version;
  if (version.status !== "PUBLISHED") return false;

  if (!version.effective_from_school_year_id) return true;
  if (version.effective_from_school_year_id === assignment.term_instance.school_year.id) {
    return true;
  }

  const effectiveStart = version.effective_from_year?.start_date;
  const assignmentStart = assignment.term_instance.school_year.start_date;
  return effectiveStart !== null && effectiveStart !== undefined &&
    assignmentStart !== null && assignmentStart !== undefined &&
    effectiveStart <= assignmentStart;
}

async function runBackfill(
  db: BackfillModels
): Promise<CourseAssignmentCurriculumBackfillCounts> {
  const assignments = (await db.courseAssignment.findMany({
    select: {
      id: true,
      curriculum_course_id: true,
      course_id: true,
      program_id: true,
      year_level: true,
      term_instance: {
        select: {
          semester: true,
          term: true,
          school_year: { select: { id: true, start_date: true } },
        },
      },
    },
  })) as AssignmentForBackfill[];

  const curriculumCourses = (await db.curriculumCourse.findMany({
    where: { curriculum_version: { status: "PUBLISHED" } },
    select: {
      id: true,
      course_id: true,
      year_level: true,
      semester: true,
      term: true,
      curriculum_version: {
        select: {
          program_id: true,
          status: true,
          effective_from_school_year_id: true,
          effective_from_year: { select: { id: true, start_date: true } },
        },
      },
    },
  })) as CurriculumCourseForBackfill[];

  const matchesByPlacement = new Map<string, CurriculumCourseForBackfill[]>();
  for (const curriculumCourse of curriculumCourses) {
    const key = placementKey({
      courseId: curriculumCourse.course_id,
      programId: curriculumCourse.curriculum_version.program_id,
      yearLevel: curriculumCourse.year_level,
      semester: curriculumCourse.semester,
      term: curriculumCourse.term,
    });
    const matches = matchesByPlacement.get(key) ?? [];
    matches.push(curriculumCourse);
    matchesByPlacement.set(key, matches);
  }

  let linked = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const assignment of assignments) {
    if (assignment.curriculum_course_id) continue;

    const matches = (matchesByPlacement.get(
      placementKey({
        courseId: assignment.course_id,
        programId: assignment.program_id,
        yearLevel: assignment.year_level,
        semester: assignment.term_instance.semester,
        term: assignment.term_instance.term,
      })
    ) ?? []).filter((curriculumCourse) =>
      isApplicableToSchoolYear(curriculumCourse, assignment)
    );

    if (!matches?.length) {
      unmatched += 1;
      continue;
    }

    if (matches.length > 1) {
      ambiguous += 1;
      continue;
    }

    const result = await db.courseAssignment.updateMany({
      where: { id: assignment.id, curriculum_course_id: null },
      data: { curriculum_course_id: matches[0].id },
    });
    linked += result.count;
  }

  return {
    totalAssignments: assignments.length,
    linked,
    unmatched,
    ambiguous,
  };
}

function isSerializationConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function backfillCourseAssignmentCurriculum(
  db: BackfillDb = prisma
): Promise<CourseAssignmentCurriculumBackfillCounts> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        (tx) => runBackfill(tx),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === 2) throw error;
    }
  }

  throw new Error("CourseAssignment curriculum backfill exhausted transaction retries.");
}

export async function main(log: (message: string) => void = console.log): Promise<void> {
  const counts = await backfillCourseAssignmentCurriculum();
  log(
    `CourseAssignment curriculum backfill: total=${counts.totalAssignments} ` +
      `linked=${counts.linked} unmatched=${counts.unmatched} ambiguous=${counts.ambiguous}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error("CourseAssignment curriculum backfill failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
