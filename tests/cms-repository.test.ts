import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../generated/prisma/client";
import { persistContent } from "../features/cms/repository";
import { contentSchema } from "../features/cms/schema";
const fixtureDocument = (title: string, paragraphs: string[]) => ({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] }, ...paragraphs.map(text => ({ type: "paragraph", content: [{ type: "text", text }] }))] });
type Row = Record<string, unknown>;
function repositoryDouble() {
  let rows: Row[] = [], logs: Row[] = [];
  const matches = (row: Row, where: Row) => Object.entries(where).every(([key, value]) => row[key] === value);
  const tx = {
    category: { findFirst: async () => null }, user: { findFirst: async () => null },
    $queryRaw: async () => [],
    content: {
      findUniqueOrThrow: async ({ where }: { where: Row }) => { const row = rows.find(i => matches(i, where)); if (!row) throw new Error("NOT_FOUND_OR_STALE"); return row; },
      create: async ({ data }: { data: Row }) => { const row = { id: `synthetic-${rows.length}`, version: 1, ...data }; rows.push(row); return row; },
      update: async ({ where, data }: { where: Row; data: Row }) => { const row = rows.find(i => matches(i, where)); if (!row) throw new Error("CONFLICT"); Object.assign(row, data, { version: Number(row.version) + 1 }); return row; },
    }, adminLog: { create: async ({ data }: { data: Row }) => { logs.push(data); return data; } },
  };
  const db = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => { const snapshot = structuredClone({ rows, logs }); try { return await callback(tx); } catch (error) { rows = snapshot.rows; logs = snapshot.logs; throw error; } } } as unknown as PrismaClient;
  return { db, rows: () => rows, logs: () => logs };
}
for (const section of ["servicos", "portfolio", "blog"] as const) test(`CMS ${section}: real repository orchestration creates, edits, publishes and unpublishes atomically with a repository double`, async () => {
  const fake = repositoryDouble();
  const value = contentSchema.parse({ module: section, title: "Conteúdo de teste local", slug: "conteudo-local", summary: "Registro sintético somente em memória.", description: "Descrição válida, sem persistência no banco principal.", body: fixtureDocument("Conteúdo local", ["Texto estruturado validado para publicação, somente no teste em memória."]), status: "DRAFT" });
  const id = await persistContent(fake.db, value, "authorized-actor"); assert.equal(fake.rows()[0].authorId, "authorized-actor"); assert.equal(fake.rows()[0].publishedAt, null);
  await persistContent(fake.db, { ...value, id, version: 1, title: "Título editado", status: "PUBLISHED" }, "authorized-actor"); assert.equal(fake.rows()[0].title, "Título editado"); assert.ok(fake.rows()[0].publishedAt instanceof Date);
  const publicationDate = fake.rows()[0].publishedAt;
  await persistContent(fake.db, { ...value, id, version: 2, status: "PUBLISHED" }, "authorized-actor"); assert.equal(fake.rows()[0].publishedAt, publicationDate);
  await assert.rejects(() => persistContent(fake.db, { ...value, id, version: 1 }, "authorized-actor"), /STALE/); assert.equal(fake.logs().length, 3);
  await persistContent(fake.db, { ...value, id, version: 3, status: "DRAFT" }, "authorized-actor"); assert.equal(fake.rows()[0].status, "DRAFT"); assert.equal(fake.rows()[0].publishedAt, null); assert.equal(fake.logs().length, 4);
});
test("CMS invalid category and unavailable media never create a record or success log", async () => {
  const fake = repositoryDouble(); const value = contentSchema.parse({ module: "servicos", title: "Conteúdo local", slug: "local", summary: "Teste somente em memória.", description: "Descrição local para teste sem banco real.", body: fixtureDocument("Local", []), status: "DRAFT" });
  await assert.rejects(() => persistContent(fake.db, { ...value, categoryId: "foreign-category" }, "actor"));
  await assert.rejects(() => persistContent(fake.db, { ...value, coverId: "missing-media" }, "actor")); assert.equal(fake.rows().length, 0); assert.equal(fake.logs().length, 0);
});
