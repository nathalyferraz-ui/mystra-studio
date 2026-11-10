import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { loadIsolatedEnvironment } from "./lib/isolated-environment";
import { isolatedDatabase } from "../lib/environment";
import { demoFixturePlan, fixtureCounts } from "../features/demo/fixtures";
import { prepareDemoDatabase, seedDemoDatabase } from "../features/demo/seed";
import { createDemoAccount } from "../features/demo/account";

async function main() {
  const command = process.argv[2];
  if (command === "plan") { console.log(JSON.stringify({ operation: "offline-plan", writes: false, records: fixtureCounts(demoFixturePlan(new Date().toISOString().slice(0, 10))) }, null, 2)); return; }
  if (!["prepare", "seed", "restore", "account"].includes(command)) throw new Error("COMMAND_NOT_ALLOWED");
  const env = loadIsolatedEnvironment("demo", "owner"), target = isolatedDatabase("demo", "owner", env);
  if (env.DEMO_OPERATION_CONFIRM !== target.projectRef) throw new Error("EXPLICIT_DEMO_AUTHORIZATION_REQUIRED");
  if (command === "restore" && env.DEMO_RESTORE_CONFIRM !== `RESTORE:${target.projectRef}`) throw new Error("EXPLICIT_RESTORE_AUTHORIZATION_REQUIRED");
  if (command === "account" && (!process.stdin.isTTY || !process.stdout.isTTY)) throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connectionString, max: 2, connectionTimeoutMillis: 5000 }) });
  try {
    const rows = await db.$queryRaw<{ role: string }[]>`SELECT current_user AS role`;
    if (rows[0]?.role !== target.role) throw new Error("DATABASE_ROLE_MISMATCH");
    if (command === "prepare") console.log(await prepareDemoDatabase(db, target.projectRef));
    if (command === "seed" || command === "restore") console.log(await seedDemoDatabase(db, target.projectRef, command === "restore"));
    if (command === "account") {
      let muted = false;
      const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
      const prompt = createInterface({ input: process.stdin, output, terminal: true });
      try {
        const email = await prompt.question("E-mail reservado (@example.com ou @example.test): ");
        process.stdout.write("Senha própria (12–128 caracteres, entrada oculta): "); muted = true;
        const password = await prompt.question(""); muted = false;
        process.stdout.write("\nConfirme a senha (entrada oculta): "); muted = true;
        const confirmation = await prompt.question(""); muted = false; process.stdout.write("\n");
        await createDemoAccount(db, target.projectRef, { email, password, confirmation });
        console.log("Conta somente leitura criada. Nenhuma senha foi registrada. Remova a autorização operacional do arquivo local.");
      } finally { muted = false; prompt.close(); }
    }
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Operação demo recusada ou não concluída. Revise arquivo isolado, projeto distinto, confirmação explícita, migrations autorizadas, marcador e ausência de colisões. Conta exige terminal interativo, e-mail reservado e senhas iguais de 12–128 caracteres. Nenhum segredo foi registrado."); process.exitCode = 1; });
