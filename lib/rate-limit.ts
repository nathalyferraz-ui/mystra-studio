import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
export async function consumeLimit(db: PrismaClient, key: string, max: number, windowMs: number, now = Date.now()) {
  const rows = await db.$queryRaw<{ count: number }[]>`INSERT INTO "RateLimit" (id, key, count, "lastRequest") VALUES (${randomUUID()}, ${key}, 1, ${BigInt(now)}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."lastRequest" <= ${BigInt(now - windowMs)} THEN 1 ELSE "RateLimit".count + 1 END, "lastRequest" = CASE WHEN "RateLimit"."lastRequest" <= ${BigInt(now - windowMs)} THEN ${BigInt(now)} ELSE "RateLimit"."lastRequest" END RETURNING count`;
  return rows[0].count <= max;
}
