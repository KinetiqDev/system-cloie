import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentSource, StudentSection, SystemRole, VerificationStatus, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createUserBySecretary } from "@/features/users/services/create-user-by-secretary";
import { createUserBySecretarySchema } from "@/features/users/schemas/create-user";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
    program: {
      findUnique: vi.fn(),
    },
    academicTermInstance: {
      findFirst: vi.fn(),
    },
    studentAcademicProfile: {
      create: vi.fn(),
    },
    studentEnrollment: {
      create: vi.fn(),
    },
    facultyProgramAffiliation: {
      create: vi.fn(),
    },
    programHeadAssignment: {
      create: vi.fn(),
    },
    alumniProfile: {
      create: vi.fn(),
    },
    industryPartnerProfile: {
      create: vi.fn(),
    },
  },
}));

const programId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const majorId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";

describe("create-user-by-secretary schema", () => {
  const validSecretaryInput = {
    first_name: "Jane",
    last_name: "Doe",
    email: "secretary@acd.edu.ph",
    role: SystemRole.SECRETARY,
  };

  it("parses valid Secretary input", () => {
    const result = createUserBySecretarySchema.safeParse(validSecretaryInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("secretary@acd.edu.ph");
    }
  });

  it("parses valid Dean input", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "dean@acdeducation.com",
      role: SystemRole.DEAN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("dean@acdeducation.com");
    }
  });

  it("normalizes and lowercases the email", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "SECRETARY@ACD.EDU.PH ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("secretary@acd.edu.ph");
    }
  });

  it("rejects Secretary input with a non-institutional email", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "secretary@gmail.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssues = result.error.issues.filter((issue) => issue.path.includes("email"));
      expect(emailIssues.length).toBeGreaterThan(0);
      expect(emailIssues[0]?.message).toMatch(/acd institutional email/i);
    }
  });

  it("rejects Dean input with a non-institutional email", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "dean@company.com",
      role: SystemRole.DEAN,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssues = result.error.issues.filter((issue) => issue.path.includes("email"));
      expect(emailIssues.length).toBeGreaterThan(0);
      expect(emailIssues[0]?.message).toMatch(/acd institutional email/i);
    }
  });

  it("rejects missing first name", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      first_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing last name", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      last_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing role", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      role: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("parses valid Program Head input with a managed program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
      program_id: programId,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ph@acd.edu.ph");
      expect(result.data.program_id).toBe(programId);
    }
  });

  it("parses valid Faculty input with a primary program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Bob",
      last_name: "Jones",
      email: "faculty@acdeducation.com",
      role: SystemRole.FACULTY,
      program_id: programId,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("faculty@acdeducation.com");
    }
  });

  it("rejects Program Head input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const programIssues = result.error.issues.filter((issue) => issue.path.includes("program_id"));
      expect(programIssues.length).toBeGreaterThan(0);
      expect(programIssues[0]?.message).toMatch(/select an affiliated program/i);
    }
  });

  it("rejects Faculty input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Bob",
      last_name: "Jones",
      email: "faculty@acdeducation.com",
      role: SystemRole.FACULTY,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const programIssues = result.error.issues.filter((issue) => issue.path.includes("program_id"));
      expect(programIssues.length).toBeGreaterThan(0);
      expect(programIssues[0]?.message).toMatch(/select an affiliated program/i);
    }
  });

  it("rejects Program Head input with a non-institutional email", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@gmail.com",
      role: SystemRole.PROGRAM_HEAD,
      program_id: programId,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssues = result.error.issues.filter((issue) => issue.path.includes("email"));
      expect(emailIssues.length).toBeGreaterThan(0);
      expect(emailIssues[0]?.message).toMatch(/acd institutional email/i);
    }
  });

  it("rejects Faculty input with a non-institutional email", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Bob",
      last_name: "Jones",
      email: "faculty@gmail.com",
      role: SystemRole.FACULTY,
      program_id: programId,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssues = result.error.issues.filter((issue) => issue.path.includes("email"));
      expect(emailIssues.length).toBeGreaterThan(0);
      expect(emailIssues[0]?.message).toMatch(/acd institutional email/i);
    }
  });

  it("parses valid Student input with all required fields", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      major_id: majorId,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("student@acd.edu.ph");
      expect(result.data.student_id_number).toBe("2024-0001");
      expect(result.data.year_level).toBe(YearLevel.FIRST_YEAR);
      expect(result.data.section).toBe(StudentSection.MORNING);
    }
  });

  it("rejects Student input with a non-institutional email", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@gmail.com",
      role: SystemRole.STUDENT,
      program_id: programId,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssues = result.error.issues.filter((issue) => issue.path.includes("email"));
      expect(emailIssues.length).toBeGreaterThan(0);
      expect(emailIssues[0]?.message).toMatch(/acd institutional email/i);
    }
  });

  it("rejects Student input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const programIssues = result.error.issues.filter((issue) => issue.path.includes("program_id"));
      expect(programIssues.length).toBeGreaterThan(0);
      expect(programIssues[0]?.message).toMatch(/select an affiliated program/i);
    }
  });

  it("rejects Student input without a student ID number", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("student_id_number"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects Student input without a year level", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      student_id_number: "2024-0001",
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("year_level"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects Student input without a section", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("section"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("parses valid Alumni input with any valid email domain", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      graduation_year: 2022,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ally.alumni@gmail.com");
      expect(result.data.graduation_year).toBe(2022);
      expect(result.data.program_id).toBe(programId);
    }
  });

  it("rejects Alumni input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      graduation_year: 2022,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const programIssues = result.error.issues.filter((issue) => issue.path.includes("program_id"));
      expect(programIssues.length).toBeGreaterThan(0);
      expect(programIssues[0]?.message).toMatch(/select an affiliated program/i);
    }
  });

  it("rejects Alumni input without a graduation year", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("graduation_year"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("parses valid Industry Partner input with any valid email domain", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@external-company.com",
      role: SystemRole.INDUSTRY_PARTNER,
      company_name: "External Company",
      position: "Hiring Manager",
      program_id: programId,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("partner@external-company.com");
      expect(result.data.company_name).toBe("External Company");
      expect(result.data.position).toBe("Hiring Manager");
      expect(result.data.program_id).toBe(programId);
    }
  });

  it("parses Industry Partner input without optional position or program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
      company_name: "Solo Firm",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBeUndefined();
      expect(result.data.program_id).toBeUndefined();
    }
  });

  it("rejects Industry Partner input without a company name", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("company_name"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects Industry Partner input with a too-short company name", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
      company_name: "A",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((issue) => issue.path.includes("company_name"));
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("parses Student input without a major (conditional-major rule lives in the service)", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Sam",
      last_name: "Student",
      email: "sam.student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.major_id).toBeUndefined();
    }
  });

  it("parses Alumni input without a major (conditional-major rule lives in the service)", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      graduation_year: 2022,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.major_id).toBeUndefined();
    }
  });
});

