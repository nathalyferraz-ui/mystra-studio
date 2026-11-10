import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { consumeLimit, persistLead, updateLeadRecord } from "../features/crm/persistence";
import { leadSchema } from "../features/crm/schema";
const url = process.env.TEST_DATABASE_URL;
test("CRM PostgreSQL: real persistence, duplicate isolation, limits, notes and concurrent updates", { skip: !url }, async () => {
  assertIsolatedTestDatabase();
  const schema = `mystra_test_${randomUUID().replaceAll("-", "")}`; assert.match(schema, /^mystra_test_[a-f0-9]{32}$/);
  const pool = new Pool({ connectionString: url, max: 1, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); const db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`); await pool.query(`SET search_path TO "${schema}"`);
    for (const migration of ["20261105000000_postgresql_cms", "20261105010000_commercial_crm"]) { const sql = await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"); await pool.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', "")); }
    const user = await db.user.create({ data: { name: "Isolated admin", email: "admin@example.test", roles: { create: { role: { create: { code: "ADMIN", name: "Admin" } } } } } });
    const input = leadSchema.parse({ name: "Isolated contact", email: "contact@example.test", phone: "", company: "", type: "GERAL", subject: "Test subject", message: "A request that only exists in the temporary test schema.", projectType: "", deadline: "", investment: "", serviceId: "", privacy: true, website: "", token: randomUUID() });
    const results = await Promise.all([persistLead(db, input, "test-secret"), persistLead(db, input, "test-secret")]);
    assert.equal(results.filter(r => r.duplicate).length, 1); assert.equal(await db.lead.count(), 1);
    await persistLead(db, { ...input, token: randomUUID(), message: "A different request using the same email must remain separate." }, "test-secret"); assert.equal(await db.lead.count(), 2);
    const lead = await db.lead.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    await updateLeadRecord(db, { id: lead.id, version: 1, status: "EM_CONTATO", priority: "ALTA", assigneeId: user.id, note: "Internal test note" }, user.id);
    assert.equal(await db.leadNote.count({ where: { leadId: lead.id } }), 1); assert.equal(await db.leadActivity.count({ where: { leadId: lead.id } }), 5);
    await assert.rejects(updateLeadRecord(db, { id: lead.id, version: 1, status: "NOVO", priority: "NORMAL", assigneeId: "", note: "" }, user.id));
    const limit = await Promise.all(Array.from({ length: 8 }, () => consumeLimit(db, "crm-test", 5, 10000, 100000))); assert.equal(limit.filter(Boolean).length, 5);
    assert.equal(await consumeLimit(db, "crm-test", 5, 10000, 110001), true);
    const rls = await pool.query("SELECT relname FROM pg_class WHERE relnamespace = $1::regnamespace AND relrowsecurity = true", [schema]); for (const table of ["Lead", "LeadNote", "LeadActivity", "LeadAttachment"]) assert.ok(rls.rows.some(r => r.relname === table));
  } finally { await db.$disconnect(); await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end(); }
});
