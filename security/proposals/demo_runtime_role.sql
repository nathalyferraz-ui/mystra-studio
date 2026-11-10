-- PROPOSAL ONLY. Never apply to the primary or homologation projects.
-- After explicit authorization, on the EMPTY demo project: apply reviewed migrations,
-- run demo:prepare, SET mystra.demo_project_ref to the verified demo project reference,
-- then execute this transaction as its owner. No password belongs in this file.
BEGIN;
DO $guard$
DECLARE marker jsonb; expected text := current_setting('mystra.demo_project_ref', true);
BEGIN
  SELECT value INTO marker FROM public."InstitutionalSetting" WHERE key='system.demo.environment.v1';
  IF expected IS NULL OR expected !~ '^[a-z0-9]{20}$'
     OR marker IS NULL OR marker->>'projectRef' IS DISTINCT FROM expected
     OR marker->>'environment' IS DISTINCT FROM 'demo'
     OR marker->>'syntheticOnly' IS DISTINCT FROM 'true'
     OR marker->>'version' IS DISTINCT FROM '1'
     OR marker->>'instanceId' IS NULL THEN RAISE EXCEPTION 'DEMO_MARKER_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mystra_demo_app') THEN
    RAISE EXCEPTION 'ROLE_ALREADY_EXISTS_REVIEW_REQUIRED';
  END IF;
  CREATE ROLE mystra_demo_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO mystra_demo_app', current_database());
END $guard$;
GRANT USAGE ON SCHEMA public TO mystra_demo_app;
-- PUBLIC grants can otherwise bypass the intention of role-specific grants.
-- Revoke only on this newly prepared, exclusively synthetic project; never on main.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $read$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['User','Account','Role','Permission','UserRole','RolePermission','InstitutionalSetting','Category','Technology','Tag','Content','ContentMedia','_ContentToTag','_ContentToTechnology','Media','Event','EventCategory','Speaker','EventSpeaker','EventScheduleItem','EventMedia','Lead','Job'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', item);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO mystra_demo_app', item);
    EXECUTE format('CREATE POLICY demo_runtime_read ON public.%I FOR SELECT TO mystra_demo_app USING (true)', item);
  END LOOP;
END $read$;
REVOKE ALL ON TABLE public."EventRegistration" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."EventRegistration" ENABLE ROW LEVEL SECURITY;
GRANT SELECT (id, "eventId", status) ON public."EventRegistration" TO mystra_demo_app;
CREATE POLICY demo_runtime_counts ON public."EventRegistration" FOR SELECT TO mystra_demo_app USING (true);
REVOKE ALL ON TABLE public."Session", public."RateLimit", public."AdminLog" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminLog" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Session", public."RateLimit" TO mystra_demo_app;
CREATE POLICY demo_runtime_sessions ON public."Session" TO mystra_demo_app
  USING (true) WITH CHECK (coalesce("ipAddress", '')='' AND coalesce("userAgent", '')='');
CREATE POLICY demo_runtime_rate_limits ON public."RateLimit" TO mystra_demo_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON public."AdminLog" TO mystra_demo_app;
-- auth.login is also selectable so Prisma INSERT ... RETURNING can complete.
-- The exploration UI never queries or exposes these authentication records.
CREATE POLICY demo_runtime_activity ON public."AdminLog" FOR SELECT TO mystra_demo_app USING (action IN ('demo.seed','demo.restore') OR (action='auth.login' AND resource='session' AND metadata IS NULL));
CREATE POLICY demo_runtime_login_log ON public."AdminLog" FOR INSERT TO mystra_demo_app WITH CHECK (action='auth.login' AND resource='session' AND metadata IS NULL);
-- No grants or policies for private resumes, attachments, participant details,
-- verification tokens, notes, recruitment history or migration metadata.
DO $private$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['JobApplication','ApplicationNote','ApplicationActivity','JobActivity','LeadAttachment','LeadNote','LeadActivity','EventRegistrationActivity','Verification','_prisma_migrations'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, mystra_demo_app', item);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item);
  END LOOP;
END $private$;
COMMIT;
-- Operator: set a unique password privately (e.g. psql \password mystra_demo_app),
-- then enable LOGIN explicitly only after reviewing the grants and policies.
-- Never grant this role membership of postgres or any privileged Supabase role.
