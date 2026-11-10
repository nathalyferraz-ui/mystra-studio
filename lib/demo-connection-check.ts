import { demoRuntimeRole, primaryProjectReference, supabaseIdentity, type EnvironmentValues } from "./environment";

/** Identity-only preflight. It neither authorizes writes nor relaxes runtime role checks. */
export function inspectDemoConnections(main: EnvironmentValues, demo: EnvironmentValues) {
  if (demo.DATABASE_URL || demo.DIRECT_URL) throw new Error("USE_DEMO_PREFIXES");
  for (const key of ["DEMO_SUPABASE_PROJECT_REF", "DEMO_DATABASE_URL", "DEMO_DIRECT_URL"]) if (!demo[key]) throw new Error(`MISSING_${key}`);
  const primary = primaryProjectReference({ ...main, PRIMARY_SUPABASE_PROJECT_REF: demo.PRIMARY_SUPABASE_PROJECT_REF });
  const ref = demo.DEMO_SUPABASE_PROJECT_REF!;
  if (!/^[a-z0-9]{20}$/.test(ref) || ref === primary || ref === demo.HOMOLOG_SUPABASE_PROJECT_REF) throw new Error("DEMO_PROJECT_MUST_DIFFER");
  const runtime = supabaseIdentity(demo.DEMO_DATABASE_URL!), owner = supabaseIdentity(demo.DEMO_DIRECT_URL!);
  if (runtime.projectRef !== ref || owner.projectRef !== ref) throw new Error("DEMO_CONNECTIONS_MISMATCH");
  if (owner.port !== "5432" || owner.role === demoRuntimeRole) throw new Error("DEMO_OWNER_CONNECTION_INVALID");
  return { projectRef: ref, primaryDifferent: true, sameProject: true, restrictedRuntimeRole: runtime.role === demoRuntimeRole };
}
