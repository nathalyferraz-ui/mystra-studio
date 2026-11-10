import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { jobSchema, applicationSchema } from "../features/careers/schema";
import { saveJobRecord, submitApplicationRecord, updateApplicationRecord, deleteJobRecord } from "../features/careers/repository";
import { jobPublicWhere, jobPublicSelect } from "../features/careers/queries";
const url = process.env.TEST_DATABASE_URL;
test("Careers PostgreSQL: job lifecycle, unique applications, protected history and optimistic updates", { skip: !url, timeout: 120000 }, async () => {
  assertIsolatedTestDatabase();
  const schema = `mystra_test_${randomUUID().replaceAll("-", "")}`; assert.match(schema, /^mystra_test_[a-f0-9]{32}$/); const setup = new Pool({ connectionString: url, max: 1, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); let pool: Pool | undefined, db: PrismaClient | undefined;
  try {
    await setup.query(`CREATE SCHEMA "${schema}"`); await setup.query(`SET search_path TO "${schema}"`);
    for (const migration of ["20261105000000_postgresql_cms", "20261105010000_commercial_crm", "20261105020000_events_workshops", "20261105030000_careers_ats"]) { const sql = await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"); await setup.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', "")); }
    pool = new Pool({ connectionString: url, max: 4, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) }); const client = db;
    const admin = await db.user.create({ data: { name: "Isolated recruiter", email: "operator@example.test", roles: { create: { role: { create: { code: "ADMIN", name: "Admin" } } } } } });
    const input = jobSchema.parse({ title: "Isolated test opportunity", slug: "isolated-test", summary: "Synthetic fixture only in an independent test schema.", area: "Testing", mode: "REMOTO", level: "JUNIOR", contractType: "Synthetic", location: "", description: "A synthetic job that only exists in an isolated integration test.", responsibilities: "Synthetic responsibilities", requirements: "Synthetic requirements", desirable: "", benefits: "", status: "DRAFT", keepClosedPublic: true, publishedAt: "", deadline: "", seoTitle: "", seoDescription: "" });
    const id = await saveJobRecord(db, input, admin.id); assert.equal(await db.job.count({ where: { id, ...jobPublicWhere() } }), 0); await saveJobRecord(db, { ...input, id, version: 1, status: "PUBLISHED" }, admin.id);
    const app = applicationSchema.parse({ jobId: id, name: "Teste Sintético", email: "candidate@example.test", phone: "", cityState: "", linkedin: "", portfolio: "", message: "Mensagem sintética de teste isolado, sem pessoa real.", privacy: true, website: "", token: "" });
    const resume = (n: number) => ({ resumePath: `synthetic/not-uploaded-${n}.pdf`, resumeName: "synthetic.pdf", resumeSize: 100, resumeHash: "0".repeat(64) });
    const responses = await Promise.all([submitApplicationRecord(client, app, resume(1), true, 30), submitApplicationRecord(client, app, resume(2), true, 30)]); assert.equal(responses.filter(r => r.code === "RECEIVED").length, 1); assert.equal(responses.filter(r => r.code === "EXISTS").length, 1);
    const record = await db.jobApplication.findFirstOrThrow({ where: { jobId: id } }); await updateApplicationRecord(db, { id: record.id, version: 1, status: "ENTREVISTA", assigneeId: admin.id, note: "Synthetic internal note" }, admin.id); assert.equal(await db.applicationNote.count({ where: { applicationId: record.id } }), 1); assert.equal(await db.applicationActivity.count({ where: { applicationId: record.id } }), 4);
    await assert.rejects(updateApplicationRecord(db, { id: record.id, version: 1, status: "APROVADA", assigneeId: "", note: "" }, admin.id)); await assert.rejects(deleteJobRecord(db, id, 2, input.title, admin.id));
    await saveJobRecord(db, { ...input, id, version: 2, status: "CLOSED" }, admin.id); assert.equal((await submitApplicationRecord(db, { ...app, email: "second@example.test" }, resume(3), true, 30)).code, "CLOSED"); assert.equal(await db.jobActivity.count({ where: { jobId: id, nextStatus: "CLOSED" } }), 1);
    await saveJobRecord(db, { ...input, id, version: 3, status: "ARCHIVED" }, admin.id); assert.equal(await db.jobApplication.count({ where: { jobId: id } }), 1); assert.equal(await db.job.count({ where: { id, ...jobPublicWhere() } }), 0);
    const copy = await saveJobRecord(db, { ...input, slug: "isolated-copy" }, admin.id); assert.equal(await db.jobApplication.count({ where: { jobId: copy } }), 0); const projection = await db.job.findUniqueOrThrow({ where: { id }, select: jobPublicSelect }); assert.equal("applications" in projection, false);
  } finally { try { if (db) await db.$disconnect(); } finally { try { if (pool) await pool.end(); } finally { try { await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await setup.end(); } } } }
});
