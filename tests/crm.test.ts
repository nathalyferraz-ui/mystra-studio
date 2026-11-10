import { test } from "node:test";
import assert from "node:assert/strict";
import { createFormToken, verifyFormToken } from "../features/crm/security";
import { leadSchema, updateLeadSchema } from "../features/crm/schema";
import { leadFilters } from "../features/crm/queries";
import { hasPermission } from "../lib/permissions";
const input = { name: "Pessoa de teste", email: "isolated@example.test", phone: "", company: "", type: "GERAL", subject: "Contato de validação", message: "Mensagem isolada de teste de validação do formulário.", projectType: "", deadline: "", investment: "", serviceId: "", privacy: true, website: "", token: "" };
test("contact requires privacy acknowledgement and quotes validate project and telephone", () => {
  assert.equal(leadSchema.safeParse(input).success, true);
  for (const patch of [{ privacy: false }, { email: "invalid" }, { type: "ADMIN" }, { website: "https://spam.test" }, { message: "short" }, { serviceId: "../secret" }]) assert.equal(leadSchema.safeParse({ ...input, ...patch }).success, false);
  assert.equal(leadSchema.safeParse({ ...input, type: "ORCAMENTO" }).success, false);
  assert.equal(leadSchema.safeParse({ ...input, type: "ORCAMENTO", phone: "+55 (11) 90000-0000", projectType: "Aplicação web", deadline: "Em definição" }).success, true);
});
test("signed forms reject tampering, premature, future and expired requests", () => {
  const secret = "isolated-secret-for-token-tests-32-characters", now = 1793900000000;
  const token = createFormToken(secret, now);
  assert.equal(verifyFormToken(token, secret, now + 2000), true);
  assert.equal(verifyFormToken(token, secret, now + 1000), false);
  assert.equal(verifyFormToken(token, secret, now - 1000), false);
  assert.equal(verifyFormToken(token, secret, now + 7200001), false);
  assert.equal(verifyFormToken(token, secret + "other", now + 3000), false);
  assert.equal(verifyFormToken(token.slice(0, -1), secret, now + 3000), false);
});
test("commercial filters constrain enums and dates and use stable ordering", () => {
  const invalid = leadFilters({ status: "__proto__", priority: "INVALID", type: "ARTICLE", from: "2026-02-30", sort: "constructor", page: "-9" });
  assert.equal(invalid.where.status, undefined); assert.equal(invalid.where.priority, undefined); assert.equal(invalid.where.createdAt, undefined); assert.equal(invalid.page, 1);
  assert.deepEqual(invalid.orderBy, [{ createdAt: "desc" }, { id: "asc" }]);
  assert.deepEqual(leadFilters({ status: "NOVO", from: "2026-11-01", to: "2026-11-05" }).where, { status: "NOVO", createdAt: { gte: new Date("2026-11-01T00:00:00Z"), lt: new Date("2026-11-06T00:00:00Z") } });
  assert.equal(updateLeadSchema.safeParse({ id: "test-id", version: 1, status: "INVALID", priority: "NORMAL", assigneeId: "", note: "" }).success, false);
});
test("editor has no implicit commercial access and inactive commercial users are blocked", () => {
  const user = (code: string, permission: string, active = true) => ({ active, roles: [{ role: { code, permissions: [{ permission: { code: permission } }] } }] });
  assert.equal(hasPermission(user("EDITOR", "content:manage"), "requests:manage"), false);
  assert.equal(hasPermission(user("COMERCIAL", "requests:manage"), "requests:manage"), true);
  assert.equal(hasPermission(user("COMERCIAL", "requests:manage", false), "requests:manage"), false);
  assert.equal(hasPermission(user("COMERCIAL", "requests:manage"), "content:manage"), false);
});
