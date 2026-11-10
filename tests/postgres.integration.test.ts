import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { emptyDocument } from "../features/cms/rich-text";
const url = process.env.TEST_DATABASE_URL;
test("PostgreSQL: migration, publication, slug uniqueness, optimistic locking and media references", { skip: !url }, async () => {
  assertIsolatedTestDatabase();
  const schema = `mystra_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^mystra_test_[a-f0-9]{32}$/);
  const pool = new Pool({ connectionString: url, max: 1, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(`SET search_path TO "${schema}"`);
    const migration = await readFile("prisma/migrations/20261105000000_postgresql_cms/migration.sql", "utf8");
    await pool.query(migration.replace('CREATE SCHEMA IF NOT EXISTS "public";', ""));
    const user = await db.user.create({ data: { name: "Teste isolado", email: "integration@example.test" } });
    const media = await db.media.create({ data: { name: "Imagem de teste", alt: "Teste isolado", storagePath: "tests/not-uploaded.webp", mimeType: "image/webp", size: 1, width: 1, height: 1, uploadedById: user.id } });
    for (const kind of ["SERVICE", "PROJECT", "ARTICLE"] as const) {
      const item = await db.content.create({ data: { kind, title: "Conteúdo de teste isolado", slug: "teste", summary: "Teste de persistência sem conteúdo comercial.", body: emptyDocument, authorId: user.id, coverId: media.id } });
      assert.equal(await db.content.count({ where: { id: item.id, status: "PUBLISHED" } }), 0);
      await assert.rejects(() => db.content.create({ data: { kind, title: "Duplicado", slug: "teste", summary: "Teste", body: emptyDocument, authorId: user.id } }));
      await db.content.update({ where: { id: item.id, version: 1 }, data: { status: "PUBLISHED", publishedAt: new Date(), version: { increment: 1 } } });
      assert.equal(await db.content.count({ where: { id: item.id, status: "PUBLISHED", publishedAt: { lte: new Date() } } }), 1);
      await assert.rejects(() => db.content.update({ where: { id: item.id, version: 1 }, data: { title: "Stale edit" } }));
      await assert.rejects(() => db.media.delete({ where: { id: media.id } }));
      await db.content.update({ where: { id: item.id }, data: { status: "DRAFT", publishedAt: null } });
      assert.equal(await db.content.count({ where: { id: item.id, status: "PUBLISHED" } }), 0);
      await db.content.delete({ where: { id: item.id } });
    }
    await db.media.delete({ where: { id: media.id } });
  } finally {
    await db.$disconnect();
    // Only this generated, validated test schema can be removed.
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  }
});
