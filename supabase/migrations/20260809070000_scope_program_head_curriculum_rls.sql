-- #324 follow-up: scope PROGRAM_HEAD writes to assigned programs.
--
-- The initial migration granted writes to any SECRETARY or PROGRAM_HEAD
-- authenticated user. OpenSpec requirement "Program Head scope enforced"
-- (openspec/changes/introduce-versioned-curriculum/specs/curriculum-rls-security/spec.md)
-- and ADR 0009 mandate that PROGRAM_HEAD authority is bounded by the active
-- ProgramHeadAssignment set. Split each combined write policy into:
--   - SECRETARY: role-only (secretaries operate cross-program).
--   - PROGRAM_HEAD: role + active assignment whose program_id matches the
--     target row (for curriculum_courses, the parent CurriculumVersion's
--     program_id).
-- Read policy (SELECT for all authenticated) is unchanged.

DROP POLICY IF EXISTS "Enable write access for secretary and program head" ON curriculum_versions;
DROP POLICY IF EXISTS "Enable write access for secretary and program head" ON curriculum_courses;

CREATE POLICY "Enable write access for secretary" ON curriculum_versions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable write access for program head" ON curriculum_versions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = curriculum_versions.program_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = curriculum_versions.program_id
  )
);

CREATE POLICY "Enable write access for secretary" ON curriculum_courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable write access for program head" ON curriculum_courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    JOIN public.curriculum_versions cv ON cv.id = curriculum_courses.curriculum_version_id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = cv.program_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    JOIN public.curriculum_versions cv ON cv.id = curriculum_courses.curriculum_version_id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = cv.program_id
  )
);
