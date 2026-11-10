-- Reviewed manual correction. Requires explicit authorization for each target.
-- Execution status for this workspace is recorded in AUDITORIA-GERAL.md.
-- Scope: Prisma migration metadata, not business tables or their data.
-- Audited: anon/authenticated have SELECT/INSERT/UPDATE/DELETE and RLS is disabled.
-- The configured migration connection owns this table and bypasses RLS.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.rolname = current_user
    WHERE n.nspname = 'public' AND c.relname = '_prisma_migrations'
      AND (c.relowner = r.oid OR r.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Use the reviewed owner/migration connection; no changes applied';
  END IF;
END $$;
REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM anon, authenticated, PUBLIC;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
COMMIT;
-- After approval/application: verify denied API-role privileges, enabled RLS,
-- retained owner access, unchanged migration checksums, and prisma migrate status.
-- This file must never be executed by an automatic deployment or startup hook.
