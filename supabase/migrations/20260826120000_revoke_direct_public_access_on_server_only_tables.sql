-- Give every application table without row-level security policies an explicit
-- access boundary.
--
-- Server-only tables: RLS enabled (deny-all for non-bypass roles) and
-- anon/authenticated privileges revoked. The application accesses them
-- exclusively through Prisma (service_role / postgres), which bypasses RLS and
-- privilege checks. Without this migration, the hosted Supabase default grants
-- leave every one of these tables directly readable/writable by
-- anon/authenticated through the Data API.
--
-- Authenticated-read tables: users, user_roles and program_head_assignments
-- are read by RLS policy subqueries on school_years, academic_term_instances,
-- curriculum_versions and curriculum_courses (e.g. the secretary role check
-- joins users + user_roles; the program-head scope check joins
-- program_head_assignments). They therefore need a SELECT policy for
-- authenticated, while INSERT/UPDATE/DELETE stay denied — no policy exists for
-- those commands, so RLS blocks them.
--
-- Excluded (already protected):
--   - role-aware RLS policies: school_years, academic_term_instances,
--     curriculum_versions, curriculum_courses
--   - RLS + REVOKE in an earlier migration: academic_period_readiness_snapshots,
--     course_assignment_memberships, course_bound_evaluation_exclusions,
--     institutional_outcomes, cilo_institutional_outcome_mappings
--
-- See src/lib/db/table-access-dispositions.ts for the canonical disposition
-- registry that verifies this boundary.

BEGIN;

-- == Server-only tables ==

-- academic-structure.prisma
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "programs" FROM anon, authenticated;

ALTER TABLE "majors" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "majors" FROM anon, authenticated;

-- course-assignments.prisma
ALTER TABLE "student_enrollments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "student_enrollments" FROM anon, authenticated;

ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "courses" FROM anon, authenticated;

ALTER TABLE "course_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_assignments" FROM anon, authenticated;

-- outcomes.prisma
ALTER TABLE "gos" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "gos" FROM anon, authenticated;

ALTER TABLE "cilos" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "cilos" FROM anon, authenticated;

ALTER TABLE "cilo_mappings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "cilo_mappings" FROM anon, authenticated;

-- evaluations-deployments.prisma
ALTER TABLE "course_bound_evaluations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_bound_evaluations" FROM anon, authenticated;

ALTER TABLE "course_bound_cilo_question_bindings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_bound_cilo_question_bindings" FROM anon, authenticated;

ALTER TABLE "course_bound_evaluation_targets" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "course_bound_evaluation_targets" FROM anon, authenticated;

ALTER TABLE "central_deployments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "central_deployments" FROM anon, authenticated;

ALTER TABLE "central_deployment_plo_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "central_deployment_plo_snapshots" FROM anon, authenticated;

ALTER TABLE "evaluation_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "evaluation_assignments" FROM anon, authenticated;

-- instruments.prisma
ALTER TABLE "instrument_templates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "instrument_templates" FROM anon, authenticated;

ALTER TABLE "instrument_versions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "instrument_versions" FROM anon, authenticated;

ALTER TABLE "instrument_template_cilo_question_bindings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "instrument_template_cilo_question_bindings" FROM anon, authenticated;

ALTER TABLE "instrument_template_plo_question_bindings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "instrument_template_plo_question_bindings" FROM anon, authenticated;

-- responses.prisma
ALTER TABLE "responses" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "responses" FROM anon, authenticated;

ALTER TABLE "quantitative_response_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "quantitative_response_items" FROM anon, authenticated;

ALTER TABLE "qualitative_response_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "qualitative_response_items" FROM anon, authenticated;

-- identity-access.prisma (not policy-subquery dependencies)
ALTER TABLE "student_academic_profiles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "student_academic_profiles" FROM anon, authenticated;

ALTER TABLE "industry_partner_profiles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "industry_partner_profiles" FROM anon, authenticated;

ALTER TABLE "industry_partner_program_affiliations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "industry_partner_program_affiliations" FROM anon, authenticated;

ALTER TABLE "alumni_profiles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "alumni_profiles" FROM anon, authenticated;

ALTER TABLE "external_stakeholder_invites" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "external_stakeholder_invites" FROM anon, authenticated;

ALTER TABLE "faculty_program_affiliations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "faculty_program_affiliations" FROM anon, authenticated;

-- == Authenticated read-only tables ==
-- Required readable by RLS policy subqueries of the role-aware tables; writes
-- are denied by RLS (no INSERT/UPDATE/DELETE policies exist).

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON "users"
    FOR SELECT TO authenticated USING (true);

ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON "user_roles"
    FOR SELECT TO authenticated USING (true);

ALTER TABLE "program_head_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON "program_head_assignments"
    FOR SELECT TO authenticated USING (true);

COMMIT;
