import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
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
    facultyProgramAffiliation: {
      create: vi.fn(),
    },
    programHeadAssignment: {
      create: vi.fn(),
    },
  },
}));

const programId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

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
  });

  it("parses valid Dean input", () => {
    const result = createUserBySecretarySchema.safeParse({
      ...validSecretaryInput,
      email: "dean@acdeducation.com",
      role: SystemRole.DEAN,
    });
    expect(result.success).toBe(true);
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
  });

  it("rejects Program Head input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
    });
    expect(result.success).toBe(false);
  });

  it("rejects Faculty input without a program", () => {
    const result = createUserBySecretarySchema.safeParse({
      first_name: "Bob",
      last_name: "Jones",
      email: "faculty@acdeducation.com",
      role: SystemRole.FACULTY,
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserBySecretary service", () => {
  const validSecretaryInput = {
    first_name: "Jane",
    last_name: "Doe",
    email: "secretary@acd.edu.ph",
    role: SystemRole.SECRETARY,
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
  });

  it("creates an active Program Head account with a managed program", async () => {
    const phInput = {
      first_name: "Alice",
      last_name: "Smith",
      email: "ph@acd.edu.ph",
      role: SystemRole.PROGRAM_HEAD,
      program_id: "program-ph",
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-ph" });

    const result = await createUserBySecretary(phInput);

    expect(result.success).toBe(true);
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
    } as const;

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-faculty" });

    const result = await createUserBySecretary(facultyInput);

    expect(result.success).toBe(true);
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
});
