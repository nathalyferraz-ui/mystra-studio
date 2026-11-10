import { test } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, type AccessUser } from "../lib/permissions";
import { loginSchema } from "../features/auth/login-schema";
import { hashPassword, verifyPassword } from "better-auth/crypto";
function user(code: string, permissions: string[], active = true): AccessUser {
  return { active, roles: [{ role: { code, permissions: permissions.map(code => ({ permission: { code } })) } }] };
}
test("ADMIN has full access only when active", () => {
  assert.equal(hasPermission(user("ADMIN", []), "users:manage"), true);
  assert.equal(hasPermission(user("ADMIN", [], false), "users:manage"), false);
});
test("EDITOR and COMERCIAL cannot escalate privileges", () => {
  assert.equal(hasPermission(user("EDITOR", ["content:manage"]), "content:manage"), true);
  assert.equal(hasPermission(user("EDITOR", ["content:manage"]), "users:manage"), false);
  assert.equal(hasPermission(user("COMERCIAL", ["requests:manage"]), "content:manage"), false);
  assert.equal(hasPermission(user("COMERCIAL", ["requests:manage"]), "requests:manage"), true);
  assert.equal(hasPermission({ active: true, roles: [] }, "settings:manage"), false);
});
test("login rejects malformed and excessively long credentials", () => {
  for (const body of [null, {}, { email: "invalid", password: "x" }, { email: "a@example.test", password: "" }, { email: "a@example.test", password: "x".repeat(129) }]) assert.equal(loginSchema.safeParse(body).success, false);
  assert.equal(loginSchema.safeParse({ email: "a@example.test", password: "valid-input" }).success, true);
});
test("Better Auth hashes use distinct salts and verify without storing plaintext", async () => {
  const password = "Synthetic-Password-Only-For-Unit-Test-2026";
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.notEqual(first, second); assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword({ hash: first, password }), true);
  assert.equal(await verifyPassword({ hash: first, password: "Synthetic-wrong-password" }), false);
});
