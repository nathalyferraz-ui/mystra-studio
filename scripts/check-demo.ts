import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parse } from "dotenv";
import { Pool } from "pg";
import { inspectDemoConnections } from "../lib/demo-connection-check";
import { assertDistinctAuthentication } from "../lib/environment";

const messages: Record<string, string> = {
  MISSING_DEMO_SUPABASE_PROJECT_REF: "Preencha DEMO_SUPABASE_PROJECT_REF no .env.demo com o identificador do projeto demo.",
  MISSING_DEMO_DATABASE_URL: "Preencha DEMO_DATABASE_URL no .env.demo com a conexão de execução do novo projeto.",
  MISSING_DEMO_DIRECT_URL: "Preencha DEMO_DIRECT_URL no .env.demo com a conexão de migrations do novo projeto.",
  PRIMARY_PROJECT_REQUIRED: "Confira PRIMARY_SUPABASE_PROJECT_REF no .env.demo; não altere o .env principal.",
  PRIMARY_PROJECT_MISMATCH: "A referência do principal não corresponde ao .env atual. Destino não validado.",
  USE_DEMO_PREFIXES: "No .env.demo, use DEMO_DATABASE_URL e DEMO_DIRECT_URL; não use os nomes sem prefixo.",
  INVALID_SUPABASE_TARGET: "Confira as strings Supabase: projeto, usuário, senha codificada, banco postgres e sslmode=verify-full. Não use parâmetros que alterem host/usuário/banco.",
  DEMO_PROJECT_MUST_DIFFER: "O projeto demo deve ser válido e diferente do principal e da homologação.",
  DEMO_CONNECTIONS_MISMATCH: "As duas conexões não correspondem à mesma referência demo declarada. Nenhuma conexão foi aberta.",
  DEMO_OWNER_CONNECTION_INVALID: "DEMO_DIRECT_URL deve usar o proprietário via direct/session na porta 5432, separado do papel restrito de runtime.",
  AUTH_SECRET_MUST_DIFFER: "Use segredos de autenticação diferentes entre os ambientes.",
  AUTH_ORIGIN_MUST_DIFFER: "Use origens de autenticação diferentes entre os ambientes.",
  ENOENT: "Arquivo local ausente. Confira .env e .env.demo sem copiar credenciais entre eles.",
};
async function probe(connectionString: string, migrations: boolean) {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  const client = await pool.connect().catch(async error => { await pool.end(); throw error; });
  try {
    await client.query("BEGIN READ ONLY");
    const identity = await client.query<{ database: string; readonly: string }>("SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly");
    if (identity.rows[0]?.database !== "postgres" || identity.rows[0]?.readonly !== "on") throw new Error("READ_ONLY_CHECK_FAILED");
    let applied: string[] | undefined;
    if (migrations) {
      const exists = await client.query<{ present: boolean }>(`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present`);
      applied = exists.rows[0]?.present ? (await client.query<{ migration_name: string }>(`SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`)).rows.map(row => row.migration_name) : [];
    }
    return applied;
  } finally { await client.query("ROLLBACK").catch(() => undefined); client.release(); await pool.end(); }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--connect") || args.length > 1) throw new Error("INVALID_ARGUMENT");
  const primary = parse(readFileSync(".env", "utf8")), demo = parse(readFileSync(".env.demo", "utf8"));
  const other = existsSync(".env.homologacao") ? parse(readFileSync(".env.homologacao", "utf8")) : {};
  if (other.HOMOLOG_SUPABASE_PROJECT_REF) {
    if (demo.HOMOLOG_SUPABASE_PROJECT_REF && demo.HOMOLOG_SUPABASE_PROJECT_REF !== other.HOMOLOG_SUPABASE_PROJECT_REF) throw new Error("DEMO_PROJECT_MUST_DIFFER");
    demo.HOMOLOG_SUPABASE_PROJECT_REF = other.HOMOLOG_SUPABASE_PROJECT_REF;
  }
  const result = inspectDemoConnections(primary, demo);
  assertDistinctAuthentication({ secret: demo.DEMO_BETTER_AUTH_SECRET, origin: demo.DEMO_BETTER_AUTH_URL }, { secret: primary.BETTER_AUTH_SECRET, origin: primary.BETTER_AUTH_URL });
  assertDistinctAuthentication({ secret: demo.DEMO_BETTER_AUTH_SECRET, origin: demo.DEMO_BETTER_AUTH_URL }, { secret: other.HOMOLOG_BETTER_AUTH_SECRET, origin: other.HOMOLOG_BETTER_AUTH_URL });
  console.log(`Destino demo: ${result.projectRef.slice(0, 4)}…${result.projectRef.slice(-4)}. Ambas as URLs identificam o mesmo projeto, diferente do principal.`);
  console.log(result.restrictedRuntimeRole ? "Usuário de runtime corresponde ao papel restrito; os privilégios ainda exigem validação no banco." : "Runtime ainda usa outro usuário: serve apenas para esta conferência. A aplicação continuará bloqueada até configurar mystra_demo_app.");
  if (!args.includes("--connect")) { console.log("Validação local concluída. Nenhuma conexão aberta ou autorização de escrita alterada."); return; }
  const applied = await probe(demo.DEMO_DIRECT_URL!, true);
  await probe(demo.DEMO_DATABASE_URL!, false);
  const local = readdirSync("prisma/migrations", { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort();
  // Only versioned names are printed; arbitrary database strings never reach the report.
  const pending = local.filter(name => !applied?.includes(name));
  console.log("As duas conexões responderam em transações READ ONLY. Nenhuma migration, seed ou alteração de dados foi executada.");
  console.log(`Migrations locais pendentes: ${pending.length}.`);
  for (const name of pending) console.log(`- ${name}`);
  if (applied?.some(name => !local.includes(name))) console.log("Histórico contém migrations fora deste repositório: revisar antes de qualquer aplicação.");
}
main().catch(error => {
  const code = error instanceof Error ? error.message : "", filesystemCode = (error as { code?: string } | null)?.code;
  const tlsError = ["SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT"].includes(filesystemCode || "");
  console.error(tlsError ? "A CA do servidor não foi reconhecida. Baixe o certificado oficial no painel Supabase para prisma/certificates/supabase-root-2021.crt e execute npm run demo:tls. Mantenha verify-full; não desative a validação TLS." : messages[code] || (filesystemCode === "ENOENT" ? "Arquivo local ou certificado CA ausente. Confira .env.demo e o caminho sslrootcert, sem exibir seus conteúdos." : "Verificação não concluída. Confira senha codificada, TLS, conectividade IPv4/IPv6 e estado do novo projeto. Nenhuma credencial ou mensagem interna foi exibida."));
  process.exitCode = 1;
});
