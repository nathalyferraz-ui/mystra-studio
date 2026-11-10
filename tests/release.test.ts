import { test } from "node:test";
import assert from "node:assert/strict";
import { publicLinkEnabled, publicPathEnabled, releaseCTA, release } from "../config/release";
import { defaultSettings } from "../features/institutional/defaults";
import { productionReadiness } from "../lib/production-readiness";
import { authConfiguration } from "../lib/auth-config";
import { indexingAllowed } from "../lib/site-policy";
test("v1 hides deferred CMS links including saved settings while keeping essential navigation", () => {
  for (const path of ["/", "/sobre", "/servicos", "/servicos/site", "/portfolio/case", "/blog/article", "/contato", "/privacidade"]) assert.ok(publicPathEnabled(path));
  for (const path of ["/academia", "/eventos", "/eventos/workshop", "/downloads", "/trabalhe-conosco/vaga", "/admin", "/demonstracao"]) assert.equal(publicPathEnabled(path), false);
  assert.deepEqual(defaultSettings.navigation.filter(i => publicLinkEnabled(i.href)).map(i => i.href), ["/sobre", "/servicos", "/portfolio", "/blog"]);
  assert.deepEqual(releaseCTA({ href: "/academia", label: "Academia" }), { href: "/servicos", label: "Conheça as soluções" });
  assert.equal(publicLinkEnabled("javascript:alert(1)"), false); assert.equal(publicLinkEnabled("//evil.invalid"), false); assert.equal(publicLinkEnabled("https://user:pass@example.com"), false);
  assert.equal(release.publicIntake, false);
});
const ready = { MYSTRA_ENV: "production", VERCEL_ENV: "production", DATABASE_URL: "postgresql://synthetic:synthetic@db.example.test/postgres?sslmode=verify-full", BETTER_AUTH_SECRET: "production-test-only-strong-randomish-secret-3298", BETTER_AUTH_URL: "https://studio.example.test", SITE_URL: "https://studio.example.test", SITE_INDEXING_ENABLED: "false" };
test("production gate rejects unsafe configuration without requiring optional Storage or a second database", () => {
  assert.deepEqual(productionReadiness(ready).blockers, []);
  assert.ok(productionReadiness(ready).warnings.includes("UPLOADS_UNAVAILABLE_TEXT_CONTENT_SUPPORTED"));
  for (const input of [{ VERCEL_ENV: "preview" }, { MYSTRA_ENV: "demo" }, { DATABASE_URL: ready.DATABASE_URL.replace("verify-full", "no-verify") }, { SITE_URL: "https://another.example.test" }, { BETTER_AUTH_URL: "http://localhost:3000" }, { BOOTSTRAP_ADMIN: "true" }, { TEST_DATABASE_URL: ready.DATABASE_URL }]) assert.ok(productionReadiness({ ...ready, ...input }).blockers.length);
  for (const suffix of ["&sslmode=no-verify", "&sslaccept=accept_invalid_certs", "&host=elsewhere.invalid", "&options=-crole=postgres"]) assert.ok(productionReadiness({ ...ready, DATABASE_URL: ready.DATABASE_URL + suffix }).blockers.length);
  assert.ok(productionReadiness({ ...ready, NODE_TLS_REJECT_UNAUTHORIZED: "0" }).blockers.length);
  assert.equal(authConfiguration({ ...ready, VERCEL_ENV: "preview" }).configured, false);
  assert.equal(indexingAllowed(true, { ...ready, NODE_ENV: "production", VERCEL_ENV: "preview", SITE_INDEXING_ENABLED: "true" }), false);
});
