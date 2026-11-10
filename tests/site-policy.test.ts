import { test } from "node:test";
import assert from "node:assert/strict";
import { indexingAllowed, publicSiteOrigin } from "../lib/site-policy";
import { authConfiguration } from "../lib/auth-config";
import { contentMetadata } from "../features/cms/metadata";
import { safeHref, parseRichDocument } from "../features/cms/rich-text";
import { contentSchema } from "../features/cms/schema";
test("indexing requires production, an explicit environment switch, HTTPS and published SEO approval", () => {
  const env = { NODE_ENV: "production", SITE_INDEXING_ENABLED: "true", SITE_URL: "https://example.test" };
  assert.equal(indexingAllowed(true, env), true);
  for (const variation of [{ NODE_ENV: "development" }, { SITE_INDEXING_ENABLED: "false" }, { SITE_URL: "" }, { SITE_URL: "http://example.test" }, { SITE_URL: "https://localhost" }, { SITE_URL: "https://user:secret@example.test" }]) assert.equal(indexingAllowed(true, { ...env, ...variation }), false);
  assert.equal(indexingAllowed(false, env), false); assert.equal(publicSiteOrigin("javascript:alert(1)"), null);
});
test("administrative auth configuration fails closed for weak secrets and insecure production origins", () => {
  const env = { DATABASE_URL: "postgresql://isolated.invalid/test", BETTER_AUTH_SECRET: "SyntheticOnly-0123456789-abcdefghijklmno", BETTER_AUTH_URL: "http://localhost:3000", NODE_ENV: "development" };
  assert.equal(authConfiguration(env).configured, true);
  assert.equal(authConfiguration({ ...env, NODE_ENV: "production" }).configured, false);
  assert.equal(authConfiguration({ ...env, NODE_ENV: "production", BETTER_AUTH_URL: "https://example.test" }).configured, true);
  for (const secret of ["", "x".repeat(32), "change-me-to-a-secure-secret-at-once", "has whitespace and at least thirty two characters"]) assert.equal(authConfiguration({ ...env, BETTER_AUTH_SECRET: secret }).configured, false);
  for (const origin of ["https://user:secret@example.test", "javascript:alert(1)", "https://example.test?token=private", "https://example.test/path"]) assert.equal(authConfiguration({ ...env, BETTER_AUTH_URL: origin }).configured, false);
});
test("service/project metadata derives canonical and sharing images only from a configured origin", () => {
  const item = { title: "Synthetic metadata test", slug: "isolated-test", summary: "Synthetic summary", seoTitle: null, seoDescription: null, cover: { id: "image-id", alt: "Synthetic image", width: 300, height: 200 } };
  const result = contentMetadata(item, "portfolio", "Synthetic site", "https://example.test/path");
  assert.equal(result.alternates?.canonical, "https://example.test/portfolio/isolated-test");
  assert.ok(JSON.stringify(result.openGraph).includes("https://example.test/api/media/image-id"));
  const noOrigin = contentMetadata(item, "servicos", "Synthetic site", ""); assert.equal(noOrigin.alternates, undefined); assert.equal(noOrigin.metadataBase, undefined);
});
test("rich text and project external URLs reject embedded credentials without changing normal HTTP links", () => {
  assert.equal(safeHref("https://user:secret@example.test"), false); assert.equal(safeHref("http://example.test"), true);
  assert.throws(() => parseRichDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Test", marks: [{ type: "link", attrs: { href: "https://user:secret@example.test" } }] }] }] }));
  const input = { module: "portfolio", title: "Synthetic project", slug: "synthetic", summary: "A synthetic validation test", status: "DRAFT", body: { type: "doc" }, externalUrl: "https://user:secret@example.test" };
  assert.equal(contentSchema.safeParse(input).success, false);
});