describe("createUserBySecretary service", () => {
  const validSecretaryInput = {
    first_name: "Jane",
    last_name: "Doe",
    email: "secretary@acd.edu.ph",
    role: SystemRole.SECRETARY,
    program_id: undefined,
    major_id: undefined,
    student_id_number: undefined,
    year_level: undefined,
    section: undefined,
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma)
    );
  });

  it("creates an active Secretary account", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });

    const result = await createUserBySecretary({ ...validSecretaryInput });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-1");
    }
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        first_name: "Jane",
        last_name: "Doe",
        email: "secretary@acd.edu.ph",
        is_active: true,
      },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-1",
        role: SystemRole.SECRETARY,
      },
    });
  });

  it("creates an active Dean account", async () => {
    const deanInput = {
      ...validSecretaryInput,
      email: "dean@acdeducation.com",
      role: SystemRole.DEAN,
    };
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2" });

    const result = await createUserBySecretary(deanInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-2");
    }
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        first_name: "Jane",
        last_name: "Doe",
        email: "dean@acdeducation.com",
        is_active: true,
      }),
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-2",
        role: SystemRole.DEAN,
      },
    });
  });

  it("rejects a duplicate account email", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing-user" });

    const result = await createUserBySecretary({ ...validSecretaryInput });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already exists/i);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a Secretary account with a non-institutional email", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "secretary@gmail.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/acd institutional email/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Dean account with a non-institutional email", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "dean@example.com",
      role: SystemRole.DEAN,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/acd institutional email/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates an active Program Head account with a managed program", async () => {
    const phInput = {
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
      program_id: "program-ph",
        major_id: undefined,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-ph" });

    const result = await createUserBySecretary(phInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-ph");
    }
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-ph",
        role: SystemRole.PROGRAM_HEAD,
      },
    });
    expect(prisma.programHeadAssignment.create).toHaveBeenCalledWith({
      data: {
        program_head_id: "user-ph",
        program_id: "program-ph",
        is_active: true,
      },
    });
  });

  it("creates an active Faculty account with a primary program affiliation", async () => {
    const facultyInput = {
      first_name: "Bob",
      last_name: "Jones",
      email: "faculty@acdeducation.com",
      role: SystemRole.FACULTY,
      program_id: "program-faculty",
        major_id: undefined,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-faculty" });

    const result = await createUserBySecretary(facultyInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-faculty");
    }
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-faculty",
        role: SystemRole.FACULTY,
      },
    });
    expect(prisma.facultyProgramAffiliation.create).toHaveBeenCalledWith({
      data: {
        faculty_id: "user-faculty",
        program_id: "program-faculty",
        is_active: true,
        is_primary: true,
      },
    });
  });

  it("rejects a Program Head account without a program", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select an affiliated program/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Faculty account without a program", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "faculty@acdeducation.com",
      role: SystemRole.FACULTY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select an affiliated program/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates an active Student account with a profile and active-term enrollment", async () => {
    const studentInput = {
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      major_id: majorId,
        student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-student" });
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });
    (prisma.academicTermInstance.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "term-1",
    });

    const result = await createUserBySecretary(studentInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-student");
    }
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-student",
        role: SystemRole.STUDENT,
      },
    });
    expect(prisma.studentAcademicProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-student",
        program_id: programId,
        major_id: majorId,
        student_id_number: "2024-0001",
      },
    });
    expect(prisma.studentEnrollment.create).toHaveBeenCalledWith({
      data: {
        student_user_id: "user-student",
        term_instance_id: "term-1",
        program_id: programId,
        major_id: majorId,
        year_level: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
        source: EnrollmentSource.SECRETARY,
      },
    });
  });

  it("creates a Student profile without enrollment when no active term exists", async () => {
    const studentInput = {
      first_name: "Carlos",
      last_name: "Santos",
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      major_id: undefined,
        student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-student" });
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [],
    });
    (prisma.academicTermInstance.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await createUserBySecretary(studentInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-student");
    }
    expect(prisma.studentAcademicProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-student",
        program_id: programId,
        major_id: null,
        student_id_number: "2024-0001",
      },
    });
    expect(prisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it("rejects a Student account with a non-institutional email", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "student@gmail.com",
      role: SystemRole.STUDENT,
      program_id: programId,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/acd institutional email/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Student account without a program", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select an affiliated program/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Student account when the selected program has active majors but no major is selected", async () => {
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });

    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      major_id: undefined,
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select a major/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Student account when the selected major does not belong to the program", async () => {
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });

    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "student@acd.edu.ph",
      role: SystemRole.STUDENT,
      program_id: programId,
      major_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00",
      student_id_number: "2024-0001",
      year_level: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not belong/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates an active Alumni account with an approved profile", async () => {
    const alumniInput = {
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      major_id: undefined,
        student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: 2022,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-alumni" });
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [],
    });

    const result = await createUserBySecretary(alumniInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-alumni");
    }
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-alumni",
        role: SystemRole.ALUMNI,
      },
    });
    expect(prisma.alumniProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-alumni",
        graduation_year: 2022,
        program_id: programId,
        major_id: null,
        verification_status: VerificationStatus.APPROVED,
      },
    });
  });

  it("creates an Alumni account with a major when the selected program has active majors", async () => {
    const alumniInput = {
      first_name: "Ally",
      last_name: "Santos",
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      major_id: majorId,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: 2022,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-alumni-major" });
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });

    const result = await createUserBySecretary(alumniInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-alumni-major");
    }
    expect(prisma.alumniProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-alumni-major",
        graduation_year: 2022,
        program_id: programId,
        major_id: majorId,
        verification_status: VerificationStatus.APPROVED,
      },
    });
  });

  it("creates an Alumni account with any valid non-ACD email domain", async () => {
    const alumniInput = {
      first_name: "Ally",
      last_name: "Santos",
      email: "alumni@example.org",
      role: SystemRole.ALUMNI,
      program_id: programId,
      major_id: undefined,
        student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: 2023,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-alumni-2" });
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [],
    });

    const result = await createUserBySecretary(alumniInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-alumni-2");
    }
  });

  it("rejects an Alumni account without a program", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      graduation_year: 2022,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select an affiliated program/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an Alumni account without a graduation year", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/graduation year/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an Alumni account when the selected program has active majors but no major is selected", async () => {
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });

    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      graduation_year: 2022,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/select a major/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an Alumni account when the selected major does not belong to the program", async () => {
    (prisma.program.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: programId,
      majors: [{ id: majorId }],
    });

    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "ally.alumni@gmail.com",
      role: SystemRole.ALUMNI,
      program_id: programId,
      major_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00",
      graduation_year: 2022,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not belong/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates an active Industry Partner account with an approved profile", async () => {
    const industryInput = {
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@external-company.com",
      role: SystemRole.INDUSTRY_PARTNER,
      program_id: programId,
      major_id: undefined,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: undefined,
      company_name: "External Company",
      position: "Hiring Manager",
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-industry" });

    const result = await createUserBySecretary(industryInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-industry");
    }
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-industry",
        role: SystemRole.INDUSTRY_PARTNER,
      },
    });
    expect(prisma.industryPartnerProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-industry",
        company_name: "External Company",
        position: "Hiring Manager",
        program_id: programId,
        verification_status: VerificationStatus.APPROVED,
      },
    });
  });

  it("creates an Industry Partner account with any valid non-ACD email domain", async () => {
    const industryInput = {
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
      program_id: undefined,
      major_id: undefined,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: undefined,
      company_name: "Solo Firm",
      position: undefined,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-industry-2" });

    const result = await createUserBySecretary(industryInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-industry-2");
    }
  });

  it("creates an Industry Partner profile without optional program or position", async () => {
    const industryInput = {
      first_name: "Pat",
      last_name: "Partner",
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
      program_id: undefined,
      major_id: undefined,
      student_id_number: undefined,
      year_level: undefined,
      section: undefined,
      graduation_year: undefined,
      company_name: "Solo Firm",
      position: undefined,
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-industry-3" });

    const result = await createUserBySecretary(industryInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("user-industry-3");
    }
    expect(prisma.industryPartnerProfile.create).toHaveBeenCalledWith({
      data: {
        user_id: "user-industry-3",
        company_name: "Solo Firm",
        position: null,
        program_id: null,
        verification_status: VerificationStatus.APPROVED,
      },
    });
  });

  it("rejects an Industry Partner account without a company name", async () => {
    const result = await createUserBySecretary({
      ...validSecretaryInput,
      email: "partner@example.org",
      role: SystemRole.INDUSTRY_PARTNER,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/company or organization name is required/i);
    }
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
