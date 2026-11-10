import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultPage, defaultSettings, defaultDocument } from "../features/institutional/defaults";
import { pageSchema, settingsSchema, sectionSchema, safeSiteLink, parseDocument } from "../features/institutional/schema";
import { initialState, mediaReferences, parseState } from "../features/institutional/repository";
import { revisionDifference } from "../features/institutional/revision-diff";
import { hasPermission, type AccessUser } from "../lib/permissions";
test("institutional defaults match all controlled templates without requiring database initialization", () => {
  for (const page of ["home", "sobre"] as const) { const value = defaultPage(page); assert.ok(pageSchema.safeParse(value).success); assert.equal(value.sections.length, 8); assert.equal(value.sections[0].type, "template"); assert.equal(initialState(page).published, null); }
  assert.ok(settingsSchema.safeParse(defaultSettings).success); assert.equal(defaultSettings.general.demonstration, true); assert.deepEqual(parseDocument("equipe", { items: [] }), { items: [] });
  const faq = defaultDocument("faq"); assert.ok("items" in faq && faq.items.length === 4); assert.equal(initialState("faq").published, null);
});
test("institutional publication rejects forged component fields, foreign templates and hidden or repeated heroes", () => {
  const hidden = defaultPage("home"); hidden.sections[0].visible = false; assert.equal(pageSchema.safeParse(hidden).success, false);
  const forged = defaultPage("home"); if (forged.sections[0].type === "template") forged.sections[0].fields.executableHTML = "<script>bad()</script>"; assert.equal(pageSchema.safeParse(forged).success, false);
  const foreign = defaultPage("home"); foreign.sections.push(defaultPage("sobre").sections[1]); assert.equal(pageSchema.safeParse(foreign).success, false);
  const repeated = defaultPage("home"); repeated.sections.push({ ...repeated.sections[2], id: "copy" }); assert.equal(pageSchema.safeParse(repeated).success, false);
  const reordered = defaultPage("sobre"); [reordered.sections[1], reordered.sections[2]] = [reordered.sections[2], reordered.sections[1]]; assert.ok(pageSchema.safeParse(reordered).success);
  assert.throws(() => parseDocument("sobre", defaultPage("home"))); assert.equal(sectionSchema.safeParse({ type: "html", content: "<script>bad()</script>" }).success, false);
});
test("institutional links reject script protocols, credentials, protocol-relative URLs and private routes", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "//evil.invalid", "/\\evil.invalid", "https://name:secret@example.test", "/admin", "/api/careers/resumes/private", "/missing", "https://example.test/\n"]) assert.equal(safeSiteLink(bad), false, bad);
  for (const good of ["/", "/contato", "/servicos?q=web", "/blog/um-artigo", "https://example.test/about", "#quem-somos"]) assert.equal(safeSiteLink(good), true, good);
  const settings = structuredClone(defaultSettings); settings.navigation = settings.navigation.filter(i => i.href !== "/sobre"); assert.equal(settingsSchema.safeParse(settings).success, false);
  const withoutPrivacy = structuredClone(defaultSettings); withoutPrivacy.footer.legalLinks = []; assert.equal(settingsSchema.safeParse(withoutPrivacy).success, false);
  const withoutDisclosure = structuredClone(defaultSettings); withoutDisclosure.general.demonstrationNotice = "Uma empresa de tecnologia com novas possibilidades."; assert.equal(settingsSchema.safeParse(withoutDisclosure).success, false);
});
test("granular institutional access separates publishing, private operations and administrative authority", () => {
  const actor = (...codes: string[]): AccessUser => ({ active: true, roles: [{ role: { code: "EDITOR", permissions: codes.map(code => ({ permission: { code } })) } }] });
  const legacy = actor("content:manage"); assert.equal(hasPermission(legacy, "pages:read"), true); assert.equal(hasPermission(legacy, "pages:update"), true); assert.equal(hasPermission(legacy, "pages:publish"), false);
  const publisher = actor("pages:publish"); assert.equal(hasPermission(publisher, "pages:read"), true); assert.equal(hasPermission(publisher, "pages:update"), false);
  for (const code of ["users:manage", "settings:manage", "audit:read", "requests:manage", "recruitment:manage"]) assert.equal(hasPermission(legacy, code), false);
  assert.equal(hasPermission({ ...publisher, active: false }, "pages:read"), false);
});
test("media references include unpublished content and retained snapshots while revision comparison identifies real changes", () => {
  assert.deepEqual(mediaReferences({ draft: { imageId: "draft" }, published: { identity: { darkLogoId: "logo" } }, history: [{ data: { images: [{ mediaId: "past" }] } }] }), ["draft", "logo", "past"]);
  const previous = defaultPage("home"), current = defaultPage("home"); assert.deepEqual(revisionDifference(previous, current), []); current.sections[1].visible = false; assert.deepEqual(revisionDifference(previous, current), [previous.sections[1].label]);
  const state = { ...initialState("home"), version: 1, editedBy: "test-operator", editedAt: new Date().toISOString(), draft: previous }; assert.ok(parseState("home", state)); assert.throws(() => parseState("home", { ...state, history: Array(11).fill({}) }));
});
