import { describe, expect, it } from "vitest";
import { verifyDisposableDatabaseTarget } from "@/lib/db/verify-database-target";

describe("verifyDisposableDatabaseTarget (539)", () => {
  const disposable = "postgresql://postgres:postgres@localhost:5432/cloie_test";
  const disposableAlt = "postgresql://postgres:postgres@postgres:5432/cloie_test";

  it("accepts a disposable localhost target", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: disposable,
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts disposable postgres service host", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: disposableAlt,
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing DATABASE_URL", () => {
    const result = verifyDisposableDatabaseTarget({});
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/DATABASE_URL is required/);
  });

  it("rejects a hosted Supabase pooler DATABASE_URL", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL:
        "postgresql://postgres.abcd1234:secret@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/hosted Supabase/i);
  });

  it("rejects a hosted Supabase direct DATABASE_URL", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: "postgresql://postgres:secret@db.abcd1234.supabase.co:5432/postgres",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/hosted Supabase/i);
  });

  it("rejects a non-disposable hostname", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: "postgresql://postgres:postgres@some-prod-host.example.com:5432/cloie",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/disposable/i);
  });

  it("rejects hosted NEXT_PUBLIC_SUPABASE_URL even with disposable DATABASE_URL", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: disposable,
      NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects hosted DIRECT_URL", () => {
    const result = verifyDisposableDatabaseTarget({
      DATABASE_URL: disposable,
      DIRECT_URL: "postgresql://postgres:secret@db.abcd1234.supabase.co:5432/postgres",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/DIRECT_URL/);
  });
});
