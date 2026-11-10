import { createElement } from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RichContent } from "../features/cms/rich-content";
import { parseRichDocument, richHeadings } from "../features/cms/rich-text";
import { contentSchema } from "../features/cms/schema";
import { articleStats, serializeStructuredData, siteOrigin } from "../features/insights/article-utils";

test("article headings produce unique anchors matching the safe renderer", () => {
  const doc = { type: "doc", content: [2, 3, 4].map(level => ({ type: "heading", attrs: { level }, content: [{ type: "text", text: "CriaÃ§Ã£o" }] })) };
  const headings = richHeadings(parseRichDocument(doc));
  assert.equal(new Set(headings.map(h => h.id)).size, 3);
  const html = renderToStaticMarkup(createElement(RichContent, { value: doc, anchorPrefix: "insight" }));
  for (const h of headings) assert.ok(html.includes(`id="${h.id}"`));
  assert.ok(html.includes("<h4"));
});

test("code, captions and tables render as escaped structured content", () => {
  const doc = { type: "doc", content: [
    { type: "codeBlock", attrs: { language: "javascript" }, content: [{ type: "text", text: "const value = '<script>alert(1)</script>';" }] },
    { type: "image", attrs: { src: "/api/media/test-image", alt: "Image", caption: "<script>caption</script>" } },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Column" }] }] }] }] },
  ] };
  const html = renderToStaticMarkup(createElement(RichContent, { value: doc }));
  assert.ok(html.includes("hljs-"));
  assert.ok(html.includes("<figcaption>&lt;script&gt;"));
  assert.ok(html.includes("<table>"));
  assert.equal(html.includes("<script>"), false);
  assert.throws(() => parseRichDocument({ type: "doc", content: [{ type: "table", content: Array.from({ length: 51 }, () => ({ type: "tableRow" })) }] }));
  assert.throws(() => parseRichDocument({ type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 100 } }] }] }] }));
});

test("archived articles cannot be published or used as service metadata", () => {
  const input = { module: "blog", title: "Test article", slug: "test-article", summary: "An isolated validation test.", status: "DRAFT", body: { type: "doc", attrs: { archived: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Sufficient article text for publication validation." }] }] } };
  assert.equal(contentSchema.safeParse(input).success, true);
  assert.equal(contentSchema.safeParse({ ...input, status: "PUBLISHED" }).success, false);
  assert.equal(contentSchema.safeParse({ ...input, module: "servicos" }).success, false);
});

test("reading estimates and structured metadata contain no invented URL or executable markup", () => {
  assert.deepEqual(articleStats({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: Array(201).fill("word").join(" ") }] }] }), { words: 201, minutes: 2 });
  assert.equal(siteOrigin("https://user:secret@example.test"), null);
  assert.equal(siteOrigin("javascript:alert(1)"), null);
  assert.equal(siteOrigin("https://example.test/path"), "https://example.test");
  const serialized = serializeStructuredData({ title: "</script><script>alert(1)</script>" });
  assert.equal(serialized.includes("<"), false);
  assert.equal(JSON.parse(serialized).title, "</script><script>alert(1)</script>");
});

