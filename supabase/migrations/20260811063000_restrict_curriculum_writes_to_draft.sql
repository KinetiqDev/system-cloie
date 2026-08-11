-- Curriculum immutability at the database boundary.
--
-- The service layer rejects mutations on PUBLISHED/RETIRED CurriculumVersions,
-- but the previous write policies granted `FOR ALL` to authenticated SECRETARY
-- and in-scope PROGRAM_HEAD users. A direct PostgREST/Supabase request could
-- therefore UPDATE or DELETE PUBLISHED/RETIRED rows (or INSERT a non-DRAFT row)
-- and bypass the application guard. Split each write policy by command type and
-- require the target CurriculumVersion — or, for curriculum_courses, its parent
-- version — to be DRAFT. Lifecycle transitions (publish/retire) keep running
-- through the Prisma service role, which bypasses RLS, so the application-layer
-- guards in manage-curriculum-versions.ts remain authoritative for those flows.
--
-- Mirrors the ledger pattern of 20260809070000_scope_program_head_curriculum_rls.sql.

DROP POLICY IF EXISTS "Enable write access for secretary" ON curriculum_versions;
DROP POLICY IF EXISTS "Enable write access for program head" ON curriculum_versions;
DROP POLICY IF EXISTS "Enable write access for secretary" ON curriculum_courses;
DROP POLICY IF EXISTS "Enable write access for program head" ON curriculum_courses;

-- curriculum_versions: INSERT may only create DRAFT rows.

CREATE POLICY "Enable insert for secretary on draft curriculum" ON curriculum_versions
FOR INSERT TO authenticated
WITH CHECK (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable insert for program head on draft curriculum" ON curriculum_versions
FOR INSERT TO authenticated
WITH CHECK (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = curriculum_versions.program_id
  )
);

-- curriculum_versions: UPDATE only touches DRAFT rows and may only leave DRAFT rows.

CREATE POLICY "Enable update for secretary on draft curriculum" ON curriculum_versions
FOR UPDATE TO authenticated
USING (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
)
WITH CHECK (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable update for program head on draft curriculum" ON curriculum_versions
FOR UPDATE TO authenticated
USING (
  status = 'DRAFT'
  AND EXISTS (
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
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = curriculum_versions.program_id
  )
);

-- curriculum_versions: DELETE only on DRAFT rows.

CREATE POLICY "Enable delete for secretary on draft curriculum" ON curriculum_versions
FOR DELETE TO authenticated
USING (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable delete for program head on draft curriculum" ON curriculum_versions
FOR DELETE TO authenticated
USING (
  status = 'DRAFT'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role = 'PROGRAM_HEAD'
      AND pha.is_active = true
      AND pha.program_id = curriculum_versions.program_id
  )
);

-- curriculum_courses: writes require the parent CurriculumVersion to be DRAFT.
-- The parent check uses the pre-update row in USING and the post-update row in
-- WITH CHECK, so a direct request cannot move a course under a PUBLISHED or
-- RETIRED version either.

CREATE POLICY "Enable insert for secretary on draft curriculum course" ON curriculum_courses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable insert for program head on draft curriculum course" ON curriculum_courses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.users u ON ur.user_id = u.id
        JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND ur.role = 'PROGRAM_HEAD'
          AND pha.is_active = true
          AND pha.program_id = cv.program_id
      )
  )
);

CREATE POLICY "Enable update for secretary on draft curriculum course" ON curriculum_courses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable update for program head on draft curriculum course" ON curriculum_courses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.users u ON ur.user_id = u.id
        JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND ur.role = 'PROGRAM_HEAD'
          AND pha.is_active = true
          AND pha.program_id = cv.program_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.users u ON ur.user_id = u.id
        JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND ur.role = 'PROGRAM_HEAD'
          AND pha.is_active = true
          AND pha.program_id = cv.program_id
      )
  )
);

CREATE POLICY "Enable delete for secretary on draft curriculum course" ON curriculum_courses
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'SECRETARY'
  )
);

CREATE POLICY "Enable delete for program head on draft curriculum course" ON curriculum_courses
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculum_versions cv
    WHERE cv.id = curriculum_courses.curriculum_version_id AND cv.status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.users u ON ur.user_id = u.id
        JOIN public.program_head_assignments pha ON pha.program_head_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND ur.role = 'PROGRAM_HEAD'
          AND pha.is_active = true
          AND pha.program_id = cv.program_id
      )
  )
);
