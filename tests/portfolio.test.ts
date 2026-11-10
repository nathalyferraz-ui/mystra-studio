import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../features/cms/schema";
import { emptyDocument } from "../features/cms/rich-text";
import { searchOptions } from "../features/cms/filters";
import { emptyProjectEditorial, moveGalleryImage, parseProjectEditorial } from "../features/portfolio/editorial";

const project = { module: "portfolio", title: "Teste editorial isolado", slug: "teste-editorial-isolado", summary: "Resumo de validação sem inserção no banco.", description: "Descrição suficiente para validar a publicação de um projeto.", status: "DRAFT", body: emptyProjectEditorial() };

test("project metadata preserves legacy rich documents without inventing project facts", () => {
  const legacy = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Processo previamente registrado." }] }] };
  const meta = parseProjectEditorial(legacy);
  assert.deepEqual(meta.process, legacy);
  assert.equal(meta.conceptual, false);
  assert.equal(meta.archived, false);
  assert.equal(meta.context, "");
  assert.deepEqual(meta.galleryCaptions, {});
  assert.equal(contentSchema.safeParse({ ...project, body: emptyDocument }).success, true);
});

test("an archived project cannot be published, including through the generic content validator", () => {
  const body = { ...emptyProjectEditorial(), archived: true };
  assert.equal(contentSchema.safeParse({ ...project, body, status: "DRAFT" }).success, true);
  assert.equal(contentSchema.safeParse({ ...project, body, status: "PUBLISHED" }).success, false);
  assert.equal(contentSchema.safeParse({ ...project, body: { ...body, archived: false }, status: "PUBLISHED" }).success, true);
  assert.equal(contentSchema.safeParse({ ...project, module: "servicos", body }).success, false);
});

test("creative process, captions and demonstration labels are validated on the server", () => {
  assert.equal(contentSchema.safeParse({ ...project, body: { ...emptyProjectEditorial(), conceptual: true, resultsMode: "DEMONSTRATIVE", galleryCaptions: { "media-id": "Legenda cadastrada." } } }).success, true);
  assert.equal(contentSchema.safeParse({ ...project, body: { ...emptyProjectEditorial(), resultsMode: "GUARANTEED" } }).success, false);
  assert.equal(contentSchema.safeParse({ ...project, body: { ...emptyProjectEditorial(), galleryCaptions: { "media-id": "x".repeat(301) } } }).success, false);
  assert.equal(contentSchema.safeParse({ ...project, body: { ...emptyProjectEditorial(), process: { type: "doc", content: [{ type: "script" }] } } }).success, false);
  assert.equal(contentSchema.safeParse({ ...project, externalUrl: "javascript:alert(1)" }).success, false);
});

test("gallery reordering is stable, bounded and does not mutate the current form state", () => {
  const ids = ["one", "two", "three"];
  assert.deepEqual(moveGalleryImage(ids, 1, -1), ["two", "one", "three"]);
  assert.deepEqual(moveGalleryImage(ids, 1, 1), ["one", "three", "two"]);
  assert.deepEqual(moveGalleryImage(ids, 0, -1), ids);
  assert.deepEqual(moveGalleryImage(ids, 2, 1), ids);
  assert.deepEqual(ids, ["one", "two", "three"]);
});

test("public project filters cannot expose drafts or archives and technology remains parameterized", () => {
  for (const status of ["DRAFT", "ARCHIVED", "PUBLISHED"]) {
    const query = searchOptions({ status, technology: "technology-id", category: "category-id", sort: "__proto__" }, "portfolio");
    assert.equal(query.where.status, "PUBLISHED");
    assert.ok(query.where.publishedAt);
    assert.deepEqual(query.where.technologies, { some: { id: "technology-id" } });
    assert.ok(Array.isArray(query.orderBy));
  }
  const archived = searchOptions({ status: "ARCHIVED" }, "portfolio", true);
  assert.equal(archived.where.status, "DRAFT");
  assert.deepEqual(archived.where.body, { path: ["archived"], equals: true });
});
