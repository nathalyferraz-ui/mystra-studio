import { authConfiguration } from "./auth-config";
import { environmentMode, type EnvironmentValues } from "./environment";
export function productionReadiness(env: EnvironmentValues) {
  const blockers: string[] = [], warnings: string[] = [];
  try { if (!["production", "development"].includes(environmentMode(env))) blockers.push("NORMAL_ENVIRONMENT_REQUIRED"); } catch { blockers.push("INVALID_ENVIRONMENT"); }
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") blockers.push("PRODUCTION_ONLY_BUILD");
  if (!authConfiguration({ ...env, NODE_ENV: "production" }).configured) blockers.push("AUTH_HTTPS_SECRET_OR_DATABASE");
  try {
    const database = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || !database.username || !database.password) throw new Error();
    if (database.searchParams.getAll("sslmode").length !== 1 || database.searchParams.get("sslmode") !== "verify-full" || database.searchParams.getAll("sslrootcert").length > 1 || ["sslaccept", "uselibpqcompat", "ssl", "host", "port", "user", "password", "dbname", "database", "options"].some(key => database.searchParams.has(key))) blockers.push("DATABASE_VERIFIED_TLS_REQUIRED");
  } catch { blockers.push("POSTGRESQL_CONNECTION_REQUIRED"); }
  try {
    const site = new URL(env.SITE_URL || ""), auth = new URL(env.BETTER_AUTH_URL || "");
    if (site.protocol !== "https:" || site.origin !== auth.origin || site.username || site.password || site.pathname !== "/" || site.search || site.hash || ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)) throw new Error();
  } catch { blockers.push("PUBLIC_AND_AUTH_ORIGINS_REQUIRED"); }
  if (env.BOOTSTRAP_ADMIN === "true") blockers.push("DISABLE_BOOTSTRAP_ADMIN");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") blockers.push("RESTORE_TLS_CERTIFICATE_VALIDATION");
  if (env.TEST_DATABASE_URL) blockers.push("REMOVE_TEST_DATABASE_FROM_PRODUCTION");
  if (env.SITE_INDEXING_ENABLED !== "true") warnings.push("INDEXING_DISABLED_INTENTIONALLY");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_STORAGE_BUCKET) warnings.push("UPLOADS_UNAVAILABLE_TEXT_CONTENT_SUPPORTED");
  if (!env.DIRECT_URL) warnings.push("MIGRATIONS_REQUIRE_SEPARATE_LOCAL_DIRECT_URL");
  return { blockers: [...new Set(blockers)], warnings };
}
