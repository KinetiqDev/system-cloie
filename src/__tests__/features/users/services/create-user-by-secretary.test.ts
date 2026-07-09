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
  },
}));

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
});
