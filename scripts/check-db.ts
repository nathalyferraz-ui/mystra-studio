import "dotenv/config";
import { getDb } from "../lib/db";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL antes de verificar a conexão.");
  const db = getDb();
  try { await db.$queryRaw`SELECT 1`; console.log("Conexão PostgreSQL confirmada. Esta verificação não aplica migrations nem insere dados."); }
  finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Conexão não confirmada. Verifique DATABASE_URL, senha, TLS, rede IPv4/IPv6 e estado do projeto Supabase. Nenhum segredo foi registrado."); process.exitCode = 1; });
