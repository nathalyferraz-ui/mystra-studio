/** Safety gate for commands that may write fixtures. Never include URLs in errors. */
export function assertIsolatedTestDatabase(env: Record<string, string | undefined> = process.env) {
  if (env.TEST_DATABASE_ISOLATED !== "true" || !env.TEST_DATABASE_URL) throw new Error("Confirme TEST_DATABASE_ISOLATED=true somente para um banco independente de testes.");
  function parse(raw: string) { try { const u = new URL(raw); if (!["postgres:", "postgresql:"].includes(u.protocol)) throw new Error(); decodeURIComponent(u.pathname); return u; } catch { throw new Error("Configure URLs PostgreSQL válidas localmente; nenhuma URL foi registrada."); } }
  const target = parse(env.TEST_DATABASE_URL);
  if (target.searchParams.has("options") || target.searchParams.has("schema")) throw new Error("Remova options/schema da URL de testes; os schemas temporários são controlados pela suíte.");
  const host = (u: URL) => ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ? "loopback" : u.hostname;
  const database = (u: URL) => decodeURIComponent(u.pathname);
  const project = (u: URL) => /^db\.([a-z0-9]+)\.supabase\.co$/.exec(u.hostname)?.[1] || (u.hostname.endsWith(".pooler.supabase.com") ? /\.([a-z0-9]+)$/.exec(decodeURIComponent(u.username))?.[1] : undefined);
  const targetProject = project(target);
  if (targetProject && [env.PRIMARY_SUPABASE_PROJECT_REF, env.DEMO_SUPABASE_PROJECT_REF].includes(targetProject)) throw new Error("Teste recusado: o destino é principal ou demonstração, não homologação.");
  for (const raw of [env.DATABASE_URL, env.DIRECT_URL].filter((v): v is string => !!v)) {
    const runtime = parse(raw);
    const sameHost = host(target) === host(runtime) && (target.port || "5432") === (runtime.port || "5432");
    const sameProject = project(target) && project(target) === project(runtime);
    if ((sameHost || sameProject) && database(target) === database(runtime)) throw new Error("Teste recusado: o destino identifica o banco da aplicação, inclusive por conexão alternativa.");
  }
  return env.TEST_DATABASE_URL;
}
