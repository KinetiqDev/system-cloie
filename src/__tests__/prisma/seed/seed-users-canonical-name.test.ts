import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allUsers } from "../../../../prisma/seed/fixtures/users";

describe("canonical user seed fixtures", () => {
  it("exposes one deterministic complete name per fixture user", () => {
    expect(allUsers.length).toBeGreaterThan(0);

    for (const user of allUsers) {
      expect(user).toHaveProperty("name");
      expect(user).not.toHaveProperty("fn");
      expect(user).not.toHaveProperty("ln");
      expect(user).not.toHaveProperty("firstName");
      expect(user).not.toHaveProperty("lastName");
      expect(typeof user.name).toBe("string");
      expect(user.name.trim().length).toBeGreaterThan(0);
    }

    expect(allUsers.find((user) => user.email === "demo-faculty@cloie.test")?.name).toBe(
      "Demo Faculty"
    );
    expect(allUsers.find((user) => user.email === "student-bsed@cloie.test")?.name).toBe(
      "Juan Dela Cruz"
    );
  });

  it("writes User.name in the seed runner without split-name columns", () => {
    const runnerSource = readFileSync(
      resolve(process.cwd(), "prisma/seed/runners/seed-users.ts"),
      "utf8"
    );

    expect(runnerSource).toMatch(/name:\s*u\.name/);
    expect(runnerSource).not.toMatch(/first_name/);
    expect(runnerSource).not.toMatch(/last_name/);
    expect(runnerSource).not.toMatch(/\bu\.fn\b/);
    expect(runnerSource).not.toMatch(/\bu\.ln\b/);
  });
});
