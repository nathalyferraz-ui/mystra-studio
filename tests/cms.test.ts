import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../features/cms/schema";
import { parseRichDocument, safeHref, richMediaIds, richText, emptyDocument } from "../features/cms/rich-text";
import { searchOptions } from "../features/cms/filters";
import { slugify } from "../features/cms/config";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RichContent } from "../features/cms/rich-content";

const draft = { module: "blog", title: "Teste editorial", slug: "teste-editorial", summary: "Resumo de teste para validação isolada.", status: "DRAFT", body: emptyDocument };
test("CMS validates publication requirements and prevents unsafe slugs", () => {
  assert.equal(contentSchema.safeParse(draft).success, true);
  assert.equal(contentSchema.safeParse({ ...draft, status: "PUBLISHED" }).success, false);
  assert.equal(contentSchema.safeParse({ ...draft, id: "test-id" }).success, false);
  assert.equal(contentSchema.safeParse({ ...draft, id: "test-id", version: 1 }).success, true);
  for (const slug of ["../admin", "slug/slug", "COM MAIÚSCULAS", "<script>", "-invalid", ""]) assert.equal(contentSchema.safeParse({ ...draft, slug }).success, false);
  assert.equal(contentSchema.safeParse({ ...draft, module: "servicos", status: "PUBLISHED", description: "Descrição completa de um serviço para teste isolado." }).success, true);
  assert.equal(contentSchema.safeParse({ ...draft, externalUrl: "javascript:alert(1)" }).success, false);
  assert.equal(slugify("Design & Estratégia Digital"), "design-estrategia-digital");
});
test("rich document rejects script nodes, unsafe URLs, remote images and invalid structure", () => {
  const link = (href: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Link", marks: [{ type: "link", attrs: { href } }] }] }] });
  for (const href of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "java\nscript:alert(1)"]) {
    assert.equal(safeHref(href), false);
    assert.throws(() => parseRichDocument(link(href)));
  }
  assert.doesNotThrow(() => parseRichDocument(link("https://example.test/path")));
  assert.doesNotThrow(() => parseRichDocument(link("/servicos")));
  for (const body of [{ type: "script", text: "alert(1)" }, { type: "doc", content: [{ type: "image", attrs: { src: "https://example.test/a.jpg" } }] }, { type: "doc", content: [{ type: "heading", attrs: { level: 1 } }] }, { type: "doc", content: [{ type: "text", text: "wrong parent" }] }]) assert.throws(() => parseRichDocument(body));
});
test("rich renderer escapes text and strips unknown attributes", () => {
  const body = parseRichDocument({ type: "doc", content: [{ type: "paragraph", attrs: { onerror: "alert(1)" }, content: [{ type: "text", text: "<script>alert(1)</script>", marks: [{ type: "bold" }] }] }, { type: "image", attrs: { src: "/api/media/test-media", alt: "Descrição", onerror: "alert(1)" } }] });
  const html = renderToStaticMarkup(createElement(RichContent, { value: body }));
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("onerror"), false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.deepEqual(richMediaIds(body), ["test-media"]);
  assert.ok(richText(body).includes("alert(1)"));
});
test("rich documents have bounded size and nesting", () => {
  assert.throws(() => parseRichDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(400001) }] }] }));
  let node: unknown = { type: "paragraph" };
  for (let i = 0; i < 20; i++) node = { type: "blockquote", content: [node] };
  assert.throws(() => parseRichDocument({ type: "doc", content: [node] }));
});
test("public filters always require published content regardless of supplied query", () => {
  for (const section of ["servicos", "portfolio", "blog"] as const) {
    const options = searchOptions({ status: "DRAFT", page: "-10", sort: "arbitrary", q: "Pesquisa" }, section);
    assert.equal(options.where.status, "PUBLISHED");
    assert.ok(options.where.publishedAt);
    assert.equal(options.page, 1);
    assert.ok(options.orderBy.length);
  }
  assert.equal(searchOptions({ status: "DRAFT" }, "blog", true).where.status, "DRAFT");
});
