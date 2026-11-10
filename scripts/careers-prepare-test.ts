import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { Pool } from "pg";
async function main() {
  if (process.env.CAREERS_PREPARE_TEST !== "true" || !process.env.TEST_DATABASE_URL) throw new Error();
  assertIsolatedTestDatabase();
  const db = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const result = await db.query("SELECT to_regclass('public.\"JobApplication\"') IS NOT NULL AS ready"); if (!result.rows[0].ready) throw new Error();
    await db.query('INSERT INTO "InstitutionalSetting" (key,value,"updatedAt") VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=NOW()', ["careers.controlled-test", JSON.stringify({ enabled: true })]);
    console.log("Marcador de teste controlado gravado somente no banco TEST_DATABASE_URL separado. Nenhuma migration, usuário, vaga ou candidatura foi criada.");
  } finally { await db.end(); }
}
main().catch(() => { console.error("Preparação recusada. Configure um banco de testes independente com migrations revisadas e CAREERS_PREPARE_TEST=true. Nenhum segredo foi exibido."); process.exitCode = 1; });
