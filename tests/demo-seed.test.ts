import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../generated/prisma/client";
import { prepareDemoDatabase, seedDemoDatabase } from "../features/demo/seed";
import { demoFixturePlan, fixtureRegistryKey } from "../features/demo/fixtures";
import { createDemoAccount } from "../features/demo/account";
import { verifyPassword } from "better-auth/crypto";
type RecordData = Record<string, unknown>;
/** Transactional repository double; proves guards/idempotency, not PostgreSQL integration. */
function databaseDouble() {
  let state: Record<string, RecordData[]> = {};
  const matches = (item: RecordData, where: RecordData = {}): boolean => Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return (expected as RecordData[]).some(part => matches(item, part));
    if (expected && typeof expected === "object") {
      const clause = expected as { in?: unknown[]; not?: unknown };
      if (clause.in) return clause.in.includes(item[key]);
      if ("not" in clause) return item[key] !== clause.not;
      return matches(item, expected as RecordData);
    }
    return item[key] === expected;
  });
  const db = new Proxy({}, { get(_, model: string) {
    if (model === "$queryRaw") return async () => [];
    if (model === "$transaction") return async (fn: (tx: unknown) => Promise<unknown>) => { const before = structuredClone(state); try { return await fn(db); } catch (error) { state = before; throw error; } };
    return {
      count: async ({ where }: { where?: RecordData } = {}) => (state[model] || []).filter(item => matches(item, where)).length,
      findUnique: async ({ where }: { where: RecordData }) => (state[model] || []).find(item => matches(item, where)) || null,
      findFirst: async ({ where }: { where: RecordData }) => (state[model] || []).find(item => matches(item, where)) || null,
      create: async ({ data }: { data: RecordData }) => { const row = { id: `generated-${model}-${(state[model] || []).length}`, ...structuredClone(data) }; (state[model] ||= []).push(row); return row; },
      upsert: async ({ where, create, update }: { where: RecordData; create: RecordData; update: RecordData }) => {
        const row = (state[model] ||= []).find(item => matches(item, where));
        if (row) { Object.assign(row, structuredClone(update)); return row; }
        const created = { id: `generated-${model}-${state[model].length}`, ...structuredClone(create) }; state[model].push(created); return created;
      },
    };
  } });
  return { db: db as PrismaClient, records: (model: string) => state[model] || [] };
}
const project = "b".repeat(20);
test("preparation refuses a populated database and marker mismatches without changing data", async () => {
  const fake = databaseDouble(); await fake.db.user.create({ data: { id: "existing-user", name: "Existing", email: "existing@example.com" } });
  await assert.rejects(() => prepareDemoDatabase(fake.db, project), /MUST_BE_EMPTY/);
  assert.equal(fake.records("institutionalSetting").length, 0); assert.equal(fake.records("user").length, 1);
  const clean = databaseDouble(); assert.deepEqual(await prepareDemoDatabase(clean.db, project), { prepared: true });
  assert.deepEqual(await prepareDemoDatabase(clean.db, project), { prepared: false });
  await assert.rejects(() => prepareDemoDatabase(clean.db, "c".repeat(20)), /NOT_PREPARED/);
});
test("seed is idempotent, preserves edits and pins its dates; restore touches only registered records", async () => {
  const fake = databaseDouble(); await prepareDemoDatabase(fake.db, project);
  const first = await seedDemoDatabase(fake.db, project, false, new Date("2026-11-07T12:00:00Z")); assert.ok(first.created > 0);
  const modified = fake.records("content")[0]; modified.title = "Controlled synthetic edit";
  await fake.db.content.create({ data: { id: "unmanaged-example", kind: "SERVICE", title: "Preserve", slug: "preserve", summary: "Unmanaged synthetic example", body: {}, authorId: "author" } });
  const second = await seedDemoDatabase(fake.db, project, false, new Date("2027-01-01T12:00:00Z"));
  assert.equal(second.created, 0); assert.equal(second.reference, "2026-11-07"); assert.equal(fake.records("content")[0].title, "Controlled synthetic edit");
  assert.equal(fake.records("adminLog").length, 1);
  const restored = await seedDemoDatabase(fake.db, project, true); assert.equal(restored.created, 0); assert.ok(restored.restored > 0);
  assert.equal(fake.records("content")[0].title, demoFixturePlan("2026-11-07").content[0].title);
  assert.ok(fake.records("content").some(item => item.id === "unmanaged-example")); assert.equal(fake.records("account").length, 0);
  assert.equal(fake.records("adminLog").at(-1)?.action, "demo.restore");
  assert.ok(fake.records("institutionalSetting").some(item => item.key === fixtureRegistryKey));
});
test("seed and restore fail closed without a marker or known registry", async () => {
  const fake = databaseDouble(); await assert.rejects(() => seedDemoDatabase(fake.db, project), /NOT_PREPARED/);
  await prepareDemoDatabase(fake.db, project); await assert.rejects(() => seedDemoDatabase(fake.db, project, true), /SEED_REQUIRED/);
  await fake.db.user.create({ data: { id: "demo-editorial-author-v1", name: "Collision", email: "collision@example.com" } });
  await assert.rejects(() => seedDemoDatabase(fake.db, project), /COLLISION/); assert.equal(fake.records("content").length, 0);
});
test("demo account hashes an operator-defined password, has no ADMIN, and rejects real email domains", async () => {
  const fake = databaseDouble(); await prepareDemoDatabase(fake.db, project);
  const password = "synthetic-test-password-!72";
  await assert.rejects(() => createDemoAccount(fake.db, project, { email: "person@personal.invalid", password, confirmation: password }));
  await createDemoAccount(fake.db, project, { email: "visitor@example.com", password, confirmation: password });
  const user = fake.records("user")[0], account = (user.accounts as { create: { password: string } }).create;
  assert.notEqual(account.password, password); assert.ok(await verifyPassword({ hash: account.password, password }));
  assert.ok(fake.records("role").every(role => role.code !== "ADMIN")); assert.equal(fake.records("permission")[0].code, "demo:explore");
  await assert.rejects(() => createDemoAccount(fake.db, project, { email: "visitor@example.com", password, confirmation: password }), /EXISTS/);
});
