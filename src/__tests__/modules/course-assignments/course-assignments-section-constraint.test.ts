import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { YearLevel, StudentSection } from "@prisma/client";
import crypto from "crypto";

/**
 * Integration test for CourseAssignment.section NOT NULL constraint.
 * This test verifies that the database enforces the constraint added in Issue #38.
 */
describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1"
)("CourseAssignment.section NOT NULL constraint", () => {
  const generateUuid = () => crypto.randomUUID();

  it("should reject CourseAssignment creation with null section", async () => {
    // Get a valid term instance from the database
    const termInstance = await prisma.academicTermInstance.findFirst();
    expect(termInstance).toBeTruthy();
    if (!termInstance) return;

    // Get a valid course
    const course = await prisma.course.findFirst();
    expect(course).toBeTruthy();
    if (!course) return;

    // Get a valid program
    const program = await prisma.program.findFirst();
    expect(program).toBeTruthy();
    if (!program) return;

    // Get a valid faculty user
    const faculty = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: "FACULTY",
          },
        },
      },
    });

    if (!faculty) {
      // Skip if no faculty user exists
      console.warn("Skipping test: no faculty user found");
      return;
    }

    const testId = generateUuid();

    // Attempt to create a CourseAssignment with null section
    // This should fail after Issue #38 migration is applied
    const createPromise = prisma.courseAssignment.create({
      data: {
        id: testId,
        term_instance_id: termInstance.id,
        faculty_id: faculty.id,
        course_id: course.id,
        program_id: program.id,
        year_level: YearLevel.FIRST_YEAR,
        section: null as unknown as StudentSection, // This should violate NOT NULL constraint
      },
    });

    // After Issue #38, this should throw a NOT NULL constraint violation
    await expect(createPromise).rejects.toThrow(/NOT NULL|section|violates/i);
  });

  it("should accept CourseAssignment creation with valid section", async () => {
    // Get a valid term instance
    const termInstance = await prisma.academicTermInstance.findFirst();
    expect(termInstance).toBeTruthy();
    if (!termInstance) return;

    // Get a valid course
    const course = await prisma.course.findFirst();
    expect(course).toBeTruthy();
    if (!course) return;

    // Get a valid program
    const program = await prisma.program.findFirst();
    expect(program).toBeTruthy();
    if (!program) return;

    // Get a valid faculty user
    const faculty = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: "FACULTY",
          },
        },
      },
    });

    if (!faculty) {
      console.warn("Skipping test: no faculty user found");
      return;
    }

    const testId = generateUuid();

    // Create a CourseAssignment with valid section
    const assignment = await prisma.courseAssignment.create({
      data: {
        id: testId,
        term_instance_id: termInstance.id,
        faculty_id: faculty.id,
        course_id: course.id,
        program_id: program.id,
        year_level: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      },
    });

    expect(assignment).toBeTruthy();
    expect(assignment.section).toBe(StudentSection.MORNING);

    // Cleanup
    await prisma.courseAssignment.delete({
      where: { id: testId },
    });
  });
});
