import test from "node:test";
import assert from "node:assert/strict";
import { authenticationValues, assertDemoStorage, assertDistinctAuthentication, environmentMode, isolatedDatabase, migrationDatabaseURL, runtimeDatabaseURL, supabaseIdentity } from "../lib/environment";
import { isolatedProcessEnvironment } from "../lib/isolated-process";
import { actorMatchesEnvironment, assertDemoQuery, demoAuthPathAllowed } from "../lib/demo-policy";
import { hasPermission } from "../lib/permissions";
import { demoFixturePlan, fixtureCounts } from "../features/demo/fixtures";
import { assertDemoMarker } from "../lib/demo-marker";
import { assertDemoRole } from "../lib/demo-role";
import { indexingAllowed } from "../lib/site-policy";
import { careersConfig } from "../features/careers/config";
import { formSecret } from "../lib/form-security";
const primary = "a".repeat(20), demo = "b".repeat(20), homolog = "c".repeat(20);
const url = (ref: string, role = "postgres", port = 5432) => `postgresql://${role}.${ref}:synthetic-password@aws-0-test.pooler.supabase.com:${port}/postgres?sslmode=verify-full`;
const main = { DATABASE_URL: url(primary), DIRECT_URL: url(primary), BETTER_AUTH_SECRET: "main-secret-for-offline-tests-only", BETTER_AUTH_URL: "http://localhost:3000", SUPABASE_SERVICE_ROLE_KEY: "main-key-never-in-child" };
const env = { MYSTRA_ENV: "demo", PRIMARY_SUPABASE_PROJECT_REF: primary, DEMO_SUPABASE_PROJECT_REF: demo, HOMOLOG_SUPABASE_PROJECT_REF: homolog, DEMO_ISOLATED_CONFIRMED: "true", DEMO_DATABASE_URL: url(demo, "mystra_demo_app"), DEMO_DIRECT_URL: url(demo), DEMO_ACCESS_MODE: "read-only", DEMO_BETTER_AUTH_SECRET: "different-secret-for-offline-tests-only", DEMO_BETTER_AUTH_URL: "http://localhost:3001" };
const actor = (code: string, permissions: string[], email = "visitante@example.com") => ({ active: true, email, roles: [{ role: { code, permissions: permissions.map(code => ({ permission: { code } })) } }] });
test("demo targets a distinct verified project and restricted role; no main fallback", () => {
  assert.equal(isolatedDatabase("demo", "runtime", env).projectRef, demo);
  assert.equal(runtimeDatabaseURL(env), env.DEMO_DATABASE_URL);
  assert.equal(migrationDatabaseURL(env), env.DEMO_DIRECT_URL);
  for (const change of [{ DEMO_SUPABASE_PROJECT_REF: primary }, { DEMO_DATABASE_URL: url(primary, "mystra_demo_app") }, { DEMO_DATABASE_URL: url(demo) }, { DEMO_DATABASE_URL: "" }, { DEMO_ISOLATED_CONFIRMED: "false" }, { HOMOLOG_SUPABASE_PROJECT_REF: demo }, { DEMO_ACCESS_MODE: "interactive" }]) assert.throws(() => runtimeDatabaseURL({ ...env, ...change, DATABASE_URL: main.DATABASE_URL }));
  assert.throws(() => isolatedDatabase("demo", "owner", { ...env, DEMO_DIRECT_URL: url(demo, "postgres", 6543) }));
  assert.throws(() => environmentMode({ MYSTRA_ENV: "typo" }));
  assert.equal(runtimeDatabaseURL(main), main.DATABASE_URL);
});
test("canonical connection parsing rejects identity overrides and requires TLS for isolated targets", () => {
  for (const extra of ["&host=evil.test", "&options=-crole=postgres", "&sslmode=disable", "&user=postgres", "&dbname=other", "#ignored"]) assert.throws(() => supabaseIdentity(url(demo) + extra));
  assert.throws(() => supabaseIdentity(url(demo).replace("?sslmode=verify-full", "")));
  assert.equal(supabaseIdentity(url(primary).replace("?sslmode=verify-full", ""), true).projectRef, primary);
  assert.throws(() => supabaseIdentity(url(demo).replace("aws-0-test.pooler.supabase.com", "evil.test")));
  assert.equal(supabaseIdentity(`postgresql://postgres:synthetic-password@db.${demo}.supabase.co:5432/postgres?sslmode=verify-full`).projectRef, demo);
});
test("launcher removes main credentials and owner URL from runtime child", () => {
  const child = isolatedProcessEnvironment("demo", main, env, { PATH: "safe-path", DATABASE_URL: main.DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY: main.SUPABASE_SERVICE_ROLE_KEY });
  assert.equal(child.DATABASE_URL, ""); assert.equal(child.DIRECT_URL, ""); assert.equal(child.DEMO_DIRECT_URL, ""); assert.equal(child.SUPABASE_SERVICE_ROLE_KEY, ""); assert.equal(child.PATH, "safe-path");
  assert.ok(!Object.values(child).includes(main.BETTER_AUTH_SECRET)); assert.ok(!Object.values(child).includes(main.DATABASE_URL));
  assert.equal(child.CAREERS_MODE, "demo"); assert.equal(child.SITE_INDEXING_ENABLED, "false");
  assert.throws(() => isolatedProcessEnvironment("demo", main, { ...env, DEMO_BETTER_AUTH_SECRET: main.BETTER_AUTH_SECRET }));
  assert.throws(() => isolatedProcessEnvironment("demo", main, { ...env, DEMO_BETTER_AUTH_URL: main.BETTER_AUTH_URL }));
  assert.throws(() => isolatedProcessEnvironment("demo", main, { ...env, DATABASE_URL: main.DATABASE_URL }));
  assert.equal(authenticationValues(env).cookiePrefix, "mystra-demo");
  assert.throws(() => assertDemoStorage({ ...env, DEMO_SUPABASE_URL: `https://${primary}.supabase.co`, DEMO_STORAGE_BUCKET: "mystra-demo-media" }));
});
test("demo permission ceiling survives a manipulated ADMIN or content permission", () => {
  for (const user of [actor("EDITOR", ["demo:explore"]), actor("ADMIN", ["demo:explore", "content:manage", "users:manage"])]) {
    assert.ok(hasPermission(user, "demo:explore", env));
    for (const permission of ["content:manage", "users:manage", "requests:manage", "settings:manage", "recruitment:manage", "pages:publish"]) assert.equal(hasPermission(user, permission, env), false);
    assert.equal(actorMatchesEnvironment(user, {}), false);
  }
  assert.equal(actorMatchesEnvironment(actor("ADMIN", []), env), false);
  assert.equal(actorMatchesEnvironment(actor("EDITOR", ["demo:explore"], "real@personal.invalid"), env), false);
  assert.ok(hasPermission(actor("ADMIN", []), "content:manage", {}));
});
test("demo query and authentication allowlists deny writes and private resources", () => {
  assert.doesNotThrow(() => assertDemoQuery("Content", "findMany", {}));
  assert.doesNotThrow(() => assertDemoQuery("Session", "create", {}));
  assert.doesNotThrow(() => assertDemoQuery("AdminLog", "create", { data: { action: "auth.login" } }));
  for (const [model, operation] of [["Content", "update"], ["User", "create"], ["Account", "update"], ["Lead", "deleteMany"], ["JobApplication", "findMany"], ["LeadAttachment", "findUnique"], [undefined, "$executeRaw"], [undefined, "$queryRawUnsafe"]] as const) assert.throws(() => assertDemoQuery(model, operation, {}));
  assert.ok(demoAuthPathAllowed("/api/auth/sign-in/email")); assert.ok(demoAuthPathAllowed("/api/auth/sign-out"));
  assert.equal(demoAuthPathAllowed("/api/auth/sign-up/email"), false); assert.equal(demoAuthPathAllowed("/api/auth/change-password"), false);
});
test("fixtures validate against actual schemas, remain deterministic and contain no applicants or fake media", () => {
  const plan = demoFixturePlan("2026-11-07"); assert.deepEqual(plan, demoFixturePlan("2026-11-07"));
  assert.deepEqual(fixtureCounts(plan), { services: 5, projects: 3, articles: 4, events: 3, leads: 5, jobs: 2, media: 0, courseRecords: 0, documentRecords: 0 });
  assert.ok(plan.events.every(item => !item.registrationOpen && !item.privateAccess && !item.coverId));
  assert.ok(plan.leads.every(item => item.email.endsWith("@example.com") && item.origin === "DEMO_SEED"));
  assert.equal(plan.content.filter(item => item.module === "blog" && item.status === "DRAFT").length, 1);
  assert.throws(() => demoFixturePlan("2026-02-30"));
  assert.throws(() => assertDemoMarker({ environment: "demo", projectRef: primary }, demo));
});
test("runtime rejects elevated role privileges even if its name matches", () => {
  const facts = { role: "mystra_demo_app", elevated: false, memberships: false, businessWrite: false, privateRead: false, auditWrite: false };
  assert.doesNotThrow(() => assertDemoRole(facts));
  for (const key of ["elevated", "memberships", "businessWrite", "privateRead", "auditWrite"]) assert.throws(() => assertDemoRole({ ...facts, [key]: true }));
  assert.throws(() => assertDemoRole(undefined));
});
test("homologation cannot share demo/primary targets and test URLs stay in homologation", () => {
  const isolated = { MYSTRA_ENV: "homologation", PRIMARY_SUPABASE_PROJECT_REF: primary, DEMO_SUPABASE_PROJECT_REF: demo, HOMOLOG_SUPABASE_PROJECT_REF: homolog, HOMOLOG_ISOLATED_CONFIRMED: "true", HOMOLOG_DATABASE_URL: url(homolog), HOMOLOG_DIRECT_URL: url(homolog), HOMOLOG_BETTER_AUTH_SECRET: "homolog-secret-for-offline-tests-only", HOMOLOG_BETTER_AUTH_URL: "http://localhost:3002", TEST_DATABASE_URL: url(homolog), TEST_DATABASE_ISOLATED: "true" };
  assert.equal(runtimeDatabaseURL(isolated), isolated.HOMOLOG_DATABASE_URL);
  assert.equal(authenticationValues(isolated).cookiePrefix, "mystra-homolog");
  assert.doesNotThrow(() => isolatedProcessEnvironment("homologation", main, isolated));
  assert.throws(() => isolatedProcessEnvironment("homologation", main, { ...isolated, TEST_DATABASE_URL: url(demo) }));
  assert.throws(() => runtimeDatabaseURL({ ...isolated, HOMOLOG_SUPABASE_PROJECT_REF: demo }));
  assert.throws(() => assertDistinctAuthentication({ secret: "same" }, { secret: "same" }));
  assert.throws(() => assertDistinctAuthentication({ origin: "http://localhost:3001" }, { origin: "http://localhost:3001" }));
});
test("demo cannot enable intake or indexing by setting normal production flags", () => {
  assert.equal(careersConfig({ ...env, CAREERS_MODE: "live", CAREERS_PRIVACY_REVIEWED: "true", CAREERS_SECURITY_REVIEWED: "true" }).mode, "demo");
  assert.equal(indexingAllowed(true, { ...env, NODE_ENV: "production", SITE_INDEXING_ENABLED: "true", SITE_URL: "https://demo.example.com" }), false);
  const before = process.env.MYSTRA_ENV; process.env.MYSTRA_ENV = "demo";
  try { assert.equal(formSecret(), null); } finally { if (before === undefined) delete process.env.MYSTRA_ENV; else process.env.MYSTRA_ENV = before; }
});
