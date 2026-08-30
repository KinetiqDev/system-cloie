import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase-database";

function parseSourceFile(filePath: string, sourceText: string) {
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function hasDatabaseTypeImport(sourceFile: ts.SourceFile) {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier.getText(sourceFile) !== '"@/types/supabase-database"'
    ) {
      return false;
    }

    const namedBindings = statement.importClause?.namedBindings;

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      return false;
    }

    return namedBindings.elements.some(
      (element) =>
        element.name.text === "Database" &&
        (statement.importClause?.isTypeOnly || element.isTypeOnly)
    );
  });
}

function hasTypedSupabaseFactoryCall(sourceFile: ts.SourceFile, factoryName: string) {
  let found = false;

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === factoryName &&
      node.typeArguments?.length === 1 &&
      node.typeArguments[0]?.getText(sourceFile) === "Database"
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  return found;
}

describe("supabase client typing", () => {
  it("returns Database-typed browser and server clients", () => {
    expectTypeOf<ReturnType<typeof createBrowserClient>>().toMatchTypeOf<
      SupabaseClient<Database>
    >();
    expectTypeOf<Awaited<ReturnType<typeof createServerClient>>>().toMatchTypeOf<
      SupabaseClient<Database>
    >();
  });

  it("includes the aligned MVP admin and deployment tables in the generated Database type", () => {
    type CourseBoundEvaluationTargetRow =
      Database["public"]["Tables"]["course_bound_evaluation_targets"]["Row"];
    type StudentAcademicProfileRow =
      Database["public"]["Tables"]["student_academic_profiles"]["Row"];
    type InstrumentTemplateRow = Database["public"]["Tables"]["instrument_templates"]["Row"];
    type CentralDeploymentRow = Database["public"]["Tables"]["central_deployments"]["Row"];
    type PublicTables = Database["public"]["Tables"];

    expectTypeOf<
      Database["public"]["Tables"]["faculty_program_affiliations"]["Row"]
    >().toMatchTypeOf<{
      faculty_id: string;
      program_id: string;
      is_active: boolean;
    }>();
    expectTypeOf<Database["public"]["Tables"]["program_head_assignments"]["Row"]>().toMatchTypeOf<{
      program_head_id: string;
      program_id: string;
      is_active: boolean;
    }>();
    expectTypeOf<CourseBoundEvaluationTargetRow>().toMatchTypeOf<{
      course_bound_evaluation_id: string;
      program_id: string;
      year_level: Database["public"]["Enums"]["year_level"] | null;
    }>();
    expectTypeOf<StudentAcademicProfileRow>().toMatchTypeOf<{
      program_id: string;
      major_id: string | null;
    }>();
    expectTypeOf<InstrumentTemplateRow>().toMatchTypeOf<{
      program_id: string | null;
      is_faculty_accessible: boolean;
    }>();
    expectTypeOf<CentralDeploymentRow>().toMatchTypeOf<{
      major_id: string | null;
      year_level: Database["public"]["Enums"]["year_level"] | null;
    }>();
    expectTypeOf<Database["public"]["Tables"]["industry_partner_profiles"]["Row"]>().toMatchTypeOf<{
      user_id: string;
      company_name: string;
      program_id: string | null;
    }>();
    expectTypeOf<
      "section_id" extends keyof CourseBoundEvaluationTargetRow ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "section_id" extends keyof StudentAcademicProfileRow ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<"sections" extends keyof PublicTables ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<"course_types" extends keyof PublicTables ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<"plos" extends keyof PublicTables ? true : false>().toEqualTypeOf<false>();
  });

  it("threads the generated Database type through all Supabase client factories", async () => {
    const [clientFile, serverFile, middlewareFile] = await Promise.all([
      readFile(path.join(process.cwd(), "src/lib/supabase/client.ts"), "utf8"),
      readFile(path.join(process.cwd(), "src/lib/supabase/server.ts"), "utf8"),
      readFile(path.join(process.cwd(), "src/lib/supabase/middleware.ts"), "utf8"),
    ]);

    const clientSourceFile = parseSourceFile("client.ts", clientFile);
    const serverSourceFile = parseSourceFile("server.ts", serverFile);
    const middlewareSourceFile = parseSourceFile("middleware.ts", middlewareFile);

    expect(hasDatabaseTypeImport(clientSourceFile)).toBe(true);
    expect(hasTypedSupabaseFactoryCall(clientSourceFile, "createBrowserClient")).toBe(true);
    expect(hasDatabaseTypeImport(serverSourceFile)).toBe(true);
    expect(hasTypedSupabaseFactoryCall(serverSourceFile, "createServerClient")).toBe(true);
    expect(hasDatabaseTypeImport(middlewareSourceFile)).toBe(true);
    expect(hasTypedSupabaseFactoryCall(middlewareSourceFile, "createServerClient")).toBe(true);
  });

  it("documents the correct repo and env workflow", async () => {
    const [projectReadme, supabaseReadme] = await Promise.all([
      readFile(path.join(process.cwd(), "README.md"), "utf8"),
      readFile(path.join(process.cwd(), "supabase/README.md"), "utf8"),
    ]);

    expect(supabaseReadme).toContain("`NEXT_PUBLIC_SUPABASE_URL`");
    expect(supabaseReadme).toContain("`NEXT_PUBLIC_SUPABASE_ANON_KEY`");
    expect(supabaseReadme).toContain("`CLOIE_BACKEND_ID`");
    expect(supabaseReadme).toContain("`GOOGLE_CLIENT_ID`");
    expect(supabaseReadme).toContain("`DIRECT_URL`");

    expect(projectReadme).toContain("`NEXT_PUBLIC_SUPABASE_URL`");
    expect(projectReadme).toContain("`NEXT_PUBLIC_SUPABASE_ANON_KEY`");
    expect(projectReadme).toContain("`CLOIE_BACKEND_ID`");
    expect(projectReadme).toContain("`GOOGLE_CLIENT_ID`");
  });

  it("keeps the generated database file aligned with the sectionless MVP schema", async () => {
    const databaseTypes = await readFile(
      path.join(process.cwd(), "src/types/supabase-database.ts"),
      "utf8"
    );

    expect(databaseTypes).toContain("faculty_program_affiliations:");
    expect(databaseTypes).toContain("program_head_assignments:");
    expect(databaseTypes).toContain("course_bound_evaluation_targets:");
    expect(databaseTypes).toContain("industry_partner_profiles:");
    expect(databaseTypes).toContain("is_faculty_accessible: boolean");
    expect(databaseTypes).toContain("major_id: string | null");
    expect(databaseTypes).toContain('year_level: Database["public"]["Enums"]["year_level"]');
    expect(databaseTypes).not.toContain("section_id:");
    expect(databaseTypes).not.toContain("course_types:");
    expect(databaseTypes).not.toContain("plos:");
    expect(databaseTypes).not.toContain("sections:");
  });
});
