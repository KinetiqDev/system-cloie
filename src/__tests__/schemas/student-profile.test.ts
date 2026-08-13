import { describe, it, expect } from "vitest";
import { studentProfileSchema } from "@/lib/schemas/student-profile";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const validInput = {
  program_id: VALID_UUID,
  major_id: "",
  year_level: "FIRST_YEAR" as const,
  student_id_number: "21-12345",
  section: "MORNING" as const,
};

describe("studentProfileSchema", () => {
  describe("valid inputs", () => {
    it("accepts a complete valid profile without major", () => {
      const result = studentProfileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts a profile with a valid major_id UUID", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        major_id: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("accepts major_id as null", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        major_id: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts major_id as undefined", () => {
      const withoutMajor = {
        program_id: validInput.program_id,
        year_level: validInput.year_level,
        student_id_number: validInput.student_id_number,
        section: validInput.section,
      };
      const result = studentProfileSchema.safeParse(withoutMajor);
      expect(result.success).toBe(true);
    });
  });

  describe("identity fields are not part of the contract", () => {
    it("strips injected first_name, last_name, and name from successful parse output", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        first_name: "Injected",
        last_name: "Identity",
        name: "Injected Identity",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("first_name");
        expect(result.data).not.toHaveProperty("last_name");
        expect(result.data).not.toHaveProperty("name");
        expect(result.data).toEqual(validInput);
      }
    });

    it("does not require first_name or last_name", () => {
      const result = studentProfileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("program_id validation", () => {
    it("rejects non-UUID program_id", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        program_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty program_id", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        program_id: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("year_level validation", () => {
    it("rejects invalid year_level value", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        year_level: "FIFTH_YEAR",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing year_level", () => {
      const withoutYearLevel = {
        program_id: validInput.program_id,
        major_id: validInput.major_id,
        student_id_number: validInput.student_id_number,
        section: validInput.section,
      };
      const result = studentProfileSchema.safeParse(withoutYearLevel);
      expect(result.success).toBe(false);
    });
  });

  describe("student_id_number validation", () => {
    it("rejects student_id_number shorter than 5 characters", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        student_id_number: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("accepts student_id_number of exactly 5 characters", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        student_id_number: "12345",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty student_id_number", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        student_id_number: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("major_id edge cases", () => {
    it("rejects a non-UUID, non-empty major_id string", () => {
      const result = studentProfileSchema.safeParse({
        ...validInput,
        major_id: "invalid-major",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("section validation", () => {
    it("accepts MORNING section", () => {
      const result = studentProfileSchema.safeParse({ ...validInput, section: "MORNING" });
      expect(result.success).toBe(true);
    });

    it("accepts AFTERNOON section", () => {
      const result = studentProfileSchema.safeParse({ ...validInput, section: "AFTERNOON" });
      expect(result.success).toBe(true);
    });

    it("accepts EVENING section", () => {
      const result = studentProfileSchema.safeParse({ ...validInput, section: "EVENING" });
      expect(result.success).toBe(true);
    });

    it("rejects empty string section", () => {
      const result = studentProfileSchema.safeParse({ ...validInput, section: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing section", () => {
      const withoutSection = {
        program_id: validInput.program_id,
        major_id: validInput.major_id,
        year_level: validInput.year_level,
        student_id_number: validInput.student_id_number,
      };
      const result = studentProfileSchema.safeParse(withoutSection);
      expect(result.success).toBe(false);
    });

    it("rejects invalid section value", () => {
      const result = studentProfileSchema.safeParse({ ...validInput, section: "NIGHT" });
      expect(result.success).toBe(false);
    });
  });
});
