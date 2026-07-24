import { describe, expect, it } from "vitest";

describe("package install scripts", () => {
  it("loads the complete schema directory for Prisma commands", async () => {
    const { default: pkg } = await import("../../../package.json", {
      with: { type: "json" },
    });

    expect(pkg.scripts.postinstall).toBe("prisma generate --schema prisma");
    expect(pkg.scripts["db:push"]).toBe("prisma db push --schema prisma");
    expect(pkg.scripts["db:seed"]).toBe("prisma generate --schema prisma && prisma db seed");
    expect(pkg.scripts["db:studio"]).toBe("prisma studio --schema prisma");
  });
});
