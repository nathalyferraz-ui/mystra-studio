import { test } from "node:test";
import assert from "node:assert/strict";
import { adminModules } from "../config/navigation";
import { hasPermission, type AccessUser } from "../lib/permissions";
import { activeAdminItem, adminBreadcrumbs, adminGroupExpanded, adminNavigation, defaultAdminPreferences, modulePresentation, navigationMatches, parseAdminPreferences, permittedQuickActions } from "../features/admin/navigation";
const all = adminNavigation(adminModules);
const user = (code: string, codes: string[], active = true): AccessUser => ({ active, roles: [{ role: { code, permissions: codes.map(code => ({ permission: { code } })) } }] });
test("navigation gives each module a distinct semantic icon and marks unfinished modules unavailable", () => {
  assert.equal(new Set(Object.values(modulePresentation).map(item => item.icon)).size, Object.keys(modulePresentation).length);
  assert.equal(all.filter(item => item.id === "dashboard").length, 1);
  assert.deepEqual(all.filter(item => item.unavailable).map(item => item.id), ["cursos", "documentos"]);
  assert.equal(all.some(item => item.id === "nonexistent"), false);
});
test("active module remains unique for new, edit, preview and details routes without matching similarly named prefixes", () => {
  for (const [path, id] of [["/admin", "dashboard"], ["/admin/servicos/novo", "servicos"], ["/admin/servicos/content/editar", "servicos"], ["/admin/portfolio/content/preview", "portfolio"], ["/admin/eventos/abc/inscricoes", "eventos"], ["/admin/eventos/palestrantes", "eventos"], ["/admin/candidaturas/abc", "candidaturas"]]) assert.equal(activeAdminItem(path, all)?.id, id);
  assert.equal(activeAdminItem("/admin/servicos-outro", all), undefined);
  assert.equal(activeAdminItem("/admin/cursos", all), undefined);
  assert.deepEqual(adminBreadcrumbs("/admin/eventos/private-record/editar", all).map(i => i.label), ["Eventos", "Editar"]);
  assert.equal(adminBreadcrumbs("/admin/candidaturas/private-record", all).some(i => i.label.includes("private-record")), false);
});
test("module and quick-action discovery respects explicit grants without exposing commercial or applicant routes", () => {
  const editor = user("EDITOR", ["content:manage"]), commercial = user("COMERCIAL", ["requests:manage"]);
  const editorNav = adminNavigation(adminModules.filter(item => hasPermission(editor, item.permission)));
  assert.equal(editorNav.some(item => item.id === "leads" || item.id === "candidaturas"), false);
  assert.equal(permittedQuickActions(editor).some(item => item.id === "open-leads"), false);
  assert.deepEqual(permittedQuickActions(commercial).map(item => item.id), ["open-leads"]);
  assert.deepEqual(permittedQuickActions(user("ADMIN", [], false)), []);
  assert.equal(permittedQuickActions(user("ADMIN", [])).length, 6);
});
test("UI preference parsing permits only booleans and known groups, without retaining identity or arbitrary payloads", () => {
  assert.deepEqual(parseAdminPreferences("broken"), { compact: false, groups: { content: true } });
  const data = parseAdminPreferences(JSON.stringify({ compact: true, email: "synthetic@example.test", token: "must-not-survive", groups: { content: false, operations: true, unknown: true, administration: "yes" } }));
  assert.deepEqual(data, { compact: true, groups: { content: false, operations: true } });
  assert.equal(JSON.stringify(data).includes("synthetic"), false);
});
test("command navigation search supports accents, groups and real actions", () => {
  assert.equal(navigationMatches(all.find(item => item.id === "configuracoes")!, "configuracoes"), true);
  assert.equal(navigationMatches(all.find(item => item.id === "leads")!, "operações"), true);
  assert.equal(navigationMatches(all.find(item => item.id === "eventos")!, "artigo inexistente"), false);
});
test("the first permitted group is discoverable for commercial-only accounts and active routes override closed preferences", () => {
  const items = adminNavigation([{ slug: "leads", label: "CRM" }]);
  assert.equal(adminGroupExpanded("operations", items, "dashboard", defaultAdminPreferences, false), true);
  const closed = { compact: false, groups: { operations: false } };
  assert.equal(adminGroupExpanded("operations", items, "dashboard", closed, false), false);
  assert.equal(adminGroupExpanded("operations", items, "leads", closed, false), true);
});
