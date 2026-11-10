import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "dotenv";
import { verifyPassword } from "better-auth/crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { prepareAuthEnvironment } from "../lib/auth-environment";
import { bootstrapAdminSchema, initializeFirstAdmin } from "../features/auth/bootstrap";

test("local auth preparation fills only missing values and preserves database credentials and existing origin", () => {
  const source = '# local\r\nDATABASE_URL="postgresql://synthetic@localhost/test"\r\nDIRECT_URL="postgresql://synthetic@localhost/direct"\r\nBETTER_AUTH_SECRET=""\r\nBETTER_AUTH_URL="http://localhost:3100"\r\n';
  let generated = 0;
  const prepared = prepareAuthEnvironment(source, () => { generated++; return "Synthetic-secret-used-only-by-the-unit-test-2026"; });
  const before = parse(source), after = parse(prepared.contents);
  assert.equal(generated, 1); assert.equal(prepared.secretCreated, true); assert.equal(prepared.originAdded, false);
  assert.equal(after.DATABASE_URL, before.DATABASE_URL); assert.equal(after.DIRECT_URL, before.DIRECT_URL); assert.equal(after.BETTER_AUTH_URL, before.BETTER_AUTH_URL);
  assert.equal(prepared.contents.split("\r\n").length, source.split("\r\n").length);
  const unchanged = prepareAuthEnvironment(prepared.contents, () => { throw new Error("MUST_NOT_ROTATE"); });
  assert.equal(unchanged.contents, prepared.contents); assert.equal(unchanged.secretCreated, false);
});

test("auth preparation uses CSPRNG defaults but refuses invalid existing configuration and duplicate variables", () => {
  const source = 'DATABASE_URL="postgresql://localhost/test"\n';
  const first = prepareAuthEnvironment(source), second = prepareAuthEnvironment(source);
  assert.notEqual(parse(first.contents).BETTER_AUTH_SECRET, parse(second.contents).BETTER_AUTH_SECRET);
  assert.match(parse(first.contents).BETTER_AUTH_SECRET, /^[A-Za-z0-9_-]{64}$/);
  assert.equal(parse(first.contents).BETTER_AUTH_URL, "http://localhost:3000");
  assert.throws(() => prepareAuthEnvironment(`${source}BETTER_AUTH_SECRET="weak"\n`), /REVIEW_AUTH_CONFIGURATION/);
  assert.throws(() => prepareAuthEnvironment(`${source}BETTER_AUTH_URL="javascript:invalid"\n`), /REVIEW_AUTH_CONFIGURATION/);
  assert.throws(() => prepareAuthEnvironment(`${source}BETTER_AUTH_SECRET=""\nBETTER_AUTH_SECRET=""\n`), /DUPLICATE_AUTH_VARIABLE/);
  assert.throws(() => prepareAuthEnvironment(""), /REVIEW_AUTH_CONFIGURATION/);
});

const input = { name: "  Teste Local  ", email: "  ADMIN@example.test  ", password: "Synthetic-bootstrap-unit-test-2026", confirmation: "Synthetic-bootstrap-unit-test-2026" };
function fixture({ existing = false, concurrent = false, completed = false } = {}) {
  let userData: { id: string; email: string; accounts: { create: { accountId: string; providerId: string; password: string } }; roles: { create: { roleId: string } } } | undefined;
  let logs = 0, transactions = 0; const grants: { roleId: string; permissionId: string }[] = [];
  const tx = {
    institutionalSetting: { create: async () => { if (completed) throw new Error("ALREADY_BOOTSTRAPPED"); } },
    user: { count: async () => concurrent ? 1 : 0, create: async ({ data }: { data: NonNullable<typeof userData> }) => { userData = data; return { id: data.id }; } },
    permission: { upsert: async () => ({}), findUniqueOrThrow: async ({ where }: { where: { code: string } }) => ({ id: where.code }) },
    role: { upsert: async ({ where }: { where: { code: string } }) => ({ id: where.code }), findUniqueOrThrow: async () => ({ id: "ADMIN" }) },
    rolePermission: { upsert: async ({ create }: { create: { roleId: string; permissionId: string } }) => { grants.push(create); } },
    adminLog: { create: async () => { logs++; } },
  };
  const db = { user: { count: async () => existing ? 1 : 0 }, $transaction: async (fn: (value: unknown) => Promise<void>) => { transactions++; await fn(tx); } } as unknown as PrismaClient;
  return { db, result: () => ({ userData, logs, transactions, grants }) };
}

test("first-admin bootstrap assigns ADMIN and credential account using a real Better Auth hash without broadening editor/commercial grants", async () => {
  const f = fixture(); await initializeFirstAdmin(f.db, input);
  const { userData: saved, logs, grants } = f.result(); assert.ok(saved);
  assert.equal(saved.email, "admin@example.test"); assert.equal(saved.roles.create.roleId, "ADMIN");
  assert.equal(saved.accounts.create.accountId, saved.id); assert.equal(saved.accounts.create.providerId, "credential");
  assert.notEqual(saved.accounts.create.password, input.password);
  assert.equal(await verifyPassword({ hash: saved.accounts.create.password, password: input.password }), true);
  assert.equal(await verifyPassword({ hash: saved.accounts.create.password, password: "Synthetic-wrong-password" }), false);
  assert.deepEqual(grants.filter(g => g.roleId === "EDITOR").map(g => g.permissionId), ["content:manage"]);
  assert.deepEqual(grants.filter(g => g.roleId === "COMERCIAL").map(g => g.permissionId), ["requests:manage"]);
  assert.equal(logs, 1);
});

test("bootstrap refuses existing users, completed initialization, concurrent users and invalid data without creating an account", async () => {
  const existing = fixture({ existing: true }); await assert.rejects(initializeFirstAdmin(existing.db, input), /USERS_EXIST/); assert.equal(existing.result().transactions, 0);
  for (const options of [{ concurrent: true }, { completed: true }]) {
    const f = fixture(options); await assert.rejects(initializeFirstAdmin(f.db, input)); assert.equal(f.result().userData, undefined); assert.equal(f.result().logs, 0);
  }
  for (const invalid of [{ ...input, confirmation: "different" }, { ...input, name: "x" }, { ...input, email: "invalid" }, { ...input, password: "short", confirmation: "short" }]) {
    const f = fixture(); assert.equal(bootstrapAdminSchema.safeParse(invalid).success, false); await assert.rejects(initializeFirstAdmin(f.db, invalid)); assert.equal(f.result().transactions, 0);
  }
});
