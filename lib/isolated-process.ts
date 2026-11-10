import { supabaseIdentity, isolatedDatabase, authenticationValues, type EnvironmentValues } from "./environment";

/** Compose a child process without main credentials; never print the resulting object. */
export function isolatedProcessEnvironment(kind: "demo" | "homologation", main: EnvironmentValues, isolated: EnvironmentValues, inherited: EnvironmentValues = process.env, purpose: "runtime" | "owner" = "runtime") {
  const primaryRefs = [main.DATABASE_URL, main.DIRECT_URL].filter((v): v is string => !!v).map(raw => supabaseIdentity(raw, true).projectRef);
  if (!primaryRefs.length || new Set(primaryRefs).size !== 1) throw new Error("VERIFY_PRIMARY_PROJECT_LOCALLY");
  const primaryRef = primaryRefs[0];
  if (isolated.PRIMARY_SUPABASE_PROJECT_REF && isolated.PRIMARY_SUPABASE_PROJECT_REF !== primaryRef) throw new Error("PRIMARY_PROJECT_MISMATCH");
  const prefix = kind === "demo" ? "DEMO_" : "HOMOLOG_";
  if (Object.keys(isolated).some(key => !key.startsWith(prefix) && !["MYSTRA_ENV", "PRIMARY_SUPABASE_PROJECT_REF", "DEMO_SUPABASE_PROJECT_REF", "HOMOLOG_SUPABASE_PROJECT_REF", "SITE_URL", "SITE_INDEXING_ENABLED", "CAREERS_MODE", "TEST_DATABASE_URL", "TEST_DATABASE_ISOLATED"].includes(key))) throw new Error("UNEXPECTED_ISOLATED_VARIABLE");
  const authSecret = isolated[`${prefix}BETTER_AUTH_SECRET`];
  if (authSecret && authSecret === main.BETTER_AUTH_SECRET) throw new Error("AUTH_SECRET_MUST_DIFFER");
  const authOrigin = isolated[`${prefix}BETTER_AUTH_URL`];
  if (authOrigin && main.BETTER_AUTH_URL && new URL(authOrigin).origin === new URL(main.BETTER_AUTH_URL).origin) throw new Error("AUTH_ORIGIN_MUST_DIFFER");
  const result: EnvironmentValues = { ...inherited };
  const sensitive = /^(DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL|BETTER_AUTH_|SUPABASE_|CRM_|CONTACT_|BOOTSTRAP_|CAREERS_|TEST_DATABASE_|DEMO_|HOMOLOG_|NEXT_PUBLIC_.*(?:DATABASE|SUPABASE|AUTH|SECRET|KEY))/;
  for (const key of new Set([...Object.keys(main), ...Object.keys(result)])) if (Object.hasOwn(main, key) || sensitive.test(key)) result[key] = "";
  Object.assign(result, isolated, { MYSTRA_ENV: kind, PRIMARY_SUPABASE_PROJECT_REF: primaryRef, SITE_INDEXING_ENABLED: "false", CAREERS_MODE: "demo", BOOTSTRAP_ADMIN: "" });
  isolatedDatabase(kind, purpose, result);
  if (kind === "demo") { result.TEST_DATABASE_URL = ""; result.TEST_DATABASE_ISOLATED = "false"; }
  else if (result.TEST_DATABASE_URL && supabaseIdentity(result.TEST_DATABASE_URL).projectRef !== result.HOMOLOG_SUPABASE_PROJECT_REF) throw new Error("TEST_PROJECT_MISMATCH");
  authenticationValues(result);
  // Runtime processes do not need owner credentials or destructive-operation confirmations.
  if (purpose === "runtime") for (const key of [`${prefix}DIRECT_URL`, `${prefix}OPERATION_CONFIRM`, `${prefix}RESTORE_CONFIRM`, `${prefix}MIGRATIONS_CONFIRM`]) result[key] = "";
  return result;
}
