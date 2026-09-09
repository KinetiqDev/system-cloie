-- DropIndex
DROP INDEX IF EXISTS "user_roles_user_id_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");