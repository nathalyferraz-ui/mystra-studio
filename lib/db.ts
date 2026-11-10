import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { environmentMode, isolatedDatabase, runtimeDatabaseURL } from "./environment";
import { demoRuntimeGuard } from "./demo-runtime";
import { assertDemoQuery } from "./demo-policy";
const globalDb = globalThis as unknown as { mystraDb?: PrismaClient; mystraDbModels?: string; mystraDbTarget?: string; mystraDemoGuard?: ReturnType<typeof demoRuntimeGuard> };
export function getDb() {
  const connectionString = runtimeDatabaseURL();
  if (!["postgres:", "postgresql:"].includes(new URL(connectionString).protocol)) throw new Error("Configure uma conexão PostgreSQL.");
  const mode = environmentMode();
  const target = createHash("sha256").update(`${mode}:${connectionString}`).digest("hex");
  const models = Object.keys(Prisma.ModelName).join(",");
  if (globalDb.mystraDb && globalDb.mystraDbModels === models && globalDb.mystraDbTarget === target) return globalDb.mystraDb;
  if (globalDb.mystraDb) void globalDb.mystraDb.$disconnect().catch(() => undefined);
  if (globalDb.mystraDemoGuard) void globalDb.mystraDemoGuard.close().catch(() => undefined);
  const adapter = new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  const base = new PrismaClient({ adapter });
  let db = base;
  if (mode === "demo") {
    const guard = demoRuntimeGuard(connectionString, isolatedDatabase("demo", "runtime").projectRef);
    globalDb.mystraDemoGuard = guard;
    // Query extensions preserve the client API used by repositories and transactions.
    db = base.$extends({ name: "demo-runtime-policy", query: { $allOperations: async ({ model, operation, args, query }) => { await guard.assert(); assertDemoQuery(model, operation, args); return query(args); } } }) as unknown as PrismaClient;
  } else globalDb.mystraDemoGuard = undefined;
  globalDb.mystraDb = db;
  globalDb.mystraDbModels = models;
  globalDb.mystraDbTarget = target;
  return db;
}
