import { test } from "node:test";
import assert from "node:assert/strict";
import { compensateUncommittedObject } from "../features/media/compensation";
import { publicInstitutionalMediaIds } from "../features/institutional/public-media";
import { defaultPage, defaultSettings } from "../features/institutional/defaults";
import { hasPermission, type AccessUser } from "../lib/permissions";
import type { DocumentData } from "../features/institutional/schema";
test("uncertain upload commits never cause deletion of referenced objects", async () => {
  let removes = 0, reviews = 0;
  const callbacks = { remove: async () => { removes++; }, onUncertain: async () => { reviews++; } };
  assert.equal(await compensateUncommittedObject({ ...callbacks, references: async () => 1 }), "REFERENCED");
  assert.equal(removes, 0);
  assert.equal(await compensateUncommittedObject({ ...callbacks, references: async () => { throw new Error("DB_UNAVAILABLE"); } }), "RETAINED_FOR_REVIEW");
  assert.equal(removes, 0); assert.equal(reviews, 1);
  assert.equal(await compensateUncommittedObject({ ...callbacks, references: async () => 0 }), "REMOVED"); assert.equal(removes, 1);
  assert.equal(await compensateUncommittedObject({ references: async () => 0, remove: async () => { throw new Error("STORAGE_UNAVAILABLE"); }, onUncertain: callbacks.onUncertain }), "RETAINED_FOR_REVIEW");
  assert.equal(reviews, 2);
  assert.equal(await compensateUncommittedObject({ references: async () => { throw new Error(); }, remove: callbacks.remove, onUncertain: async () => { throw new Error(); } }), "RETAINED_FOR_REVIEW");
});
test("published institutional snapshots never authorize hidden section or unpublished collection images", () => {
  const page = defaultPage("home"); page.sections[1].visible = false;
  for (const [index, imageId] of [[0, "visible-image"], [1, "hidden-image"]] as const) if (page.sections[index].type === "template") page.sections[index].imageId = imageId;
  page.sharingImageId = "social-image";
  assert.deepEqual(publicInstitutionalMediaIds("home", page), ["social-image", "visible-image"]);
  const collection = { items: [{ published: false, imageId: "private-member" }, { published: true, imageId: "public-member" }] } as DocumentData;
  assert.deepEqual(publicInstitutionalMediaIds("equipe", collection), ["public-member"]);
  assert.deepEqual(publicInstitutionalMediaIds("parceiros", collection), ["public-member"]);
  const settings = structuredClone(defaultSettings); settings.identity.logoId = "published-logo";
  assert.deepEqual(publicInstitutionalMediaIds("settings", settings), ["published-logo"]);
  assert.deepEqual(publicInstitutionalMediaIds("faq", collection), []);
});
test("every administrative capability has explicit allow/deny checks across roles and inactive accounts", () => {
  const codes = ["content:manage", "pages:read", "pages:update", "pages:publish", "institutional:manage", "requests:manage", "recruitment:manage", "users:manage", "settings:manage", "audit:read"];
  const user = (role: string, permissions: string[], active = true): AccessUser => ({ active, roles: [{ role: { code: role, permissions: permissions.map(code => ({ permission: { code } })) } }] });
  for (const code of codes) {
    assert.equal(hasPermission(user("ADMIN", []), code), true);
    assert.equal(hasPermission(user("ADMIN", [], false), code), false);
    assert.equal(hasPermission(user("COMERCIAL", ["requests:manage"]), code), code === "requests:manage");
    assert.equal(hasPermission(user("EDITOR", ["content:manage"]), code), ["content:manage", "pages:read", "pages:update", "institutional:manage"].includes(code));
    assert.equal(hasPermission(user("RECRUTADOR", []), code), false);
    assert.equal(hasPermission(user("RECRUTADOR", ["recruitment:manage"]), code), code === "recruitment:manage");
  }
});
