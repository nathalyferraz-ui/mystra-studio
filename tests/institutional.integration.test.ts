import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "better-auth/crypto";
import { defaultPage, defaultSettings } from "../features/institutional/defaults";
import { mutateDocument, readDocument } from "../features/institutional/repository";
import { permissionVersion, updateAccount, updateRolePermissions } from "../features/administration/repository";
const url = process.env.TEST_DATABASE_URL;
test("institutional PostgreSQL: drafts, publication, concurrent writes, media history and administrative recovery safeguards", { skip: !url, timeout: 120000 }, async () => {
  assertIsolatedTestDatabase();
  const schema = `mystra_test_${randomUUID().replaceAll("-", "")}`; assert.match(schema, /^mystra_test_[a-f0-9]{32}$/); const setup = new Pool({ connectionString: url, max: 1, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); let pool: Pool | undefined, db: PrismaClient | undefined;
  try {
    await setup.query(`CREATE SCHEMA "${schema}"`); await setup.query(`SET search_path TO "${schema}"`); const sql = await readFile("prisma/migrations/20261105000000_postgresql_cms/migration.sql", "utf8"); await setup.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ""));
    pool = new Pool({ connectionString: url, max: 4, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    const adminRole = await db.role.create({ data: { code: "ADMIN", name: "Synthetic Admin" } }); const editorRole = await db.role.create({ data: { code: "EDITOR", name: "Synthetic Editor" } });
    const password = await hashPassword(`${randomUUID()}-fixture`);
    const createUser = (email: string, roleId: string) => db!.user.create({ data: { name: "Synthetic isolated operator", email, roles: { create: { roleId } }, accounts: { create: { accountId: randomUUID(), providerId: "credential", password } } } });
    const actor = await createUser("actor@example.test", adminRole.id), other = await createUser("other@example.test", adminRole.id), editor = await createUser("editor@example.test", editorRole.id);
    const original = defaultPage("home"); const first = await mutateDocument(db, "home", 0, "save", actor.id, original); assert.equal(first.published, null);
    const published = await mutateDocument(db, "home", 1, "publish", actor.id); assert.equal(published.version, 2); assert.deepEqual(published.published, original);
    const changed = structuredClone(original); changed.seoTitle = "Synthetic private revision"; await mutateDocument(db, "home", 2, "save", actor.id, changed); assert.deepEqual((await readDocument(db, "home")).published, original);
    const results = await Promise.allSettled([mutateDocument(db, "home", 3, "save", actor.id, changed), mutateDocument(db, "home", 3, "save", actor.id, original)]); assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(results.filter(r => r.status === "rejected").length, 1);
    const media = await db.media.create({ data: { name: "Synthetic image metadata", alt: "No Storage upload", storagePath: `test/${randomUUID()}.webp`, mimeType: "image/webp", size: 100, width: 1, height: 1, uploadedById: actor.id } });
    const withImage = defaultPage("home"); if (withImage.sections[0].type === "template") withImage.sections[0].imageId = media.id;
    await mutateDocument(db, "home", 4, "publish", actor.id, withImage); await mutateDocument(db, "home", 5, "save", actor.id, original); assert.ok((await readDocument(db, "home")).mediaIds.includes(media.id));
    const restored = await mutateDocument(db, "home", 6, "restore", actor.id, undefined, 2); assert.deepEqual(restored.draft, original); assert.deepEqual(restored.published, withImage); assert.equal(restored.version, 7);
    await db.media.update({ where: { id: media.id }, data: { state: "DELETING" } }); await assert.rejects(mutateDocument(db, "home", 7, "publish", actor.id), /MEDIA_UNAVAILABLE/); await db.media.update({ where: { id: media.id }, data: { state: "READY" } });
    const discarded = await mutateDocument(db, "home", 7, "discard", actor.id); assert.deepEqual(discarded.draft, withImage);
    for (const key of ["equipe", "parceiros", "faq"] as const) { const s = await mutateDocument(db, key, 0, "publish", actor.id, { items: [] }); assert.deepEqual(s.published, { items: [] }); }
    await mutateDocument(db, "settings", 0, "publish", actor.id, defaultSettings);
    await db.account.updateMany({ where: { userId: actor.id }, data: { password: null } }); await assert.rejects(updateAccount(db, { id: other.id, version: other.updatedAt.toISOString(), operation: "deactivate" }, actor.id), /LAST_ADMIN/); await db.account.updateMany({ where: { userId: actor.id }, data: { password } });
    await assert.rejects(updateAccount(db, { id: actor.id, version: actor.updatedAt.toISOString(), operation: "deactivate" }, actor.id), /SELF_CHANGE/);
    await assert.rejects(updateAccount(db, { id: other.id, version: other.updatedAt.toISOString(), operation: "roles", roles: ["EDITOR"] }, editor.id), /ACCESS/);
    await updateAccount(db, { id: other.id, version: other.updatedAt.toISOString(), operation: "deactivate" }, actor.id); assert.equal((await db.user.findUniqueOrThrow({ where: { id: other.id } })).active, false);
    await assert.rejects(updateAccount(db, { id: other.id, version: other.updatedAt.toISOString(), operation: "activate" }, actor.id), /CONFLICT/);
    const legacy = await db.permission.create({ data: { code: "legacy:custom", name: "Fixture" } }); await db.rolePermission.create({ data: { roleId: editorRole.id, permissionId: legacy.id } });
    await db.session.create({ data: { token: randomUUID(), expiresAt: new Date(Date.now() + 60000), userId: editor.id } });
    await updateRolePermissions(db, { roleId: editorRole.id, version: permissionVersion([legacy.code]), permissions: ["pages:read"] }, actor.id); assert.equal(await db.session.count({ where: { userId: editor.id } }), 0); assert.equal(await db.rolePermission.count({ where: { roleId: editorRole.id } }), 2);
    await assert.rejects(updateRolePermissions(db, { roleId: adminRole.id, version: permissionVersion([]), permissions: [] }, actor.id), /ADMIN_FIXED/);
    assert.ok(await db.adminLog.count({ where: { action: "institutional.publish" } }) >= 5);
  } finally { try { if (db) await db.$disconnect(); } finally { try { if (pool) await pool.end(); } finally { try { await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await setup.end(); } } } }
});
