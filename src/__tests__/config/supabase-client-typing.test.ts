import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expectTypeOf, it } from "vitest";

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase-database";

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
});
