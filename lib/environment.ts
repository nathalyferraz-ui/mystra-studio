export type EnvironmentValues = Record<string, string | undefined>;
export type EnvironmentMode = "development" | "production" | "homologation" | "demo";
export function environmentMode(env: EnvironmentValues = process.env): EnvironmentMode {
  const mode = env.MYSTRA_ENV || "development";
  if (!["development", "production", "homologation", "demo"].includes(mode)) throw new Error("INVALID_ENVIRONMENT");
  return mode as EnvironmentMode;
}
export function isDemoEnvironment(env: EnvironmentValues = process.env) { return environmentMode(env) === "demo"; }
export const demoMarkerKey = "system.demo.environment.v1";
export const demoRuntimeRole = "mystra_demo_app";
const reference = /^[a-z0-9]{20}$/;
// Only the reviewed public CA file may be referenced; never arbitrary keys or URLs.
export function validRootCertificatePath(value: string) {
  return value === "prisma/certificates/supabase-root-2021.crt" || /^(?:[a-zA-Z]:\/|\/)(?:[^/\\\0]+\/)*prisma\/certificates\/supabase-root-2021\.crt$/.test(value) && !value.split("/").some(part => part === "." || part === "..");
}

/** Parses only canonical Supabase endpoints; query parameters cannot override identity. */
export function supabaseIdentity(raw: string, identityOnly = false) {
  try {
    const url = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash || /[\s\\]/.test(raw) || decodeURIComponent(url.pathname) !== "/postgres") throw new Error();
    const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
    const pooled = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
    const username = decodeURIComponent(url.username);
    const login = /^([a-z_][a-z0-9_]*)(?:\.([a-z0-9]{20}))?$/.exec(username);
    if (!login || !url.password || (!direct && !pooled) || direct && login[2] || pooled && !login[2]) throw new Error();
    for (const [key, value] of url.searchParams) {
      if (key === "sslrootcert" && validRootCertificatePath(value)) continue;
      if (identityOnly && (key === "pgbouncer" && value === "true" || key === "connection_limit" && /^\d{1,3}$/.test(value))) continue;
      if (key !== "sslmode" || !["require", "verify-full"].includes(value)) throw new Error();
    }
    if (url.searchParams.getAll("sslmode").length > 1 || url.searchParams.getAll("sslrootcert").length > 1 || !identityOnly && !url.searchParams.has("sslmode")) throw new Error();
    const port = url.port || "5432"; if (!["5432", "6543"].includes(port) || direct && port !== "5432") throw new Error();
    return { projectRef: direct?.[1] || login[2]!, role: login[1], port, pooled };
  } catch { throw new Error("INVALID_SUPABASE_TARGET"); }
}
export function primaryProjectReference(env: EnvironmentValues) {
  const configured = env.PRIMARY_SUPABASE_PROJECT_REF;
  if (!configured || !reference.test(configured)) throw new Error("PRIMARY_PROJECT_REQUIRED");
  for (const raw of [env.DATABASE_URL, env.DIRECT_URL].filter((v): v is string => !!v)) {
    if (supabaseIdentity(raw, true).projectRef !== configured) throw new Error("PRIMARY_PROJECT_MISMATCH");
  }
  return configured;
}
export function isolatedDatabase(kind: "demo" | "homologation", purpose: "runtime" | "owner", env: EnvironmentValues = process.env) {
  const prefix = kind === "demo" ? "DEMO" : "HOMOLOG";
  if (kind === "demo" && env.DEMO_ACCESS_MODE && env.DEMO_ACCESS_MODE !== "read-only") throw new Error("DEMO_INTERACTIVE_DISABLED");
  const projectRef = env[`${prefix}_SUPABASE_PROJECT_REF`];
  const primary = primaryProjectReference(env);
  if (env[`${prefix}_ISOLATED_CONFIRMED`] !== "true" || !projectRef || !reference.test(projectRef) || projectRef === primary) throw new Error("ISOLATED_PROJECT_REQUIRED");
  const other = env[kind === "demo" ? "HOMOLOG_SUPABASE_PROJECT_REF" : "DEMO_SUPABASE_PROJECT_REF"];
  if (other && other === projectRef) throw new Error("ENVIRONMENTS_MUST_DIFFER");
  const connectionString = env[`${prefix}_${purpose === "runtime" ? "DATABASE_URL" : "DIRECT_URL"}`];
  if (!connectionString) throw new Error("ISOLATED_CONNECTION_REQUIRED");
  const target = supabaseIdentity(connectionString);
  if (target.projectRef !== projectRef || purpose === "owner" && target.port !== "5432") throw new Error("ISOLATED_TARGET_MISMATCH");
  if (kind === "demo" && purpose === "runtime" && target.role !== demoRuntimeRole) throw new Error("DEMO_RESTRICTED_ROLE_REQUIRED");
  if (purpose === "owner" && target.role === demoRuntimeRole) throw new Error("OWNER_CONNECTION_REQUIRED");
  return { connectionString, projectRef, role: target.role };
}
export function runtimeDatabaseURL(env: EnvironmentValues = process.env) {
  const mode = environmentMode(env);
  if (mode === "demo" || mode === "homologation") return isolatedDatabase(mode, "runtime", env).connectionString;
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
  return env.DATABASE_URL;
}
export function migrationDatabaseURL(env: EnvironmentValues = process.env) {
  const mode = environmentMode(env);
  return mode === "demo" || mode === "homologation" ? isolatedDatabase(mode, "owner", env).connectionString : env.DIRECT_URL || "";
}
export function assertDistinctAuthentication(first: { secret?: string; origin?: string }, second: { secret?: string; origin?: string }) {
  if (first.secret && first.secret === second.secret) throw new Error("AUTH_SECRET_MUST_DIFFER");
  if (first.origin && second.origin && new URL(first.origin).origin === new URL(second.origin).origin) throw new Error("AUTH_ORIGIN_MUST_DIFFER");
}
export function authenticationValues(env: EnvironmentValues = process.env) {
  const mode = environmentMode(env), prefix = mode === "demo" ? "DEMO_" : mode === "homologation" ? "HOMOLOG_" : "";
  const secret = env[`${prefix}BETTER_AUTH_SECRET`], origin = env[`${prefix}BETTER_AUTH_URL`];
  if (prefix) assertDistinctAuthentication({ secret, origin }, { secret: env.BETTER_AUTH_SECRET, origin: env.BETTER_AUTH_URL });
  return { secret, origin, cookiePrefix: mode === "demo" ? "mystra-demo" : mode === "homologation" ? "mystra-homolog" : undefined };
}
export function assertDemoStorage(env: EnvironmentValues = process.env) {
  const { projectRef } = isolatedDatabase("demo", "runtime", env);
  const url = new URL(env.DEMO_SUPABASE_URL || "");
  if (url.origin !== `https://${projectRef}.supabase.co` || url.pathname !== "/" || url.username || url.password || url.search || url.hash || !/^mystra-demo-[a-z0-9-]+$/.test(env.DEMO_STORAGE_BUCKET || "")) throw new Error("DEMO_STORAGE_ISOLATION_REQUIRED");
  return { url: url.origin, bucket: env.DEMO_STORAGE_BUCKET!, key: env.DEMO_STORAGE_SERVICE_ROLE_KEY || "" };
}
